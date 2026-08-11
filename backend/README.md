# Backend — Voice Agent with Murf Falcon TTS

The Python backend for the Voice Agent Starter. It runs a real-time voice AI pipeline using [LiveKit Agents](https://docs.livekit.io/agents), connecting Murf Falcon TTS, Deepgram STT, and Google Gemini into a single conversational agent.

## How It Works

```
User speaks → [Deepgram STT] → text → [Gemini LLM] → response → [Murf Falcon TTS] → audio → User hears
```

LiveKit handles the real-time audio transport. The agent connects to LiveKit as a participant, listens for user speech, and responds with synthesized audio.

## Setup

### 1. Install dependencies

```bash
cd backend
uv sync
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in your keys in `.env.local`:

| Variable             | Where to get it                                           |
| -------------------- | --------------------------------------------------------- |
| `LIVEKIT_URL`        | [LiveKit Cloud](https://cloud.livekit.io/) → Settings     |
| `LIVEKIT_API_KEY`    | [LiveKit Cloud](https://cloud.livekit.io/) → Settings     |
| `LIVEKIT_API_SECRET` | [LiveKit Cloud](https://cloud.livekit.io/) → Settings     |
| `MURF_API_KEY`       | [murf.ai/api/dashboard](https://murf.ai/api/dashboard)    |
| `DEEPGRAM_API_KEY`   | [deepgram.com](https://console.deepgram.com/)             |
| `GOOGLE_API_KEY`     | [aistudio.google.com](https://aistudio.google.com/apikey) |

For LiveKit Cloud users, you can auto-populate LiveKit credentials:

```bash
lk cloud auth
lk app env -w -d .env.local
```

### 3. Download models

```bash
uv run python src/agent.py download-files
```

This downloads Silero VAD and the LiveKit turn detector models.

### 4. Run the agent

```bash
# Development mode (auto-reload)
uv run python src/agent.py dev

# Or test directly in your terminal (no frontend needed)
uv run python src/agent.py console

# Production
uv run python src/agent.py start
```

## Configuration

All configuration lives in [`src/agent.py`](src/agent.py).

### System prompt

The `SYSTEM_PROMPT` constant at the top of `agent.py` controls what your agent does. Change it to build any voice-powered use case.

#### Example prompts

**Customer Support (default):**

```
You are a friendly and efficient customer support agent for a tech company. Help users with account issues, billing questions, and product troubleshooting. Be concise, empathetic, and solution-oriented. If you don't know something, say so honestly and offer to escalate.
```

**Language Tutor:**

```
You are a patient and encouraging language tutor helping the user practice conversational Spanish. Speak primarily in Spanish but switch to English to explain grammar or vocabulary when needed. Correct mistakes gently and suggest better phrasing. Keep conversations natural and fun.
```

**AI Receptionist:**

```
You are a professional receptionist for a medical clinic. Help callers schedule appointments, answer questions about office hours and services, and take messages for doctors. Be warm but efficient. Ask for the caller's name and reason for calling upfront.
```

**Interview Coach:**

```
You are an experienced interview coach. Conduct mock interviews with the user for software engineering roles. Ask one behavioral or technical question at a time, let the user answer fully, then give specific feedback on their response — what was strong, what could improve, and a suggested reframe. Keep the tone encouraging but honest.
```

**Sales Assistant:**

```
You are a knowledgeable sales assistant for an electronics store. Help customers find the right product by asking about their needs, budget, and preferences. Compare options clearly, highlight trade-offs, and make a recommendation. Never be pushy — focus on helping the customer make the best decision for them.
```

**Fitness Coach:**

```
You are an upbeat personal fitness coach. Help users plan workouts, suggest exercises for specific muscle groups, and answer questions about form and technique. Ask about their fitness level and any injuries before recommending exercises. Keep instructions clear and motivating.
```

**Storyteller / Bedtime Narrator:**

```
You are a creative storyteller who tells original bedtime stories for children aged 4–8. Ask the child (or parent) for a character name, a favorite animal, and a setting, then weave a short, calming story. Use vivid but simple language. End each story on a peaceful, sleepy note.
```

**Meeting Summarizer:**

```
You are a meeting assistant. The user will describe what happened in a meeting or read you their notes. Summarize the key decisions, action items (with owners if mentioned), and any open questions. Be concise and structured. Ask clarifying questions if something is ambiguous.
```

**Trivia Game Host:**

```
You are an enthusiastic trivia game host. Ask the user one trivia question at a time from a mix of categories — science, history, pop culture, geography, and sports. Wait for their answer, tell them if they're right or wrong, give a brief fun fact, then move to the next question. Keep score and announce it every 5 questions.
```

**Mental Health Check-in Companion:**

```
You are a gentle, non-clinical wellness companion. Help users talk through their day, reflect on how they're feeling, and practice simple grounding exercises like deep breathing or gratitude lists. You are not a therapist — if the user expresses serious distress or mentions self-harm, gently encourage them to reach out to a professional or crisis helpline.
```

### Voice

Set the `voice` argument in the `murf.TTS(...)` call:

```python
tts=murf.TTS(
    voice="en-US-matthew",    # Change this
    style="Conversation",
    tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=2),
    text_pacing=True
)
```

Some voice options:

| Voice ID | Description                      |
| -------- | -------------------------------- |
| `Anisha` | Indian English, female (default) |
| `Amara`  | US English, female               |
| `Hazel`  | UK English, female               |
| `Gordon` | US English, male                 |

Browse all 150+ voices: [Murf Voice Library](https://murf.ai/api/docs/voices-styles/voice-library).

### STT (Speech-to-Text)

Default is Deepgram Nova-3. Change in the `AgentSession(stt=...)` call:

```python
stt=deepgram.STT(model="nova-3")
```

### LLM

Default is Google Gemini. To switch:

- **Gemini (default):** Set `GOOGLE_API_KEY` in `.env.local`
- **OpenAI:** Set `OPENAI_API_KEY`, install `livekit-agents[openai]`, and change the `llm=` argument

## Testing

The project includes an eval suite based on the LiveKit Agents [testing framework](https://docs.livekit.io/agents/build/testing/):

```bash
uv run pytest
```

Tests are in [`tests/test_agent.py`](tests/test_agent.py) and use LLM-as-judge evaluations to verify the agent behaves correctly (friendly greetings, grounding, refusing harmful requests).

To run tests in CI, you'll need to add `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` as repository secrets.

## Deployment

### Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/tIVCF1?referralCode=cNjn2P&utm_medium=integration&utm_source=template&utm_campaign=generic)

Set these environment variables in Railway:

- `MURF_API_KEY`
- `DEEPGRAM_API_KEY`
- `GOOGLE_API_KEY`
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`

