# Requirements Document

## Introduction

Day 4 transforms Vidya from a stateless voice agent into a persistent AI learning companion that remembers each learner's name, level, topics, and goals across sessions — with explicit consent at every step. The implementation builds on top of Day 1–3 functionality (LiveKit, Deepgram Nova-3 multilingual STT, Murf Falcon Anisha TTS, Gemini LLM, Day 2 guardrails, Day 3 frontend).

Day 4 scope includes:
- SQLite persistent memory with consent-based agent tools
- Async memory retrieval (no silence during lookup)
- RAG over a knowledge base (syllabus PDFs / crop advisories / scheme documents)
- "Forget me" tool
- Returning-caller greeting by name
- LangChain integration for agent orchestration and RAG
- Memory REST API (port 8888)
- Stable user identity threading from browser → backend
- Chat transcript persistence and display bug fix
- Hero section CSS fix (navbar offset, orb/text ordering)
- Memory page and `NEXT_PUBLIC_MEMORY_API_URL` env var wired correctly

---

## Requirements

See individual requirement sections below.

---

## Glossary

| Term | Definition |
|---|---|
| **user_id** | Stable anonymous UUID stored in browser localStorage, used as the database primary key |
| **learner** | A row in the `users` table identified by a `user_id` |
| **fact** | A key/value row in `learner_facts` (e.g. `current_level = Class 10`) |
| **topic** | A row in `learning_topics` (e.g. `Photosynthesis`) with a status (`studying`, `completed`, `needs_review`) |
| **consent** | Explicit spoken "yes" from the user before any `save_learner_memory` tool call |
| **memory tool** | A LangChain tool (decorated with `@tool`) on the agent that the LLM may invoke |
| **memory API** | Lightweight Python HTTP server on port 8888 exposing `GET /memory/{user_id}` and `DELETE /memory/{user_id}` |
| **RAG** | Retrieval-Augmented Generation — grounding agent answers in real documents via vector search |
| **knowledge base** | A directory of source documents (PDFs / text files) whose contents are indexed into a vector store for RAG |
| **AI Activity** | Human-readable frontend panel mapping real LiveKit session events to friendly status strings |
| **Devanagari** | Native Unicode script for Hindi — must be used for all Hindi output; Romanized Hindi is never acceptable |
| **Hinglish** | Natural code-mixing of Hindi (Devanagari) and English within a single sentence |
| **LangChain** | Python orchestration library used to compose the LLM pipeline, tool calling, and RAG retrieval |

---

## Requirement 1 — SQLite Persistent Memory Backend

**User story:** As Vidya, I need a persistent SQLite database so that learner memory survives complete backend restarts.

### Acceptance criteria

1. WHEN the backend starts THEN `backend/data/vidya.db` is created automatically if it does not exist (idempotent `init_db()` that is safe to call multiple times).
2. WHEN `init_db()` runs THEN it creates the following tables if missing: `users`, `learner_facts`, `learning_topics`, with the schema defined in the design — including foreign keys, UNIQUE constraints, and indexes `idx_facts_user` and `idx_topics_user`.
3. WHEN the backend is stopped and restarted THEN all previously saved learner rows, facts, and topics are still present.
4. WHEN any database query executes THEN it uses parameterized queries — string concatenation of user input into SQL is forbidden.
5. WHEN a database error occurs THEN a Python exception is raised internally but the agent never exposes SQL errors, tracebacks, or `DB_PATH` to the learner.
6. WHEN `backend/.gitignore` is checked THEN it contains entries for `data/`, `*.db`, `*.sqlite`, `*.sqlite3` so no user data is committed.
7. WHEN `get_connection()` is used THEN it uses a context manager that commits on success, rolls back on exception, and always closes the connection.

---

## Requirement 2 — Learner Repository Functions

**User story:** As a backend developer, I need a clean repository layer so that all database operations are isolated from the agent tool logic.

