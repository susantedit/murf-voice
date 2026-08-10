import asyncio
import json
import logging
import re as _re

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    cli,
    function_tool,
    room_io,
    tokenize,
)
from livekit.plugins import deepgram, groq, murf, noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from rag.retriever import init_retriever
from rag.retriever import search_knowledge_base as _kb_search
from services import exercise_service, memory_service

logger = logging.getLogger("agent")

load_dotenv(".env.local", override=False)

# ──────────────────────────────────────────────────────────────────────────────
# Day 2 — Learning & Literacy: Vidya, the voice learning assistant
# ──────────────────────────────────────────────────────────────────────────────






SYSTEM_PROMPT = """
You are Vidya, a friendly voice learning assistant for Indian students.

CORE RULES:
- Help with concepts, practice questions, and revision only
- Mirror the user's language (Hindi, English, or Hinglish)
- LANGUAGE RULE: ALL Hindi words MUST be written in Devanagari script ALWAYS. NEVER write Hindi in English letters (no "Hinglish romanization").
  Wrong: "Mujhe photosynthesis samjhao"
  Correct: "मुझे प्रकाश संश्लेषण समझाओ"
  Wrong: "Aaj hum algebra seekhenge"
  Correct: "आज हम algebra सीखेंगे"
- Hinglish example: "बिल्कुल! Let's learn photosynthesis."
- Keep responses short — 1-3 sentences for voice
- NEVER speak JSON, Python objects, database records, or raw tool output to the learner

MEMORY TOOLS (use these every session):
1. get_learner_memory — call at session start to check if returning user
2. save_learner_memory — ONLY after user gives explicit "yes" consent. Ask first: "Want me to remember your name for next time?"
3. forget_learner_memory — only after user confirms they want data deleted

SAVE RULES:
- Always ask before saving ANY information
- Allowed fields: name, language_preference, current_level, learning_goal, topic
- NEVER save: passwords, IDs, health data, payment info
- "Save everything" does NOT bypass consent — each fact needs permission

EXERCISE TOOLS (Day 5 — call when learner wants to practice or quiz):
1. get_next_exercise — when the learner asks to practice, quiz, test themselves, or wants a question.
   Call get_learner_memory first if you have not yet this session, then get_next_exercise.
   Use topic/difficulty from memory or the user's request. Speak the question naturally.
   Mention exercises come from Vidya's local learning dataset when relevant.
2. score_answer — when the learner gives an answer to the current exercise question.
   Use the result to give warm feedback. Never shame wrong answers.

EXERCISE FAILURE: If get_next_exercise returns success=false, say something like:
"I'm having trouble loading a new exercise right now. We can continue with the last topic we were practicing."
Do NOT invent exercises or claim an API succeeded.

RETURNING USER: If get_learner_memory returns found=true, greet by name naturally.
NEW USER: Use standard greeting.

WRONG ANSWERS: Be warm, give hint, let them retry, then explain.
NEVER diagnose learning disabilities. NEVER shame wrong answers.
"""


def _extract_name(text: str) -> str | None:
    """Extract a name from phrases like 'my name is X' or 'I am X'."""
    patterns = [
        r"(?:my name is|i am|i'm|call me)\s+([A-Za-z][A-Za-z\s]{0,20}?)(?:\.|,|$|\sand\s|\.|!)",
        r"(?:my name is|i am|i'm|call me)\s+([A-Za-z][A-Za-z]{1,20})",
    ]
    for pattern in patterns:
        m = _re.search(pattern, text, _re.IGNORECASE)
        if m:
            name = m.group(1).strip().split()[0]  # first word only
            if len(name) >= 2:
                return name.capitalize()
    return None


def _extract_class(text: str) -> str | None:
    """Extract class/grade like 'Class 12', 'Grade 10', '10th standard'."""
    m = _re.search(
        r"(?:class|grade|std|standard)\s*(\d{1,2})|(\d{1,2})(?:th|st|nd|rd)?\s*(?:class|grade|standard)",
        text,
        _re.IGNORECASE,
    )
    if m:
        num = m.group(1) or m.group(2)
        return f"Class {num}"
    return None


