# DAY 4 MEMORY — Vidya Persistent Learner Memory

> Architecture reference for the Day 4 implementation. Covers the full stack:
> SQLite memory layer, agent tools, consent flow, user identity, REST API, and frontend.

---

## 1. Overview

Day 4 transforms Vidya from a stateless voice agent into a persistent AI learning companion. It adds:

- **SQLite persistent memory** — learner profiles, facts, and topics survive backend restarts
- **Consent-based memory tools** — three `@function_tool` methods the LLM can call only after explicit user permission
- **User identity system** — stable anonymous UUID v4 generated in `localStorage`, threaded through LiveKit to the backend agent
- **Memory REST API** — lightweight Python stdlib HTTP server on port 8888 (`GET`/`DELETE /memory/{user_id}`)
- **Memory page** — `/memory` frontend page to view and delete saved learning data
- **Returning-user welcome** — personalised hero when memory is found on session start
- **Hindi Devanagari enforcement** — all Hindi output uses Unicode Devanagari (U+0900–U+097F); Romanized Hindi is prohibited
- **AI Activity panel** — human-friendly live event feed wired to real LiveKit events
- **Session summary screen** — shows topics and saved facts after each session ends

Nothing from Day 1–3 is removed. All changes are additive or targeted updates.

---

## 2. Architecture Diagram

```
Browser (Next.js)
  │
  │  localStorage key: "vidya_user_id"  (UUID v4, generated once)
  │
  ▼
frontend/lib/user-identity.ts
  │  getUserId() → UUID string
  │
  ▼
frontend/components/app/welcome-view.tsx
  │  POST /api/token  { userId }
  │
  ▼
frontend/app/api/token/route.ts
  │  participantIdentity = userId (or random UUID fallback)
  │  Issues LiveKit AccessToken (15 min TTL)
  │
  ▼
LiveKit Cloud
  │  Participant identity = userId
  │
  ▼
backend/src/agent.py  ←  my_agent(ctx: JobContext)
  │  user_id = ctx.room.local_participant.identity
  │           or f"anon-{ctx.room.name}"  (fallback)
  │
  ▼
Assistant(user_id=user_id)  ← Agent subclass
  │
  │  @function_tool  get_learner_memory()
  │  @function_tool  save_learner_memory(field, value)
  │  @function_tool  forget_learner_memory()
  │
  ▼
backend/src/services/memory_service.py
  │  get_learner_memory(user_id)
  │  save_learner_memory(user_id, field, value)
  │  forget_learner_memory(user_id)
  │
  ▼
backend/src/db/learner_repository.py
  │  get_learner / create_learner / update_learner
  │  upsert_fact / get_facts
  │  add_topic / get_topics
  │  delete_learner / update_last_interaction
  │
  ▼
backend/src/db/database.py
  │  init_db()  — creates tables + indexes (idempotent)
  │  get_connection()  — context manager (commit/rollback/close)
  │
  ▼
backend/data/vidya.db  ←  SQLite file  (gitignored)


─── Separate process ────────────────────────────────────────────────────────

backend/src/api/memory_server.py   (port 8888)
  │  GET    /memory/{user_id}   → learner JSON
  │  DELETE /memory/{user_id}   → { "success": true }
  │  OPTIONS /memory/{user_id}  → CORS preflight
  │
  ▼  (same SQLite file via same repository functions)
backend/data/vidya.db

─── Frontend Memory Page ────────────────────────────────────────────────────

frontend/hooks/useLearnerMemory.ts
  │  GET  http://localhost:8888/memory/{userId}
  │  DELETE http://localhost:8888/memory/{userId}
  │
  ▼
frontend/app/memory/page.tsx  →  MemoryCard  →  ForgetConfirmModal
```

---

## 3. Database Schema

All tables are created by `init_db()` in `backend/src/db/database.py`. The call is idempotent
(`CREATE TABLE IF NOT EXISTS`) and runs automatically at module import time.

### 3.1 `users` table

```sql
CREATE TABLE IF NOT EXISTS users (
    user_id            TEXT PRIMARY KEY,
    name               TEXT,
    language_preference TEXT,
    current_level      TEXT,
    learning_goal      TEXT,
    last_interaction   TEXT,
    created_at         TEXT NOT NULL,
    updated_at         TEXT NOT NULL
);
```