### Acceptance criteria

1. WHEN `get_learner(user_id)` is called with a known ID THEN it returns a dict with user fields; WHEN called with an unknown ID THEN it returns `None`.
2. WHEN `create_learner(user_id)` is called THEN it inserts a row with `created_at` and `updated_at` set to the current UTC ISO 8601 timestamp and returns the row as a dict.
3. WHEN `update_learner(user_id, **kwargs)` is called with an allowed field (`name`, `language_preference`, `current_level`, `learning_goal`) THEN it updates only that field plus `updated_at`; WHEN called with a disallowed field THEN it raises `ValueError`.
4. WHEN `upsert_fact(user_id, key, value)` is called with an allowed key THEN it inserts or replaces the fact, preserving the original `created_at`; WHEN called with a disallowed key THEN it raises `ValueError`.
5. WHEN `get_facts(user_id)` is called THEN it returns a list of `{key, value}` dicts for that user.
6. WHEN `add_topic(user_id, topic, status)` is called THEN it inserts the topic if new, or updates `status` and `last_discussed` if already present (idempotent).
7. WHEN `get_topics(user_id)` is called THEN it returns `[{topic, status, last_discussed}]` for that user.
8. WHEN `delete_learner(user_id)` is called THEN it deletes the user row and all cascading `learner_facts` and `learning_topics` rows; it returns `True` if a row was deleted, `False` if not found.
9. WHEN `update_last_interaction(user_id)` is called THEN it updates `last_interaction` and `updated_at` with the current UTC timestamp.

---

## Requirement 3 — Memory Service

**User story:** As a backend developer, I need a service layer so that agent tools call clean, error-safe functions rather than raw database operations.

### Acceptance criteria

1. WHEN `get_learner_memory(user_id)` is called THEN it returns a dict with fields: `found` (bool), `name`, `language_preference`, `current_level`, `learning_goal`, `topics` (list of topic strings), `last_interaction` — returning only existing values and omitting internal IDs.
2. WHEN `save_learner_memory(user_id, field, value)` is called THEN it creates the learner row if absent, then updates the correct column (for profile fields) or upserts a `learner_facts` row (for fact keys) or adds to `learning_topics` (for field `"topic"`).
3. WHEN `forget_learner_memory(user_id)` is called THEN it deletes the user and all associated rows in a single transaction; it returns `{"success": True}` or `{"success": False, "error": "..."}`.
4. WHEN any service function encounters a database exception THEN it catches it, logs the error server-side, and returns a safe error response rather than propagating the exception to the agent.

---

## Requirement 4 — Agent Memory Tools and Updated System Prompt

**User story:** As Vidya, I need memory tools so I can look up, save, and forget learner information during a voice session without ever storing data without consent.

### Acceptance criteria

1. WHEN the agent is defined THEN it has three tools: `get_learner_memory`, `save_learner_memory`, and `forget_learner_memory`.
2. WHEN a session starts THEN the agent calls `get_learner_memory` as one of its first actions to check for a returning learner — this lookup happens **asynchronously while the agent is speaking its greeting**, so there is no silence during the lookup.
3. IF memory is found THEN the agent greets the learner by name and naturally references the most relevant previous context (e.g. last topic) — it does not dump all stored fields into the greeting.
4. IF no memory is found THEN the agent greets normally — it does not say "database lookup returned nothing" or similar technical language.
5. WHEN the learner shares a piece of learning information (name, level, topic, goal) THEN the agent asks for consent before calling `save_learner_memory`.
6. WHEN the learner explicitly says no, don't save, or declines consent THEN the agent does NOT call `save_learner_memory` for that fact.
7. WHEN the learner says "forget everything" or asks Vidya to delete their memory THEN the agent asks for confirmation, and upon confirmation calls `forget_learner_memory`.
8. WHEN `forget_learner_memory` succeeds THEN the agent confirms naturally: "Done — I've cleared your saved learning information."
9. WHEN a memory tool fails THEN the agent continues the conversation naturally — no SQL errors or paths are spoken.
10. WHEN the agent uses remembered information THEN it uses it naturally in context, not by repeatedly prefixing sentences with "I remember that…".
11. WHEN the `SYSTEM_PROMPT` is updated THEN it includes explicit rules for: consent before saving, Devanagari-only Hindi output, tool-based memory access, returning-user greeting behavior, and what must NOT be stored (passwords, OTPs, PINs, government IDs).
12. WHEN the agent responds in Hindi THEN it MUST use Devanagari script (e.g. "नमस्ते Aarav!") — Romanized Hindi (e.g. "Namaste") in a Hindi response is a violation.
13. WHEN the agent responds in Hinglish THEN Hindi words use Devanagari and English technical terms use Latin script (e.g. "बिल्कुल! Let's learn photosynthesis step by step.").