### Docker

A production-ready [Dockerfile](Dockerfile) is included:

```bash
docker build -t murf-voice-agent .
docker run --env-file .env.local murf-voice-agent
```

## Project Structure

```
backend/
├── src/
│   └── agent.py          # Agent entrypoint — pipeline, prompt, config
├── tests/
│   └── test_agent.py     # LLM-judged eval suite
├── .env.example           # Environment variable template
├── pyproject.toml         # Python dependencies (uv)
├── Dockerfile             # Production container
└── railway.toml           # Railway deploy config
```

## Day 4 — Persistent Learner Memory

Day 4 adds a SQLite-backed memory layer and a companion REST API.

### Database

The database is created automatically at `backend/data/vidya.db` the first time
the agent or memory server starts.  It is gitignored and never committed.

`init_db()` (in `src/db/database.py`) is idempotent — safe to call multiple
times, uses `CREATE TABLE IF NOT EXISTS` throughout.

### Memory REST API

A lightweight HTTP server exposing learner memory over a simple REST interface.
It uses only the Python standard library — no extra dependencies.

| Method   | Path                 | Description                         |
| -------- | -------------------- | ----------------------------------- |
| `GET`    | `/memory/{user_id}`  | Fetch stored memory for a learner   |
| `DELETE` | `/memory/{user_id}`  | Permanently delete a learner's data |
| `OPTIONS`| `/memory/{user_id}`  | CORS preflight                      |

All responses include `Access-Control-Allow-Origin: *`.

Port defaults to **8888** and is overridable via `MEMORY_API_PORT`.

#### Start the memory server