All timestamps are UTC ISO 8601 strings (e.g. `2025-01-15T10:30:00+00:00`).

### 3.2 `learner_facts` table

```sql
CREATE TABLE IF NOT EXISTS learner_facts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT    NOT NULL,
    key         TEXT    NOT NULL,
    value       TEXT    NOT NULL,
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL,
    UNIQUE(user_id, key),
    FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

Allowed keys: `name`, `language_preference`, `current_level`, `learning_goal`, `learning_style`, `notes`

### 3.3 `learning_topics` table

```sql
CREATE TABLE IF NOT EXISTS learning_topics (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        TEXT    NOT NULL,
    topic          TEXT    NOT NULL,
    status         TEXT    DEFAULT 'studying',
    last_discussed TEXT,
    UNIQUE(user_id, topic),
    FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

Valid status values: `studying`, `completed`, `needs_review`

### 3.4 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_facts_user  ON learner_facts(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_user ON learning_topics(user_id);
```

### 3.5 Foreign key cascade

Both `learner_facts` and `learning_topics` carry `ON DELETE CASCADE` on `user_id`. A single
`DELETE FROM users WHERE user_id = ?` removes all associated facts and topics in one
transaction — no orphaned rows possible.

---

## 4. Memory Tools

Defined in `backend/src/agent.py` as methods of the `Assistant(Agent)` class.
The `user_id` is stored on the instance (`self._user_id`); the LLM never provides it.

### 4.1 `get_learner_memory`

```python
@function_tool
async def get_learner_memory(self) -> str:
    """
    Look up the learner's saved memory. Call this at the start of every session.
    Returns JSON with name, level, language, topics, and last interaction.
    If found=false, treat the learner as new.
    """
    result = memory_service.get_learner_memory(self._user_id)
    return json.dumps(result)
```

**Behavior:**
- Calls `memory_service.get_learner_memory(user_id)` which queries `users` + `learning_topics`
- Returns a JSON string; on success `{"found": true, "name": ..., "topics": [...], ...}`
- On not-found returns `{"found": false}`
- On database error returns `{"found": false, "error": "memory_unavailable"}`

### 4.2 `save_learner_memory`

```python
@function_tool
async def save_learner_memory(self, field: str, value: str) -> str:
    """
    Save one piece of learner information AFTER the user has given explicit consent.
    Allowed fields: name, language_preference, current_level, learning_goal, topic.
    Never call this without first asking the user for permission.
    """
    result = memory_service.save_learner_memory(self._user_id, field, value)
    return json.dumps(result)
```

**Behavior:**
- Profile fields (`name`, `language_preference`, `current_level`, `learning_goal`) → `update_learner()`
- Field `"topic"` → `add_topic()` (idempotent; updates `status` and `last_discussed` if row exists)
- Creates the learner row via `create_learner()` first if it does not exist
- Returns `{"success": true}` or `{"success": false, "error": "..."}`
- The LLM must NOT call this unless the user has explicitly said yes

### 4.3 `forget_learner_memory`

```python
@function_tool
async def forget_learner_memory(self) -> str:
    """
    Delete all of the learner's saved memory. Only call after the user confirms.
    Returns {"success": true} on success.
    """
    result = memory_service.forget_learner_memory(self._user_id)
    return json.dumps(result)
```

**Behavior:**
- Calls `delete_learner(user_id)` — cascades to `learner_facts` and `learning_topics`
- Returns `{"success": true}` or `{"success": false}`
- Agent confirms naturally: "Done — I've cleared your saved learning information."

---

## 5. Consent Flow

Consent is enforced entirely through the system prompt instructions and the LLM's tool-call
decision logic. There is no server-side consent gate — the prompt rules are the contract.

```
Step 1 — Learner shares information
  Learner: "My name is Aarav and I'm studying Class 10 science."

Step 2 — Agent asks for consent (MANDATORY before any save_learner_memory call)
  Vidya: "Would you like me to remember your name for future sessions?"

Step 3 — Wait for explicit affirmative response
  ✓  "Yes"  /  "Sure"  /  "Please do"  /  "Go ahead"  →  proceed to Step 4
  ✗  "No"   /  "Don't save"  /  silence  /  ambiguous  →  skip Step 4, do NOT save

Step 4 — Call save_learner_memory (only on explicit yes)
  tool call: save_learner_memory(field="name", value="Aarav")
  tool result: {"success": true}

Step 5 — Agent confirms naturally (optional, keep brief)
  Vidya: "Got it, I'll remember that."

Step 6 — Repeat per fact (one consent request per piece of information)
  Vidya: "Should I also save that you're in Class 10 science?"
  [await explicit yes before calling save_learner_memory again]
```

**Rules enforced by `SYSTEM_PROMPT`:**
- Silence is NOT consent
- "Just save everything" does NOT grant blanket consent — each fact still needs explicit consent
- The following must NEVER be saved regardless of consent: passwords, OTPs, PINs, payment
  information, government IDs (Aadhaar, PAN, passport), health information, API keys

**Forget flow:**
```
Learner: "Forget everything"
Vidya:   "Are you sure? This will permanently delete all your saved learning information."
Learner: "Yes, delete it"
         → tool call: forget_learner_memory()
Vidya:   "Done — I've cleared your saved learning information."
```

---

## 6. User Identity System

A stable anonymous UUID v4 ties the browser session to the database row — no login required.

### 6.1 Generation (`frontend/lib/user-identity.ts`)

```typescript
const KEY = 'vidya_user_id';

export function getUserId(): string {
  if (typeof window === 'undefined') {
    // Server-side render — no localStorage available.
    return 'server-side';
  }

  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();          // built-in Web Crypto API
    localStorage.setItem(KEY, id);
  }
  return id;
}
```

- First visit: UUID generated with `crypto.randomUUID()` and persisted in `localStorage`
- Every subsequent visit: same UUID returned from `localStorage`
- SSR-safe: returns placeholder string `'server-side'` when `window` is not available
- The UUID is never a real name or email — it is only used as a database key

### 6.2 Token route (`frontend/app/api/token/route.ts`)

```typescript
const body = await req.json().catch(() => ({}));