---

## Requirement 5 — Async Memory Retrieval (No Silence During Lookup)

**User story:** As a learner, I want Vidya to start speaking immediately when I connect, not wait silently while it looks up my memory.

### Acceptance criteria

1. WHEN a session starts THEN the agent begins speaking a greeting immediately — it does NOT wait for the memory lookup to complete before saying anything.
2. WHEN the memory lookup completes while the agent is speaking THEN the agent naturally incorporates the result into its next turn (e.g. "Oh, I see you're [name] — welcome back!").
3. WHEN implemented THEN the memory lookup runs concurrently with the greeting using `asyncio.create_task` or equivalent so the LiveKit TTS pipeline is not blocked.
4. WHEN memory lookup takes longer than 2 seconds THEN the agent proceeds as if no memory exists for that session.

---

## Requirement 6 — RAG over Knowledge Base

**User story:** As a learner, I want Vidya's answers to be grounded in real educational documents rather than only the LLM's training data, so I get accurate and curriculum-aligned information.

### Acceptance criteria

1. WHEN the knowledge base is set up THEN it indexes documents from `backend/data/knowledge/` (PDF, TXT, or MD files — e.g. NCERT syllabus excerpts, crop advisories, scheme PDFs).
2. WHEN the agent answers a question THEN it first calls a `search_knowledge_base` tool to retrieve relevant document chunks before responding.
3. WHEN `search_knowledge_base(query)` is called THEN it returns the top-3 most relevant chunks from the vector store along with their source document names.
4. WHEN relevant chunks are found THEN the agent cites the source naturally (e.g. "According to the Class 10 Science syllabus...") — it does not fabricate citations.
5. WHEN no relevant chunks are found THEN the agent answers from its general knowledge and does NOT fabricate a citation.
6. WHEN the knowledge base is built THEN it uses LangChain's document loaders and a local vector store (FAISS or Chroma) — no external paid vector DB is required.
7. WHEN the knowledge base is empty or missing THEN the agent falls back to answering from general knowledge without crashing.
8. WHEN `backend/data/knowledge/` does not exist at startup THEN it is created automatically and a warning is logged.

---

## Requirement 7 — LangChain Agent Integration

**User story:** As a developer, I want the agent to use LangChain for tool orchestration and RAG so the codebase is maintainable and extensible.

### Acceptance criteria

1. WHEN the agent is refactored THEN it uses LangChain's tool-calling agent pattern to invoke `get_learner_memory`, `save_learner_memory`, `forget_learner_memory`, and `search_knowledge_base`.
2. WHEN LangChain tools are defined THEN they use `@tool` decorator from `langchain_core.tools` with proper docstrings that the LLM uses to decide when to call them.
3. WHEN the LangChain agent runs THEN it still operates inside the LiveKit Agents pipeline (STT → LLM with tools → TTS) — LangChain does not replace LiveKit, it augments the LLM step.
4. WHEN `langchain` and `langchain-community` are added as dependencies THEN they are pinned to exact versions in `pyproject.toml` and installed via `uv sync`.
5. WHEN LangChain tool errors occur THEN they are caught and logged — the agent continues the conversation gracefully.

