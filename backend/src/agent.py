import asyncio
import json
import logging
import os
import random
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
from services import escalation_service, exercise_service, memory_service

try:
    from services import call_service
except ImportError:
    call_service = None  # type: ignore[assignment]

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

WRONG ANSWER PROTOCOL (follow this exactly when score_answer returns result="incorrect" or result="partially_correct"):
1. Acknowledge warmly — never say "wrong" or shame the learner.
2. Give the hint from the score result (hint / hint_hi field) and let them try ONE more time.
3. If they get it wrong a second time (or ask to give up), ALWAYS speak the correct answer clearly using the `correct_answer` field from the score result. Example: "The correct answer is photosynthesis."
4. Then briefly explain WHY using the `explanation` field from the score result.
5. Ask if they want to try another question on the same topic.
NEVER skip step 3 — always tell the learner what the right answer is after a wrong attempt + hint.
NEVER invent or guess the correct answer — use only the `correct_answer` field returned by score_answer.
NEVER diagnose learning disabilities. NEVER shame wrong answers.

OUTBOUND CALL RULES (Day 6):
- You may be in an OUTBOUND session — the student did not initiate this call.
- Your on_enter greeting already covered identity, opt-out, and asked what to practice. Do NOT ask for the student's name — they didn't ask for this call.
- Start helping immediately after the greeting. If they say a topic, get them an exercise.
- If the student says "stop calls", "बंद करो", "no more calls", "unsubscribe", or anything indicating they want no more calls → call set_call_opt_out, then confirm: "ठीक है, मैं आगे से call नहीं करूँगी।"
- After confirming opt-out, end the session gracefully.

HUMAN ESCALATION RULES (Day 7 — Know When to Ask for Human Help):
1. ESCALATION CONDITIONS:
   - Condition A (Learner is Upset): The learner is frustrated, upset, confused after multiple attempts, or wants to give up (e.g. "I'm frustrated and don't understand anything", "I keep getting everything wrong", "I don't want to study anymore"). Respond empathetically.
   - Condition B (Learner Needs a Teacher): The learner explicitly asks for a teacher or human help (e.g. "Can I talk to my teacher?", "I need help from a real teacher", "This is too difficult, can someone explain it?").
   - Do NOT escalate ordinary questions that Vidya can safely answer.

2. MANDATORY CONSENT FLOW:
   - Before calling create_escalation, you MUST ask for explicit permission:
     Hindi consent example: "मैं आपकी मदद के लिए एक teacher-support request बना सकती हूँ। इसमें आपका नाम, समस्या का छोटा summary और आपकी preferred language share होगी। क्या मैं इसे भेज दूँ?"
     English consent example: "I can create a teacher-support request for you. It will share your name, a short summary of the issue, and your preferred language. May I send this?"
   - If user says YES / हाँ / sure / send it → call create_escalation(...) immediately.
   - If user says NO / नहीं / don't send → DO NOT call create_escalation. Respect their choice and continue helping within Vidya's capabilities.

3. PRIVACY SAFETY:
   - NEVER put passwords, OTPs, PINs, account numbers, credentials, or full raw conversation transcripts into the escalation summary. Keep summary short and educational.

4. REFERENCE ID & RESPONSE:
   - Always quote the EXACT reference_id returned by create_escalation (e.g. VID-7A42K9).
   - Tell the learner: "आपकी teacher-support request बन गई है। आपका reference ID VID-XXXXXX है। इस ID को संभालकर रखें।"
   - Do NOT promise immediate human response.
   - If create_escalation fails (success=false), explain gracefully using the fallback: "माफ़ कीजिए, teacher-support request अभी create नहीं हो पाई। कृपया थोड़ी देर बाद फिर कोशिश करें।"
   - NEVER invent or hallucinate a reference ID.

5. NATIVE SCRIPT MANDATORY:
   - ALL Hindi text MUST be in Devanagari script ALWAYS (e.g., "नमस्ते", "टीचर"). NEVER write Romanized Hindi ("namaste", "main aapki madad").