// Use provided userId as participant identity for persistent memory lookup.
// Fall back to a random UUID for backward-compatibility when userId is absent.
const participantIdentity: string =
  typeof body?.userId === 'string' && body.userId.length > 0
    ? body.userId
    : randomUUID();
```

The `participantIdentity` value flows into the LiveKit `AccessToken` and becomes the
participant's identity string inside the LiveKit room.

### 6.3 Backend extraction (`backend/src/agent.py`)

```python
@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: JobContext):
    await ctx.connect()

    user_id = ctx.room.local_participant.identity or f"anon-{ctx.room.name}"
    logger.info("Session started for user_id=%r", user_id)

    session = AgentSession(...)
    await session.start(agent=Assistant(user_id=user_id), ...)
```

The participant identity set in the token is available as
`ctx.room.local_participant.identity` after `ctx.connect()`. If it is empty (e.g. older
clients that do not send `userId`), the agent falls back to a room-scoped anonymous ID and
the session continues normally — memory just will not persist.

---

## 7. API Endpoints

Base URL: `http://localhost:8888` (configurable via `MEMORY_API_PORT` env var for the server,
`NEXT_PUBLIC_MEMORY_API_URL` for the frontend).

All endpoints set CORS headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### 7.1 `GET /memory/{user_id}`

Fetch a learner's saved memory.

**Request:**
```
GET /memory/550e8400-e29b-41d4-a716-446655440000
```

**Response 200 — learner found:**
```json
{
  "found": true,
  "name": "Aarav",
  "language_preference": "Hindi",
  "current_level": "Class 10",
  "learning_goal": "Pass board exams",
  "topics": ["Photosynthesis", "Quadratic Equations"],
  "last_interaction": "2025-01-15T10:30:00+00:00"
}
```

**Response 200 — learner not found:**
```json
{ "found": false }
```

**Response 400 — invalid user_id:**
```json
{ "error": "invalid_user_id" }
```

**Response 500 — internal error:**
```json
{ "error": "internal_error" }
```

Validation: `user_id` must be non-empty and ≤ 200 characters. The path must match
`/memory/<user_id>` — any other path returns 400.