---

## Requirement 8 — User Identity System

**User story:** As a learner, I need a stable anonymous user ID so that Vidya can recognize me across sessions without requiring login.

### Acceptance criteria

1. WHEN a user visits the frontend for the first time THEN `frontend/lib/user-identity.ts` generates a UUID v4 using `crypto.randomUUID()` and stores it in `localStorage` under the key `vidya_user_id`.
2. WHEN the user returns on any subsequent visit THEN the same UUID is read from `localStorage` — a new one is NOT generated.
3. WHEN `frontend/app/api/token/route.ts` handles a POST request THEN it accepts `userId` in the request body and uses it as the LiveKit participant identity.
4. WHEN `backend/src/agent.py` `my_agent()` runs THEN it reads the participant identity from the connected room and passes it as `user_id` to the agent.
5. WHEN the `user_id` cannot be determined THEN the agent falls back to a session-scoped ID and does not crash.
6. WHEN a `user_id` is stored THEN it is never a person's real name and is never used as a display identifier.

---

## Requirement 9 — Memory REST API

**User story:** As a frontend developer, I need an API endpoint so the Memory page can display and delete learner memory without requiring the voice session to be active.

### Acceptance criteria

1. WHEN `backend/src/api/memory_server.py` is running THEN it listens on port 8888.
2. WHEN `GET /memory/{user_id}` is called THEN it returns the learner's memory as JSON with a 200 status; if not found, it returns `{"found": false}`.
3. WHEN `DELETE /memory/{user_id}` is called THEN it deletes all learner data and returns `{"success": true}` with a 200 status.
4. WHEN either endpoint receives a malformed `user_id` THEN it returns a 400 response.
5. WHEN the API encounters a database error THEN it returns a 500 response with a generic error message — no internal paths or stack traces.
6. WHEN the memory server starts THEN it calls `init_db()` to ensure the database exists.
7. WHEN CORS headers are needed THEN the server sets `Access-Control-Allow-Origin: *` for local development.
8. WHEN the frontend `.env.local` is configured THEN it contains `NEXT_PUBLIC_MEMORY_API_URL=http://localhost:8888` so the hook resolves to the correct server.

---

## Requirement 10 — Chat Transcript Persistence and Display

**User story:** As a learner, I want typed chat messages and Vidya's replies to be visible in the transcript so I can follow the conversation.

### Acceptance criteria

1. WHEN a learner types a message in the chat input and sends it THEN the message appears immediately in the transcript panel with the user's alignment/indicator.
2. WHEN Vidya replies to a chat message THEN the reply appears in the transcript panel with Vidya's alignment/indicator.
3. WHEN the transcript panel is closed and the user sends a chat message THEN the transcript panel automatically opens so the user can see the exchange.
4. WHEN the session ends THEN the full conversation (voice transcript + typed chat) is captured and passed to the `SessionSummary` component.
5. WHEN the transcript contains Hindi text THEN Devanagari characters render correctly using the `Noto Sans Devanagari` font stack.
6. WHEN the transcript contains multiple messages THEN it auto-scrolls to the most recent message.
7. WHEN the `AgentChatTranscript` component receives messages THEN it renders both `from.isLocal === true` (user) and `from.isLocal === false` (agent) messages visually distinct.

---

## Requirement 11 — Frontend Memory API URL Configuration

**User story:** As a developer, I need the frontend memory API URL to be properly configured so the Memory page and welcome view do not show "Failed to fetch" errors.

### Acceptance criteria