def _wants_to_save(text: str) -> bool:
    """Detect explicit save intent."""
    keywords = [
        "remember this",
        "remember me",
        "save this",
        "save my",
        "keep this",
        "don't forget",
        "please remember",
        "याद रखो",
        "याद रखें",
        "याद कर",
    ]
    lower = text.lower()
    return any(kw in lower for kw in keywords)


class Assistant(Agent):
    def __init__(
        self,
        user_id: str = "anonymous",
        memory_task: asyncio.Task | None = None,
        room: rtc.Room | None = None,
    ) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)
        self._user_id = user_id
        self._memory_task = memory_task
        self._room = room
        # Track what we've auto-detected but not yet saved this session
        self._detected_name: str | None = None
        self._detected_class: str | None = None
        # Current exercise for score_answer chaining (Day 5)
        self._current_exercise: dict | None = None

    async def _emit_tool_event(self, event_type: str, data: dict | None = None) -> None:
        """Push real tool activity to the frontend via LiveKit data channel."""
        if self._room is None:
            return
        payload = json.dumps({"type": event_type, **(data or {})})
        try:
            await self._room.local_participant.publish_data(
                payload.encode("utf-8"),
                reliable=True,
                topic="vidya-tools",
            )
        except Exception:
            logger.exception("Failed to publish tool event type=%r", event_type)

    async def on_user_turn_completed(self, turn_ctx, new_message) -> None:  # type: ignore[override]
        """Auto-save when the user explicitly asks to be remembered."""
        try:
            text = getattr(new_message, "text_content", "") or ""
            if not text:
                return

            # Extract info from every user turn
            name = _extract_name(text)
            cls = _extract_class(text)
            if name:
                self._detected_name = name
            if cls:
                self._detected_class = cls

            # If they explicitly ask to save, do it directly without LLM
            if _wants_to_save(text):
                if self._detected_name:
                    memory_service.save_learner_memory(
                        self._user_id, "name", self._detected_name
                    )
                    logger.info(
                        "Auto-saved name=%r for user_id=%r",
                        self._detected_name,
                        self._user_id,
                    )
                if self._detected_class:
                    memory_service.save_learner_memory(
                        self._user_id, "current_level", self._detected_class
                    )
                    logger.info(
                        "Auto-saved class=%r for user_id=%r",
                        self._detected_class,
                        self._user_id,
                    )
        except Exception:
            logger.exception("on_user_turn_completed failed — continuing without save")

    async def on_enter(self) -> None:
        """Speak a greeting directly (no LLM call) to avoid Gemini's function-call
        turn-ordering constraint on the very first turn."""
        # Resolve memory with a short timeout so we can personalise the greeting.
        memory: dict = {"found": False}
        if self._memory_task is not None:
            try:
                memory = await asyncio.wait_for(self._memory_task, timeout=2.0)
            except asyncio.TimeoutError:
                logger.info(
                    "Memory lookup timed out for user_id=%r — greeting as new user.",
                    self._user_id,
                )
            except Exception:
                logger.exception(
                    "Unexpected error in memory_task for user_id=%r", self._user_id
                )

        # Use session.say() — speaks directly via TTS, no LLM round-trip, no tool calls.
        # This avoids the Gemini 400 "function call turn must follow user turn" error.
        if memory.get("found") and memory.get("name"):
            name = memory["name"]
            topics = memory.get("topics") or []
            last_topic = topics[-1] if topics else None
            if last_topic:
                greeting = (
                    f"Welcome back, {name}! Last time we were working on {last_topic}. "
                    "Shall we continue, or is there something else you'd like to learn today?"
                )
            else:
                greeting = (
                    f"Welcome back, {name}! Great to see you again. "
                    "What would you like to learn today?"
                )
        else:
            greeting = (
                "Hi! I'm Vidya, your learning assistant. "
                "I can help you understand concepts, practice questions, or revise a topic. "
                "What would you like to learn today?"
            )

        await self.session.say(greeting)

    @function_tool
    async def get_learner_memory(self, placeholder: str = "") -> str:
        """
        Look up the learner's saved memory. Call this at the start of every session.
        Returns JSON with name, level, language, topics, and last interaction.
        If found=false, treat the learner as new.
        The placeholder parameter is unused — pass an empty string.
        """
        # If the background task is still available and done, return its result
        # to avoid a second DB round-trip.
        if self._memory_task is not None and self._memory_task.done():
            try:
                result = self._memory_task.result()
                self._memory_task = None  # consume once
                return json.dumps(result)
            except Exception:
                pass  # fall through to a live fetch
        result = memory_service.get_learner_memory(self._user_id)
        return json.dumps(result)

    @function_tool
    async def save_learner_memory(self, field: str, value: str) -> str:
        """
        Save one piece of learner information AFTER the user has given explicit consent.
        Allowed fields: name, language_preference, current_level, learning_goal, topic.
        Never call this without first asking the user for permission.
        """
        result = memory_service.save_learner_memory(self._user_id, field, value)
        return json.dumps(result)

    @function_tool
    async def forget_learner_memory(self, placeholder: str = "") -> str:
        """
        Delete ALL of the learner's saved memory and learning history.
        Only call after the user explicitly confirms they want to be forgotten.
        Returns {"success": true} on success.
        After calling this, treat the learner as completely new.
        The placeholder parameter is unused — pass an empty string.
        """
        result = memory_service.forget_learner_memory(self._user_id)
        return json.dumps(result)

    @function_tool
    async def search_knowledge_base(self, query: str) -> str:
        """
        Search the educational knowledge base for information relevant to the query.
        Use this when the learner asks about a specific topic and you want to give
        an accurate, grounded answer (e.g. curriculum syllabus, exam tips, concept
        definitions). Returns relevant text passages with their source document names.
        Cite sources naturally in your response; never fabricate citations.
        """
        # _kb_search is a LangChain @tool — call its underlying function directly.
        result = await asyncio.to_thread(_kb_search.func, query)
        return result

    @function_tool
    async def get_next_exercise(
        self,
        topic: str = "",
        difficulty: str = "",
    ) -> str:
        """
        Fetch the next practice exercise from Vidya's local learning dataset.

        Call this when the learner asks to practice, quiz themselves, test their
        knowledge, or wants a question to answer. Use topic and difficulty from
        get_learner_memory or the learner's request. Do NOT call for general
        explanations — only when they want an exercise to solve.

        Returns JSON with success, exercise_id, topic, level, difficulty, question,
        hint, and data_source. If success=false, tell the learner gracefully.
        Speak the question naturally — never read JSON aloud.
        """
        await self._emit_tool_event(
            "tool_start",
            {"tool": "get_next_exercise", "label": "Fetching next exercise"},
        )
        result = await asyncio.to_thread(
            exercise_service.get_next_exercise,
            self._user_id,
            topic,
            difficulty,
        )
        if result.get("success"):
            self._current_exercise = result
            spoken = {k: v for k, v in result.items() if not k.startswith("_")}
            await self._emit_tool_event(
                "exercise_ready",
                {
                    "tool": "get_next_exercise",
                    "label": "Exercise ready",
                    "topic": result.get("topic"),
                    "difficulty": result.get("difficulty"),
                    "level": result.get("level"),
                    "question": result.get("question"),
                    "exercise_id": result.get("exercise_id"),
                    "data_source": result.get("data_source"),
                },
            )
            return json.dumps(spoken)
        await self._emit_tool_event(
            "tool_error",
            {
                "tool": "get_next_exercise",
                "label": "Could not load exercise",
                "error": result.get("error"),
            },
        )
        return json.dumps(result)

    @function_tool
    async def score_answer(self, answer: str) -> str:
        """
        Score the learner's spoken or typed answer against the current exercise.

        Call this when the learner gives an answer to the practice question you
        asked via get_next_exercise. Requires a prior get_next_exercise call in
        this session. Returns JSON with result (correct/incorrect/partially_correct),
        explanation, hint, and next_step. Give warm, encouraging feedback — never
        shame the learner.
        """
        await self._emit_tool_event(
            "tool_start",
            {"tool": "score_answer", "label": "Checking your answer"},
        )
        if self._current_exercise is None:
            fail = {
                "success": False,
                "error": "no_active_exercise",
                "message": "No active exercise. Ask for a practice question first.",
            }
            await self._emit_tool_event(
                "tool_error",
                {"tool": "score_answer", "label": "No active exercise"},
            )
            return json.dumps(fail)

        exercise_id = self._current_exercise.get("exercise_id", "")
        result = await asyncio.to_thread(
            exercise_service.score_answer,
            self._user_id,
            exercise_id,
            answer,
            self._current_exercise,
        )
        if result.get("success"):
            await self._emit_tool_event(
                "answer_scored",
                {
                    "tool": "score_answer",
                    "label": "Answer checked",
                    "result": result.get("result"),
                    "topic": result.get("topic"),
                    "score_label": result.get("result"),
                },
            )
            # Optionally update topic in memory context (topic field is consent-gated
            # when saved via save_learner_memory — here we only track attempts in DB)
            self._current_exercise = None
        else:
            await self._emit_tool_event(
                "tool_error",
                {
                    "tool": "score_answer",
                    "label": "Could not check answer",
                    "error": result.get("error"),
                },
            )
        return json.dumps(result)