---

### 7.2 `DELETE /memory/{user_id}`

Delete all data for a learner (cascades to facts and topics).

**Request:**
```
DELETE /memory/550e8400-e29b-41d4-a716-446655440000
```

**Response 200 — success:**
```json
{ "success": true }
```

**Response 400 — invalid user_id:**
```json
{ "error": "invalid_user_id" }
```

**Response 500 — internal error:**
```json
{ "error": "internal_error" }
```

---

### 7.3 `OPTIONS /memory/{user_id}`

CORS preflight — returns 200 with CORS headers and an empty body.

---

## 8. Multilingual Configuration

The voice pipeline configuration in `backend/src/agent.py` is unchanged from Day 3:

```python
stt=deepgram.STT(model="nova-3", language="multi"),
tts=murf.TTS(
    voice="Anisha",
    style="Conversation",
    tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=2),
    text_pacing=True,
),
turn_detection=MultilingualModel(),
```

Day 4 extends this with system prompt rules:

### 8.1 Devanagari rule (mandatory)

```
Hindi responses MUST use Devanagari script.
  ✓  "नमस्ते! आज क्या सीखना है?"
  ✗  "Namaste! Aaj kya seekhna hai?"  ← PROHIBITED

When the learner speaks Hindi, every Hindi word in the response must use
Devanagari (Unicode range U+0900–U+097F). Romanized Hindi is never
acceptable as a substitute for Devanagari in a Hindi response.
```

### 8.2 Hinglish rule

```
Hinglish code-mixing:
  Hindi words      → Devanagari script
  English terms    → Latin script (unchanged)

  ✓  "बिल्कुल! Let's learn photosynthesis step by step."
  ✗  "Bilkul! Let's learn photosynthesis step by step."
```

### 8.3 STT/TTS configuration summary

| Component | Setting |
|-----------|---------|
| STT model | Deepgram Nova-3 |
| STT language | `multi` (Hindi, English, Nepali, code-mixed) |
| TTS voice | Murf Falcon — Anisha |
| TTS style | Conversation |
| TTS tokenizer | `SentenceTokenizer(min_sentence_len=2)` |
| TTS pacing | `text_pacing=True` |
| Turn detection | `MultilingualModel()` |

---

## 9. Run Commands

### 9.1 Backend agent

```bash
cd backend
uv sync                                      # install / sync dependencies
uv run python src/agent.py download-files    # first run only (downloads VAD model)
uv run python src/agent.py dev               # start agent in development mode
```

### 9.2 Memory API server

In a separate terminal:

```bash
cd backend
uv run python -m src.api.memory_server
# Listens on http://localhost:8888
# Set MEMORY_API_PORT=<port> to change the port
```

### 9.3 Frontend

```bash
cd frontend
pnpm install                                 # install dependencies
pnpm dev                                     # start dev server on http://localhost:3000
```

### 9.4 Environment variables

**Backend** (`backend/.env.local`):
```
LIVEKIT_URL=...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
MURF_API_KEY=...
DEEPGRAM_API_KEY=...
GOOGLE_API_KEY=...
# Optional:
MEMORY_API_PORT=8888
```

**Frontend** (`frontend/.env.local`):
```
LIVEKIT_URL=...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
AGENT_NAME=my-agent
# Optional:
NEXT_PUBLIC_MEMORY_API_URL=http://localhost:8888
```

### 9.5 Backend tests

```bash
cd backend
uv run pytest                   # all tests including test_memory.py
uv run ruff check .             # lint
uv run ruff format .            # format
```

### 9.6 Frontend checks

```bash
cd frontend
pnpm typecheck                  # TypeScript type-check (tsc --noEmit)
pnpm lint                       # ESLint
pnpm build                      # production build
```

---

## 10. Definition of Done Checklist

### Backend memory layer

| # | Check | Status |
|---|-------|--------|
| 22.1 | Backend starts → `vidya.db` created at `backend/data/vidya.db` | ✓ |
| — | `init_db()` is idempotent (safe to call multiple times) | ✓ |
| — | All queries use parameterized form (`?` placeholders) — no string concatenation | ✓ |
| — | `get_connection()` commits on success, rolls back on exception, closes always | ✓ |
| — | `learner_facts` and `learning_topics` cascade-delete when user is deleted | ✓ |
| — | `backend/.gitignore` contains `data/`, `*.db`, `*.sqlite`, `*.sqlite3` | ✓ |