"""


def _extract_name(text: str) -> str | None:
    """Extract a name from English, Devanagari Hindi, or Hinglish phrases."""
    patterns = [
        r"(?:my name is|i am|i'm|call me|mera naam|mera naam hai|main|मेरा नाम|मैं)\s+([A-Za-z\u0900-\u097F]{2,20})",
        r"(?:my name is|i am|i'm|call me)\s+([A-Za-z][A-Za-z\s]{0,20}?)(?:\.|,|$|\sand\s|\.|!)",
    ]
    ignored = {"learning", "student", "user", "teacher", "help", "here", "studying", "trying"}
    for pattern in patterns:
        m = _re.search(pattern, text, _re.IGNORECASE)
        if m:
            name = m.group(1).strip().split()[0]  # first word only
            if len(name) >= 2 and name.lower() not in ignored:
                return name.capitalize() if name.isascii() else name
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
        is_outbound: bool = False,
    ) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)
        self._user_id = user_id
        self._memory_task = memory_task
        self._room = room
        self._is_outbound = is_outbound
        self._call_id: int | None = None
        # Track what we've auto-detected but not yet saved this session
        self._detected_name: str | None = None
        self._detected_class: str | None = None
        # Current exercise for score_answer chaining (Day 5)
        self._current_exercise: dict | None = None
        self._topic_failure_counts: dict[str, int] = {}

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
        """Auto-save when the user introduces themselves or asks to be remembered."""
        try:
            text = getattr(new_message, "text_content", "") or ""
            if not text:
                return

            # Extract info from every user turn
            name = _extract_name(text)
            cls = _extract_class(text)
            if name:
                self._detected_name = name
                # Auto-persist name so identity is immediately remembered
                memory_service.save_learner_memory(self._user_id, "name", name)
                logger.info("Saved learner name=%r for user_id=%r", name, self._user_id)
            if cls:
                self._detected_class = cls

            # If they explicitly ask to save, save any additional detected fields
            if _wants_to_save(text) and self._detected_class:
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
        """Speak a greeting — outbound or inbound depending on session type."""
        memory: dict = {"found": False}
        if self._memory_task is not None:
            try:
                memory = await asyncio.wait_for(self._memory_task, timeout=5.0)
            except asyncio.TimeoutError:
                logger.info(
                    "Memory lookup timed out for user_id=%r — greeting as new user.",
                    self._user_id,
                )
            except Exception:
                logger.exception(
                    "Unexpected error in memory_task for user_id=%r", self._user_id
                )

        if self._is_outbound:
            await self._emit_tool_event("call_status", {"status": "CALLING"})
            logger.info("Outbound greeting memory=%r", memory)
            await self._outbound_greeting(memory)
        else:
            await self._inbound_greeting(memory)

    async def _inbound_greeting(self, memory: dict) -> None:
        """Original inbound greeting (Day 1-5 behaviour unchanged)."""
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

    async def _outbound_greeting(self, memory: dict) -> None:
        """Outbound greeting — identifies Vidya, states purpose, explains opt-out."""
        name = memory.get("name") if memory.get("found") else None
        topics = memory.get("topics") or []
        last_topic = topics[-1] if topics else None

        if name:
            intro = (
                f"नमस्ते {name}! मैं Vidya AI Learning Assistant हूँ। "
                "मैं आपके daily learning practice session के लिए call कर रही हूँ। "
                "अगर आप future calls बंद करना चाहते हैं तो मुझे बता सकते हैं।"
            )
            if last_topic:
                intro += (
                    f" पिछली बार हम {last_topic} practice कर रहे थे। "
                    "आज उसी topic को continue करें, या कोई नया topic try करें?"
                )
            else:
                intro += " आज आप क्या practice करना चाहेंगे?"
        else:
            intro = (
                "नमस्ते! मैं Vidya AI Learning Assistant हूँ। "
                "मैं आपके daily learning practice के लिए call कर रही हूँ। "
                "अगर आप future calls बंद करना चाहते हैं तो मुझे बता सकते हैं। "
                "आज आप किस subject में practice करना चाहेंगे — "
                "Math, Science, English, या कोई और topic?"
            )
        await self.session.say(intro)

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
        this session.

        Returns JSON with:
        - result: "correct", "incorrect", or "partially_correct"
        - correct_answer: the actual right answer — ALWAYS speak this if result != "correct"
        - explanation: why that answer is correct — use this when revealing the answer
        - hint: a clue to help them try again before revealing the answer
        - next_step: suggested follow-up

        IMPORTANT: If result is "incorrect" or "partially_correct":
        1. Give the hint first and let them retry once.
        2. If still wrong (or they give up), speak the correct_answer clearly, then the explanation.
        NEVER skip revealing the correct_answer after a failed attempt.
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
            # Track per-topic failure counts for human escalation (Day 7)
            topic_key = result.get("topic", "")
            score_result = result.get("result", "")

            if score_result == "incorrect" and topic_key:
                self._topic_failure_counts[topic_key] = (
                    self._topic_failure_counts.get(topic_key, 0) + 1
                )
                logger.info(
                    "Failure count for topic=%r user_id=%r count=%d",
                    topic_key,
                    self._user_id,
                    self._topic_failure_counts[topic_key],
                )
            elif score_result == "correct" and topic_key:
                self._topic_failure_counts[topic_key] = 0

            if self._topic_failure_counts.get(topic_key, 0) >= 3:
                result["escalation_suggested"] = True
                result["failure_count"] = self._topic_failure_counts[topic_key]

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

    @function_tool
    async def set_call_opt_out(self, placeholder: str = "") -> str:
        """
        Opt the current student out of future scheduled calls.
        Call this ONLY when the student explicitly says they want no more calls
        (e.g. "stop calls", "बंद करो", "unsubscribe", "no more calls").
        Returns {"success": true} on success.
        The placeholder parameter is unused — pass an empty string.
        """
        if call_service is None:
            return json.dumps({"success": False, "error": "call_service_unavailable"})
        result = await call_service.set_call_opt_out(self._user_id)
        return json.dumps(result)

    @function_tool
    async def create_escalation(
        self,
        reason: str,
        summary: str,
        what_was_checked: str = "",
        urgency: str = "medium",
        language: str = "Hindi-English",
        follow_up_method: str = "teacher_callback",
    ) -> str:
        """
        Create a human help / teacher support request.

        Call this ONLY after the learner explicitly grants permission to create a support request
        (e.g., when the learner is frustrated, upset, or asks for a real teacher).

        Parameters:
        - reason: Short reason for escalation ("learner_frustrated", "explicit_teacher_request", "concept_too_difficult").
        - summary: Privacy-safe concise summary of the learner's problem (NEVER include passwords, PINs, OTPs, or confidential credentials).
        - what_was_checked: What concepts or exercises were already attempted.
        - urgency: "low", "medium", or "high".
        - language: Preferred language ("Hindi-English", "Hindi", "English").
        - follow_up_method: Preferred follow-up method ("teacher_callback", "app_dashboard", "phone").

        Returns JSON with success, reference_id (e.g. VID-7A42K9), status, and created_at.
        Speak the returned reference_id clearly to the learner so they can keep it.
        """
        await self._emit_tool_event(
            "tool_start",
            {"tool": "create_escalation", "label": "Creating teacher support request"},
        )
        result = await asyncio.to_thread(
            escalation_service.create_escalation,
            user_id=self._user_id,
            reason=reason,
            summary=summary,
            what_was_checked=what_was_checked,
            urgency=urgency,
            language=language,
            follow_up_method=follow_up_method,
            name=self._detected_name,
        )
        if result.get("success"):
            esc = result.get("escalation", {})
            ref_id = esc.get("reference_id", "")
            await self._emit_tool_event(
                "escalation_created",
                {
                    "tool": "create_escalation",
                    "label": "Teacher support request created",
                    "reference_id": ref_id,
                    "reason": esc.get("reason"),
                    "summary": esc.get("summary"),
                    "urgency": esc.get("urgency"),
                    "language": esc.get("language"),
                    "status": esc.get("status"),
                },
            )
            return json.dumps(
                {
                    "success": True,
                    "reference_id": ref_id,
                    "status": "open",
                    "message": f"Teacher support request created with reference ID {ref_id}.",
                }
            )

        await self._emit_tool_event(
            "escalation_failed",
            {
                "tool": "create_escalation",
                "label": "Failed to create teacher support request",
                "error": result.get("error"),
            },
        )
        return json.dumps(
            {
                "success": False,
                "error": result.get("error", "unknown_error"),
                "message": "माफ़ कीजिए, teacher-support request अभी create नहीं हो पाई। कृपया थोड़ी देर बाद फिर कोशिश करें।",
            }
        )


server = AgentServer()

# Module-level set to keep background task references alive (prevents GC).
_background_tasks: set[asyncio.Task] = set()


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

    # Parse outbound metadata from AgentDispatch (Day 6)
    import contextlib

    _job_metadata: dict = {}
    with contextlib.suppress(ValueError, TypeError):
        _job_metadata = json.loads(getattr(ctx.job, "metadata", None) or "{}")
    _is_outbound: bool = bool(_job_metadata.get("outbound", False))
    _outbound_user_id: str = _job_metadata.get("user_id", "")

    participant = await ctx.wait_for_participant()
    # For outbound calls use the user_id from metadata; fall back to participant identity
    user_id = _outbound_user_id or participant.identity or f"anon-{ctx.room.name}"
    logger.info("Session started for user_id=%r outbound=%r", user_id, _is_outbound)

    # Prefetch SQLite memory while TTS/STT warm up so on_enter can greet by name
    # on the very first utterance without waiting for the user to speak again.
    memory_task: asyncio.Task[dict] = asyncio.create_task(
        asyncio.to_thread(memory_service.get_learner_memory, user_id)
    )

    # ── Groq key rotation — add up to 4 keys in .env.local as GROQ_API_KEY_1..4
    # Falls back to GROQ_API_KEY if numbered keys are absent.
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
        # Wait 5 seconds of continuous silence before committing a user turn.
        # This prevents natural mid-sentence pauses (common in Hindi+English mixed
        # speech) from being treated as separate messages. Timer resets whenever
        # new speech arrives, so the full utterance becomes ONE committed turn.
        min_endpointing_delay=5.0,
        max_endpointing_delay=12.0,
        preemptive_generation=True,
    )

    await session.start(
        agent=Assistant(
            user_id=user_id,
            memory_task=memory_task,
            room=ctx.room,
            is_outbound=_is_outbound,
        ),
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

    # Start call scheduler if enabled (Day 6)
    if os.getenv("SCHEDULER_ENABLED") == "1":
        try:
            from scheduler.call_scheduler import run_scheduler

            _t = asyncio.create_task(run_scheduler())
            _background_tasks.add(_t)
            _t.add_done_callback(_background_tasks.discard)
            logger.info("Call scheduler started.")
        except Exception:
            logger.exception("Failed to start call scheduler — continuing without it.")


if __name__ == "__main__":
    cli.run_app(server)