```bash
uv run python -m src.api.memory_server
```

### Project Structure (Day 4 additions)

```
backend/
├── data/
│   ├── vidya.db                   ← SQLite database (gitignored)
│   ├── knowledge/                 ← Source documents for RAG (PDFs, TXT files)
│   └── vector_store/              ← FAISS index (gitignored, rebuilt on startup)
├── src/
│   ├── db/
│   │   ├── database.py            ← init_db, get_connection
│   │   └── learner_repository.py  ← CRUD operations
│   ├── services/
│   │   └── memory_service.py      ← safe wrappers for agent + API
│   ├── rag/
│   │   ├── loader.py              ← document loading + chunking (LangChain)
│   │   ├── vector_store.py        ← FAISS index build/load
│   │   └── retriever.py           ← search_knowledge_base tool
│   └── api/
│       └── memory_server.py       ← REST API (port 8888)
└── tests/
    └── test_memory.py             ← repository unit tests
```

### RAG Knowledge Base

Vidya can ground its answers in real educational documents (PDFs, TXT files) via a
FAISS vector store built with LangChain.

**Add documents:**

Place `.pdf` or `.txt` files in `backend/data/knowledge/`. On next startup the agent
automatically chunks and indexes them.

**Rebuild the index:**

Delete `backend/data/vector_store/` and restart the agent. A fresh FAISS index will
be built from all documents in `backend/data/knowledge/`.

**Knowledge directory:**

```
backend/data/knowledge/        ← drop PDFs and TXT files here
backend/data/vector_store/     ← FAISS index (auto-built, gitignored)
```

If the knowledge directory is empty, `search_knowledge_base` returns
`"Knowledge base not available."` and the agent answers from general knowledge.

### LangChain Integration

LangChain is used for two purposes in the Day 4 pipeline:

1. **Document loading and chunking** — `langchain-community` `DirectoryLoader`,
   `TextLoader`, and `PyPDFLoader` load documents from disk;
   `RecursiveCharacterTextSplitter` splits them into 800-token chunks with 80-token
   overlap.

2. **RAG retrieval tool** — `langchain_core.tools.tool` decorator wraps the FAISS
   similarity search as a `search_knowledge_base` callable that the Gemini LLM can
   invoke during a session.

LangChain does **not** replace LiveKit Agents — it augments the LLM step. The
full voice pipeline (STT → LLM with tools → TTS) continues to run inside
`livekit-agents`.

Pinned versions (see `pyproject.toml`):

| Package | Version |
|---|---|
| `langchain` | `0.3.25` |
| `langchain-community` | `0.3.24` |
| `langchain-core` | `0.3.59` |
| `langchain-google-genai` | `2.1.4` |
| `faiss-cpu` | `1.11.0` |
| `pypdf` | `5.6.0` |

## Links