### Memory service

| # | Check | Status |
|---|-------|--------|
| — | `get_learner_memory` returns `{found, name, language_preference, current_level, learning_goal, topics, last_interaction}` | ✓ |
| — | `save_learner_memory` creates learner if absent, routes profile fields vs topic correctly | ✓ |
| — | `forget_learner_memory` cascades deletion, returns `{success: true/false}` | ✓ |
| — | All service functions catch exceptions, log server-side, return safe dicts | ✓ |

### Agent tools and prompt

| # | Check | Status |
|---|-------|--------|
| — | `Assistant` class has three `@function_tool` methods | ✓ |
| — | `user_id` stored on `self._user_id`, not passed by LLM | ✓ |
| — | `my_agent()` extracts participant identity after `ctx.connect()` | ✓ |
| 22.2 | First call: name shared → Vidya asks consent → "Yes" → name saved | ✓ |
| 22.3 | "I'm studying Class 10 science" → Vidya asks consent → "Yes" → fact saved | ✓ |
| 22.4 | Stop + restart backend → Vidya greets "Welcome back, Aarav!" | ✓ |
| 22.5 | Consent refused → nothing saved → restart → Vidya doesn't know name | ✓ |
| 22.6 | "Forget everything" → Vidya confirms → confirmed → next call treats as new user | ✓ |

### Multilingual

| # | Check | Status |
|---|-------|--------|
| 22.7 | Hindi speech → Devanagari in response (नमस्ते visible, not Namaste) | ✓ |
| 22.8 | Hinglish code-mixing: Hindi words Devanagari, English terms Latin | ✓ |
| 22.10 | Transcript renders Devanagari correctly (Noto Sans Devanagari font stack) | ✓ |

### Memory REST API

| # | Check | Status |
|---|-------|--------|
| — | `GET /memory/{user_id}` returns learner JSON with 200 | ✓ |
| — | `DELETE /memory/{user_id}` deletes data and returns `{success: true}` | ✓ |
| — | Invalid `user_id` returns 400 | ✓ |
| — | CORS headers set on all responses | ✓ |
| — | `init_db()` called at server startup | ✓ |
| — | Binds to port 8888 (or `MEMORY_API_PORT`) | ✓ |

### Frontend

| # | Check | Status |
|---|-------|--------|
| — | `getUserId()` generates UUID v4 on first visit, returns same on subsequent visits | ✓ |
| — | Token route accepts `userId`, uses it as `participantIdentity` | ✓ |
| — | `useLearnerMemory` hook fetches and deletes via memory API | ✓ |
| 22.11 | Memory page loads at `/memory`, shows stored data, delete works with confirmation | ✓ |
| 22.12 | Welcome view shows returning-user greeting when memory found | ✓ |
| 22.13 | Topic chips on welcome view visible | ✓ |
| 22.14 | Session summary appears after session ends | ✓ |
| 22.15 | Navigation bar visible with Memory link | ✓ |
| 22.16 | Mobile layout at 375px — no horizontal scroll, all controls reachable | ✓ |
| 22.9 | AI Activity panel shows real events (not fabricated) | ✓ |

### Quality

| # | Check | Status |
|---|-------|--------|
| — | `uv run ruff check .` passes | ✓ |
| — | `uv run ruff format .` applied | ✓ |
| — | `uv run pytest` all tests pass (including `test_memory.py`) | ✓ |
| — | `pnpm typecheck` passes | ✓ |
| — | `pnpm lint` passes | ✓ |
| — | `pnpm build` production build succeeds | ✓ |

### Regression (Day 1–3)

| # | Check | Status |
|---|-------|--------|
| 22.17 | Day 2 guardrails intact (no diagnoses, no shame, refusals working) | ✓ |
| 22.18 | Day 3 states intact (Connecting, Listening, Thinking, Speaking, Ended) | ✓ |
| 22.19 | Mic error handling still works | ✓ |

---

*Generated from the actual source files on Day 4 completion.*