server = AgentServer()


def prewarm(proc: JobProcess) -> None:
    # Load Silero VAD model once per worker process.
    proc.userdata["vad"] = silero.VAD.load()
    # Build or load the FAISS vector index at startup so the first search_knowledge_base
    # call is fast and never blocks a live session.
    try:
        init_retriever()
        logger.info("RAG retriever initialised.")
    except Exception:
        logger.exception("init_retriever failed — knowledge base will be unavailable.")


server.setup_fnc = prewarm


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: JobContext) -> None:
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    await ctx.connect()

    # The learner joins with identity = vidya_user_id from the frontend token.
    # local_participant is the agent worker — use the remote learner instead.
    participant = await ctx.wait_for_participant()
    user_id = participant.identity or f"anon-{ctx.room.name}"
    logger.info("Session started for user_id=%r", user_id)

    # Prefetch SQLite memory while TTS/STT warm up so on_enter can greet by name
    # on the very first utterance without waiting for the user to speak again.
    memory_task: asyncio.Task[dict] = asyncio.create_task(
        asyncio.to_thread(memory_service.get_learner_memory, user_id)
    )

    # ── Groq key rotation — add up to 4 keys in .env.local as GROQ_API_KEY_1..4
    # Falls back to GROQ_API_KEY if numbered keys are absent.
    import os
    import random

    groq_keys = [
        k
        for k in [
            os.getenv("GROQ_API_KEY_1"),
            os.getenv("GROQ_API_KEY_2"),
            os.getenv("GROQ_API_KEY_3"),
            os.getenv("GROQ_API_KEY_4"),
            os.getenv("GROQ_API_KEY"),
        ]
        if k
    ]
    active_groq_key = random.choice(groq_keys) if groq_keys else None

    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language="multi"),
        llm=groq.LLM(model="llama-3.3-70b-versatile", api_key=active_groq_key),
        tts=murf.TTS(
            voice="Anisha",
            style="Conversation",
            tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=2),
            text_pacing=True,
        ),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
    )

    await session.start(
        agent=Assistant(user_id=user_id, memory_task=memory_task, room=ctx.room),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: (
                    noise_cancellation.BVCTelephony()
                    if params.participant.kind
                    == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                    else noise_cancellation.BVC()
                ),
            ),
        ),
    )


if __name__ == "__main__":
    cli.run_app(server)