1. WHEN `frontend/.env.local` is set up THEN it includes `NEXT_PUBLIC_MEMORY_API_URL=http://localhost:8888`.
2. WHEN `useLearnerMemory` hook initializes THEN it reads `process.env.NEXT_PUBLIC_MEMORY_API_URL` and falls back to `http://localhost:8888` if absent.
3. WHEN the memory server is not running THEN the frontend shows a clear, friendly error message: "Memory service is offline. Start the memory server to see your data." — not a raw "Failed to fetch" error.
4. WHEN the memory server is running THEN `GET /memory/{user_id}` returns valid JSON within 3 seconds.
5. WHEN the memory page loads and the API is reachable THEN data renders correctly with no console CORS errors.

---

## Requirement 12 — Hero Section CSS Fix

**User story:** As a visitor, I want the hero section to display correctly with the text not pushed too far up and the layout properly accounting for the fixed navbar height.

### Acceptance criteria

1. WHEN the page loads THEN the main content area starts below the fixed navbar (≥57px top offset) — no content is hidden behind the navbar.
2. WHEN viewed on mobile (≤768px) THEN the headline text appears above the orb image, not below it — `order-1` for text, `order-2` for orb in the column layout.
3. WHEN the connecting state is active THEN the "Getting your session ready..." headline and orb are both fully visible without clipping.
4. WHEN the page renders THEN vertical padding is consistent — `py-8` on mobile, `lg:min-h-[calc(100svh-57px)]` on desktop so the grid fills available space.
5. WHEN the navbar spacer is added in `layout.tsx` THEN it is `h-[57px]` to match the navbar height exactly, preventing content overlap on all pages.

---

## Requirement 13 — Frontend Memory UI

**User story:** As a learner, I want a dedicated Memory page so I can view, manage, and delete what Vidya remembers about me.

### Acceptance criteria

1. WHEN the user navigates to `/memory` THEN a Memory page renders with the title "My Learning Memory".
2. WHEN memory exists for the user's ID THEN the page shows: learner name, level, language preference, learning goal, topics (as chips), and last interaction.
3. WHEN memory is empty THEN the page shows an empty state with a "Start Learning" CTA.
4. WHEN the user clicks "Forget Everything" THEN a confirmation modal appears.
5. WHEN the user confirms deletion THEN the frontend calls `DELETE /memory/{user_id}` and shows a success toast.
6. WHEN the user cancels deletion THEN no data is deleted and the modal closes.
7. WHEN memory data is loading THEN a loading skeleton is shown.
8. WHEN the API call fails THEN a friendly error message is shown with a retry button.
9. WHEN the memory page renders THEN the privacy notice "Vidya only remembers learning information you choose to save." is visible.

---

## Requirement 14 — Welcome View Day 4 Upgrade

**User story:** As a returning learner, I want the homepage to recognize me and offer to continue my previous session.

### Acceptance criteria

1. WHEN a returning learner (memory found) visits the welcome view THEN a "Welcome back, [name] 👋" greeting replaces the generic headline.
2. WHEN a returning learner visits THEN a "Continue where you left off" card shows the last topic and a "Continue Learning" CTA.
3. WHEN a new user visits THEN the hero headline reads "Learning that remembers you."
4. WHEN the welcome view loads THEN four feature badges include: `🇮🇳 Hindi + English`, `🎙 Voice-first`, `🧠 Optional Memory`, `🔒 Privacy-focused`.
5. WHEN the welcome view loads THEN six topic chips are shown: Mathematics, Science, Fractions, Quick Quiz, Revision, Exam Practice.
6. WHEN a topic chip is clicked THEN the session starts with that topic pre-filled.
7. WHEN the welcome view loads THEN a Privacy section explains: Optional Memory, Private by design, Forget anytime.
8. WHEN a memory badge is shown THEN it reads "🧠 Memory: Your choice" and links to `/memory`.

---

## Requirement 15 — Navigation and Layout

**User story:** As a learner, I want a clear navigation bar so I can move between learning, memory, and about sections.

### Acceptance criteria