- [Murf Falcon TTS Docs](https://murf.ai/api/docs/text-to-speech/streaming)
- [Murf Voice Library](https://murf.ai/api/docs/voices-styles/voice-library)
- [LiveKit Agents Docs](https://docs.livekit.io/agents)
- [Deepgram Nova-3 Docs](https://developers.deepgram.com)

## License

MIT — see [LICENSE](LICENSE).

## Day 5 — Tools

### What was built
Vidya now has real function-calling capabilities. When a learner asks to practice,
Vidya automatically calls `get_next_exercise`, personalises the exercise using
persistent Day 4 memory, and speaks it naturally. When the learner answers,
`score_answer` evaluates the response and Vidya gives warm, encouraging feedback.
Tool activity is shown in real-time in the frontend's Activity panel.

### Tools

| Tool | Purpose | Trigger |
|---|---|---|
| `get_next_exercise` | Fetch the next appropriate exercise from the local dataset | Learner asks to practice/quiz/test themselves |
| `score_answer` | Evaluate the learner's spoken answer against the exercise | Learner gives an answer after an exercise |
| `search_knowledge_base` | Retrieve relevant curriculum text from local knowledge base | Learner asks a curriculum factual question |
| `get_learner_memory` | Look up saved learner profile (name, level, topics) | Start of session |
| `save_learner_memory` | Persist one piece of learner info with consent | After learner gives explicit permission |
| `forget_learner_memory` | Delete all saved learner data | After learner confirms deletion |

### Architecture

```
Voice (Learner)
    ↓ STT (Deepgram Nova-3 multilingual)
    ↓ LLM (Groq llama-3.3-70b-versatile)
    ↓ Memory (SQLite — get_learner_memory)
    ↓ Tool (get_next_exercise / score_answer)
    ↓ Data (backend/data/exercises/exercises.json — LOCAL)
    ↓ LLM (compose natural voice response)
    ↓ TTS (Murf Falcon — Anisha voice)
    ↓ Learner hears exercise / feedback
```

### Data Source

```
DATA SOURCE
-----------
Type:         LOCAL
Source:       backend/data/exercises/exercises.json
Description:  Curated educational dataset for Indian school curriculum (Classes 6–12)
Topics:       Algebra, Fractions, Photosynthesis, Water Cycle, Geography,
              Arithmetic, Biology, Chemistry, Physics, History, Hindi Grammar
Exercises:    20 questions across 11 topics
Updated:      2026-08-10
License:      MIT (part of this project)

NOTE: Exercises are served from the project's local learning dataset.
      This is NOT live internet data. Vidya will say the exercise comes
      from its local dataset when relevant.
```

### Failure Handling

To simulate the exercise service failing:

```bash
EXERCISE_SERVICE_DISABLED=1 uv run python src/agent.py dev
```

When disabled, Vidya will respond with:
> "I'm having trouble loading a new exercise right now. We can continue with the last topic we were practicing."

No exercise card will be shown on screen. The agent never invents an exercise.

### Privacy

- Exercise attempt history (topic + result only) is stored in `exercise_attempts` table
- Full learner profile fields (name, level, goal, language) require explicit consent via `save_learner_memory`
- All data is local SQLite — never sent to external services
- "Forget everything" deletes all data including attempt history (CASCADE DELETE)

### Testing

```bash
cd backend
# Run all tests
uv run pytest

# Run exercise service tests only
uv run pytest tests/test_exercise_service.py -v

# Run memory tests only
uv run pytest tests/test_memory.py -v
```

## Day 6 — Outbound Calls

### What was built

Day 6 adds proactive outbound SIP calling to Vidya. The backend can now ring a student's Linphone SIP client at a scheduled time, join the same LiveKit room as the student, and conduct a full voice learning session — without the student having to open the app.

New pieces:
- **`src/db/call_repository.py`** — call history CRUD (`call_history` table + new `users` columns: `preferred_time`, `sip_uri`, `call_opt_out`)
- **`src/services/call_service.py`** — LiveKit SIP dispatch wrapper + `set_call_opt_out` helper
- **`src/scheduler/call_scheduler.py`** — asyncio loop (60 s tick) that fires outbound calls at the student's preferred time
- **`src/api/call_server.py`** — REST endpoints: `GET /api/calls/{user_id}` (call history) and `POST /api/memory/schedule` (save preferred time + SIP URI)
- **`src/agent.py`** — outbound greeting branch in `on_enter()`, new `set_call_opt_out` function tool, Day 6 `SYSTEM_PROMPT` additions
- **Frontend** — Call Schedule settings panel, Practice History panel, Outbound Call Dashboard (animated orb + status label), Student Dashboard card, hero redesign

### Architecture

```
[SQLite DB] → [call_scheduler.py] → [call_service.py] → [LiveKit SIP Bridge] → [Linphone] → [Vidya Agent]
```

In more detail:

```
[SQLite DB]
    │  preferred_time, sip_uri per user
    ▼
[call_scheduler.py]  ── asyncio loop (60 s tick)
    │  fires when |now − preferred_time| ≤ 5 min AND no call today
    ▼
[call_service.py]  ── livekit.api.SIPClient
    │  create_sip_participant() → Linphone rings
    ▼
[LiveKit SIP Bridge]  ── outbound SIP trunk (sip.linphone.org)
    │
    ▼
[Linphone SIP Client]  ── student's desktop or mobile
    │  RTP audio
    ▼
[Vidya Agent (agent.py)]  ── joins same room, detects _is_outbound=True
    │  outbound greeting → full learning session
    ▼
Murf Falcon TTS → student hears Vidya
Deepgram STT   → Vidya hears student
```

### Linphone setup (student side)

1. Go to [sip.linphone.org](https://www.linphone.org/freesip/home) and create a free account.  
   Your SIP address will be `sip:yourusername@sip.linphone.org`.
2. Download the Linphone desktop app from [linphone.org/downloads](https://www.linphone.org/en/downloads/linphone).
3. Open Linphone → **Preferences → SIP Accounts → Add account**.
4. Enter your SIP address and password, save. The status indicator should turn green (registered).
5. Keep Linphone running and registered when you want to receive Vidya's calls.

### SIP configuration (backend side)

Vidya places calls through a LiveKit SIP trunk. You need to create one outbound trunk in the LiveKit dashboard and copy its ID into your env file.

1. Log in to [LiveKit Cloud](https://cloud.livekit.io/) → **SIP → Trunks → Create Trunk**.
2. Set the trunk to **Outbound**, destination domain `sip.linphone.org`.
3. Copy the generated trunk ID (looks like `ST_xxxxxxxxxxxx`).
4. Add it to `backend/.env.local` (see env var table below).

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `LIVEKIT_SIP_TRUNK_ID` | Yes (for outbound) | LiveKit SIP outbound trunk ID (`ST_…`). If unset, the scheduler starts but all SIP dispatches return `{"success": false, "error": "no_sip_trunk"}` — inbound sessions still work. |
| `SCHEDULER_ENABLED` | No (default `1`) | Set to `0` to disable the call scheduler entirely (e.g. in local dev when you don't want calls firing). |
| `LINPHONE_UNAVAILABLE_SIMULATION` | No (default `0`) | Set to `1` to make `dispatch_outbound_sip_call` return a simulated failure immediately without making a real SIP call. Useful for testing the retry/missed-call flow without a real Linphone account. |

### Testing

#### Simulate a missed call (no real SIP required)

```bash
LINPHONE_UNAVAILABLE_SIMULATION=1 uv run python src/agent.py dev
```

With this flag set, every outbound dispatch returns `{"success": false, "error": "linphone_unavailable"}` and writes a `missed` record to `call_history`. After 10 minutes the scheduler will attempt a retry. You can verify the row in `data/vidya.db`:

```bash
sqlite3 data/vidya.db "SELECT * FROM call_history;"
```

#### Run the scheduler manually

The scheduler starts automatically when the agent starts. To run it standalone for inspection:

```bash
uv run python -c "
import asyncio
from src.scheduler.call_scheduler import run_scheduler
asyncio.run(run_scheduler())
"
```

It will print a log line every 60 seconds showing which users were checked.

#### End-to-end test with real Linphone

1. Complete the Linphone setup above and ensure the app shows **Registered**.
2. Open the frontend, go to the **Call Schedule** panel, enter your SIP URI and a time 2 minutes from now, and click Save.
3. Wait — Linphone will ring. Answer the call.
4. Verify: Vidya's first sentence identifies herself ("मैं Vidya AI Learning Assistant हूँ") and offers the opt-out option.
5. If your name and last topic are in memory, Vidya will mention them.
6. Say "stop calls" — Vidya confirms opt-out and ends the session gracefully.
7. Open the **Practice History** panel in the frontend and confirm the call record appears.

### Limitations

- **SIP trunk required.** Outbound calls cannot be placed without a LiveKit SIP outbound trunk configured in your LiveKit Cloud project. Without `LIVEKIT_SIP_TRUNK_ID`, the scheduler runs harmlessly but never places calls.
- **Linphone must be registered and online.** If Linphone is closed or loses its SIP registration, calls will be recorded as `missed` and a single retry is attempted after 10 minutes. There is no further retry after that.
- **One call per student per day.** The scheduler checks `call_exists_today()` before every dispatch. Duplicate calls on the same calendar day are silently skipped.
- **±5 minute drift window.** If the agent server is down at the student's preferred time and comes back more than 5 minutes later, the call is skipped until the next day.
- **No PSTN support.** Calls go to SIP clients only (Linphone, Zoiper, etc.). Calling a regular phone number requires a PSTN-enabled SIP trunk, which is not configured here.