1. WHEN the app loads THEN the navigation bar shows: `VIDYA` (brand, left), nav links Learn / Memory / About (center/right), "Start Learning" CTA (right).
2. WHEN on mobile THEN the nav collapses to a hamburger menu (☰) showing the same links.
3. WHEN on the Memory page THEN the active Memory link is visually highlighted.
4. WHEN the nav "Start Learning" button is clicked THEN it initiates the session start flow.

---

## Requirement 16 — AI Activity Panel and Session Summary

**User story:** As a learner, I want to see what the AI is doing and receive a session summary when I hang up.

### Acceptance criteria

1. WHEN a session is active THEN the AI Activity panel shows human-readable events mapped from real LiveKit events (not fabricated).
2. WHEN a memory tool is called THEN the panel shows "🧠 Checking learning memory..." or "🧠 Memory saved".
3. WHEN a session ends THEN a "Great session! 🎉" summary screen is shown with topics discussed and any memory saved.
4. WHEN the summary shows THEN two CTAs are present: "Continue Learning" and "View My Memory".
5. WHEN the summary shows THEN it does NOT display fabricated durations, question counts, or percentages.

---

## Requirement 17 — Day 2 and Day 3 Regression

**User story:** As the project owner, I want all Day 1–3 functionality to remain intact after Day 4 changes.

### Acceptance criteria

1. WHEN the agent greets THEN it uses the established Vidya greeting.
2. WHEN the user speaks Hindi/Hinglish THEN Vidya responds in the same language register.
3. WHEN the user answers incorrectly THEN Vidya does not shame, provides a hint, and explains the correct answer.
4. WHEN the user asks about learning disabilities THEN Vidya refuses to diagnose and refers to a qualified professional.
5. WHEN the backend runs THEN `uv run ruff check .` passes with no errors.
6. WHEN Day 3 frontend components run THEN the hero, orb, connecting/listening/speaking/ended states, transcript, and microphone error all work as before.
7. WHEN `pnpm build` runs THEN it completes without TypeScript errors or ESLint errors.

---

## Requirement 18 — Security and Privacy Constraints

**User story:** As a learner, I want to know that Vidya will never store sensitive personal information or bypass my consent.

### Acceptance criteria

1. WHEN the learner asks Vidya to remember a password, OTP, PIN, payment info, or government ID THEN the agent refuses to save it.
2. WHEN the learner says "just save everything without asking" THEN the agent still asks for explicit consent before each save.
3. WHEN the learner asks "what do you know about me?" THEN the agent calls `get_learner_memory` and reports only what the tool returned — no invented memory.
4. WHEN `backend/data/vidya.db` exists THEN it is in `.gitignore` and not tracked by git.
5. WHEN the memory API handles a request THEN it validates `user_id` format before executing any database query.

---

## Requirement 19 — Backend Tests

**User story:** As a developer, I need automated tests for the memory layer so I can verify persistence and correctness.

### Acceptance criteria

1. WHEN `backend/tests/test_memory.py` runs THEN it covers: create learner, retrieve learner, update profile field, upsert fact, update existing fact, add topic, get topics, delete learner, cascade delete, persistence simulation.
2. WHEN any test creates a learner THEN it uses a unique test UUID and cleans up after itself.
3. WHEN `uv run pytest` runs THEN all memory tests pass with no errors.
4. WHEN a fact with a disallowed key is saved THEN the test confirms a `ValueError` is raised.

---

## Requirement 20 — Documentation

**User story:** As a developer or judge, I want clear documentation of the Day 4 architecture.

### Acceptance criteria

1. WHEN Day 4 is complete THEN `DAY_4_MEMORY.md` exists at the workspace root documenting: architecture, schema, tools, consent flow, user identity, RAG setup, API endpoints, LangChain integration, and run commands.
2. WHEN `backend/README.md` is read THEN it references Day 4 memory setup, RAG knowledge base, and run commands.
