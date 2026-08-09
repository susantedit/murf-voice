# Implementation Plan

## Overview

Day 4 builds persistent, consent-based learner memory on top of the existing Vidya Day 1–3 stack. This plan adds:
- LangChain tool integration + async memory retrieval (no silence on lookup)
- RAG over a local knowledge base (FAISS + LangChain document loaders)
- "Forget me" tool
- Returning-caller greeting by name
- Chat transcript persistence and display fix
- Hero section CSS fix (navbar offset, mobile text order)
- Memory API URL environment variable and friendly offline error
- All existing completed tasks are preserved as-is

All tasks are additive or targeted fixes. No existing working functionality is removed.

---

## Tasks

### Phase 1 — Backend Memory Layer (Verification — already complete)

- [x] 1. Verify `backend/src/db/learner_repository.py`
  - [x] 1.1 All functions present: `get_learner`, `create_learner`, `update_learner`, `get_facts`, `upsert_fact`, `get_topics`, `add_topic`, `delete_learner`, `update_last_interaction`
  - [x] 1.2 Allowed-field validation raises `ValueError` for unknown fields
  - [x] 1.3 `delete_learner` cascades via `ON DELETE CASCADE`
  - [x] 1.4 All timestamps are UTC ISO 8601 strings
  - References: Req 1, Req 2

- [x] 2. Verify `backend/src/services/memory_service.py`
  - [x] 2.1 `get_learner_memory` returns correct shape
  - [x] 2.2 `save_learner_memory` creates learner if absent, routes correctly
  - [x] 2.3 `forget_learner_memory` calls `delete_learner`, returns success dict
  - [x] 2.4 All three wrapped in try/except with safe error returns
  - References: Req 3

- [x] 3. Verify `backend/.gitignore` includes `data/`, `*.db`, `*.sqlite`, `*.sqlite3`
  - References: Req 1, Req 18

- [x] 4. Verify `backend/tests/test_memory.py` passes
  - [x] 4.1–4.13 All memory repository tests pass with `uv run pytest`
  - References: Req 19

### Phase 2 — RAG Knowledge Base (New)

- [x] 5. Create `backend/data/knowledge/` directory with at least one sample document
  - [x] 5.1 Create `backend/data/knowledge/` directory (mkdir -p)
  - [x] 5.2 Add at least one sample document: a short `.txt` file with educational content (e.g. Class 10 Science topics overview) so the RAG pipeline has something to index
  - [x] 5.3 Add `backend/data/vector_store/` to `backend/.gitignore` so the FAISS index is never committed
  - References: Req 6.1, Req 6.8

- [x] 6. Create `backend/src/rag/__init__.py` and `backend/src/rag/loader.py`
  - [x] 6.1 Import `DirectoryLoader`, `TextLoader`, `PyPDFLoader` from `langchain_community.document_loaders`
  - [x] 6.2 Import `RecursiveCharacterTextSplitter` from `langchain.text_splitter`
  - [x] 6.3 Define `KNOWLEDGE_DIR = Path("backend/data/knowledge")` and `CHUNK_SIZE = 800`, `CHUNK_OVERLAP = 80`
  - [x] 6.4 Implement `load_documents() -> list[Document]`: if `KNOWLEDGE_DIR` does not exist, create it, log a warning, and return `[]`; otherwise load all `.pdf` and `.txt` files and split into chunks
  - [x] 6.5 Ensure `load_documents` never raises — catch all exceptions, log them, return `[]`
  - References: Req 6.1, Req 6.4, Req 6.7, Req 6.8

- [x] 7. Create `backend/src/rag/vector_store.py`
  - [x] 7.1 Import `FAISS` from `langchain_community.vectorstores` and `GoogleGenerativeAIEmbeddings` from `langchain_google_genai`
  - [x] 7.2 Define `VECTOR_STORE_PATH = Path("backend/data/vector_store")`
  - [x] 7.3 Implement `build_vector_store(docs: list[Document]) -> FAISS`: builds and saves FAISS index to `VECTOR_STORE_PATH`; returns the vectorstore
  - [x] 7.4 Implement `load_vector_store() -> FAISS | None`: loads existing FAISS index from disk; returns `None` if not found
  - [x] 7.5 Implement `load_or_build_vector_store() -> FAISS | None`: tries to load existing index first; if missing or empty, calls `load_documents()` and `build_vector_store()`; returns `None` if no documents available; wraps all in try/except
  - References: Req 6.2, Req 6.6, Req 6.7

- [x] 8. Create `backend/src/rag/retriever.py`
  - [x] 8.1 Define module-level `_vs: FAISS | None = None`
  - [x] 8.2 Implement `init_retriever()`: calls `load_or_build_vector_store()` and sets `_vs`; called once at agent startup
  - [x] 8.3 Define `@tool search_knowledge_base(query: str) -> str` using `@tool` from `langchain_core.tools`
  - [x] 8.4 Docstring for `search_knowledge_base` must explain: search curriculum knowledge base before answering factual questions; returns top-3 relevant chunks with source document names
  - [x] 8.5 Implementation: if `_vs is None` return `"Knowledge base not available."`; otherwise call `_vs.similarity_search(query, k=3)` and return formatted string with source metadata and page_content
  - [x] 8.6 Wrap similarity_search in try/except; on error log and return `"Knowledge base search failed."`
  - References: Req 6.2, Req 6.3, Req 6.4, Req 6.5, Req 6.7

- [x] 9. Add LangChain dependencies to `backend/pyproject.toml`
  - [x] 9.1 Add `langchain = "==0.3.25"` under `[project.dependencies]`
  - [x] 9.2 Add `langchain-community = "==0.3.24"`
  - [x] 9.3 Add `langchain-core = "==0.3.59"`
  - [x] 9.4 Add `langchain-google-genai = "==2.1.4"`
  - [x] 9.5 Add `faiss-cpu = "==1.11.0"`
  - [x] 9.6 Add `pypdf = "==5.6.0"`
  - [x] 9.7 Run `uv sync` to install and verify no dependency conflicts
  - References: Req 7.4

### Phase 3 — LangChain Agent + Async Memory Retrieval (New)

- [x] 10. Refactor `backend/src/agent.py` — LangChain tools + async retrieval
  - [x] 10.1 Import `tool` from `langchain_core.tools`; import `memory_service` from `src.services.memory_service`; import `init_retriever`, `search_knowledge_base` from `src.rag.retriever`
  - [x] 10.2 Define `get_learner_memory_tool`, `save_learner_memory_tool`, `forget_learner_memory_tool` as `@tool`-decorated functions with descriptive docstrings (see design.md)
  - [x] 10.3 The `user_id` is bound via closure (not passed by the LLM) for `get_learner_memory_tool`, `save_learner_memory_tool`, `forget_learner_memory_tool` — create factory functions like `make_memory_tools(user_id: str) -> list` that return closures with `user_id` pre-filled
  - [x] 10.4 Call `init_retriever()` once at agent startup (in the `prewarm` function or before `session.start`)
  - [x] 10.5 In `my_agent()`: after `ctx.connect()`, extract `user_id = ctx.room.local_participant.identity or f"anon-{ctx.room.name}"`
  - [x] 10.6 Start memory lookup concurrently using `asyncio.create_task(asyncio.to_thread(memory_service.get_learner_memory, user_id))` — store as `memory_task`; do NOT await before starting the session
  - [x] 10.7 Pass `memory_task` to the `Assistant`/agent class so `on_enter` can use it
  - [x] 10.8 In `on_enter`: speak the opening greeting immediately; then `await asyncio.wait_for(memory_task, timeout=2.0)`; if memory found and has a name, weave it into the next utterance naturally; on `asyncio.TimeoutError` proceed as new user
  - [x] 10.9 Wire all four tools (`get_learner_memory_tool`, `save_learner_memory_tool`, `forget_learner_memory_tool`, `search_knowledge_base`) into the agent's tool list
  - [x] 10.10 Verify `uv run ruff check .` and `uv run ruff format .` pass on `agent.py`
  - References: Req 4, Req 5, Req 7, Req 8

- [x] 11. Update `SYSTEM_PROMPT` in `backend/src/agent.py`
  - [x] 11.1 Append `MEMORY_INSTRUCTIONS` block: consent rules, allowed/forbidden save fields, forget flow, RAG usage guidance (see design.md for full text)
  - [x] 11.2 Add mandatory Devanagari script rule: all Hindi words must use Devanagari (U+0900–U+097F); Romanized Hindi is prohibited in Hindi responses
  - [x] 11.3 Add Hinglish rule: Hindi words → Devanagari, English technical terms → Latin; example: "बिल्कुल! Let's learn photosynthesis step by step."
  - [x] 11.4 Add returning-user greeting behavior: greet by name if memory found; never claim memory without tool confirmation
  - [x] 11.5 Add RAG citation instructions: cite source naturally when search_knowledge_base returns results; never fabricate citations
  - [x] 11.6 Add red-team rules: never save passwords/OTPs/government IDs; "just save everything" still requires per-fact consent
  - References: Req 4.2, Req 4.3, Req 4.11, Req 4.12, Req 4.13, Req 6.4, Req 6.5

### Phase 4 — Memory REST API (Already complete — verify)

- [x] 12. Verify `backend/src/api/memory_server.py`
  - [x] 12.1 `GET /memory/{user_id}` works correctly
  - [x] 12.2 `DELETE /memory/{user_id}` works correctly
  - [x] 12.3 CORS headers present on all responses
  - [x] 12.4 Listens on port 8888 (or `MEMORY_API_PORT` env var)
  - References: Req 9

### Phase 5 — User Identity and Token Flow (Already complete — verify)

- [x] 13. Verify `frontend/lib/user-identity.ts`
  - [x] 13.1 `getUserId()` reads from `localStorage['vidya_user_id']`; generates and stores UUID v4 if absent
  - [x] 13.2 SSR guard returns `'server-side'` placeholder when `window` is undefined
  - References: Req 8

- [x] 14. Verify `frontend/app/api/token/route.ts`
  - [x] 14.1 Accepts `userId` in POST body
  - [x] 14.2 Uses `userId` as `participantIdentity`
  - [x] 14.3 Falls back to random UUID if absent
  - References: Req 8

### Phase 6 — Frontend Fixes (New)

- [x] 15. Fix hero section CSS — navbar offset and mobile text order
  - [x] 15.1 In `frontend/app/layout.tsx`: add `<div className="h-[57px]" aria-hidden="true" />` immediately after `<NavBar />` and before `{children}` — this prevents fixed navbar from overlapping page content on all pages
  - [x] 15.2 In `frontend/components/app/welcome-view.tsx`: change the outer content wrapper from `py-20 lg:py-0` to `py-8 lg:py-0 lg:min-h-[calc(100svh-57px)]`
  - [x] 15.3 Change the left text column from `order-2 ... lg:order-1` to `order-1` (no conditional — text always first in DOM and visual order on mobile)
  - [x] 15.4 Change the right orb column from `order-1 ... lg:order-2` to `order-2 lg:order-2` (orb below text on mobile, right column on desktop)
  - [x] 15.5 Verify at 375px viewport: headline appears fully above the orb, no content hidden behind navbar
  - References: Req 12

- [x] 16. Fix chat transcript — auto-open on message and display fix
  - [x] 16.1 In `frontend/components/app/vidya-learning-room.tsx`: add `const prevMessageCount = useRef(messages.length)` above the return
  - [x] 16.2 Add a `useEffect` that watches `messages.length`: when it increases, call `setTranscriptOpen(true)` and update `prevMessageCount.current` — this auto-opens the transcript whenever a new message (typed or spoken) arrives
  - [x] 16.3 Verify that `AgentChatTranscript` renders messages from both `from.isLocal === true` (user, right-aligned or distinct color) and `from.isLocal === false` (Vidya, left-aligned) — check `agent-chat-transcript.tsx`; the `messageOrigin` logic already handles this but confirm it is working
  - [x] 16.4 Verify that after sending a typed message and receiving a reply, both the sent message and the reply are visible in the transcript panel without manually reopening it
  - References: Req 10

- [x] 17. Fix memory API URL — env var and friendly offline error
  - [x] 17.1 In `frontend/.env.local`: add line `NEXT_PUBLIC_MEMORY_API_URL=http://localhost:8888` (if not already present)
  - [x] 17.2 In `frontend/hooks/useLearnerMemory.ts`: in the catch block, detect "Failed to fetch" / "NetworkError" / "TypeError: Failed to fetch" and replace the raw error with: `"Memory service is offline. Make sure the memory server is running: uv run python -m src.api.memory_server"` 
  - [x] 17.3 In `frontend/app/memory/page.tsx`: when `error` contains "offline" or "Memory service", render a distinct offline state card with an info icon and the start command — not the red warning error card used for API errors
  - [x] 17.4 In `frontend/components/app/welcome-view.tsx`: the existing catch block already silently ignores memory errors on the welcome view — confirm this is still the case so a missing memory server does not break the welcome view
  - References: Req 11

### Phase 7 — Frontend Memory UI (Already complete — verify)

- [x] 18. Verify `frontend/hooks/useLearnerMemory.ts` hook
  - [x] 18.1 Fetches `GET /memory/{userId}` on mount; exposes `memory`, `loading`, `error`, `refresh()`, `deleteMemory()`
  - [x] 18.2 `deleteMemory()` calls `DELETE /memory/{userId}` then refreshes
  - References: Req 11

- [x] 19. Verify `frontend/components/app/memory-card.tsx`
  - [x] 19.1 Shows name, level, language, goal, topics, last interaction
  - [x] 19.2 "Forget Everything" button opens `ForgetConfirmModal`
  - [x] 19.3 Empty state and privacy notice visible
  - References: Req 13

- [x] 20. Verify `frontend/components/app/forget-confirm-modal.tsx`
  - [x] 20.1 Cancel and confirm buttons; success toast on confirm
  - References: Req 13

- [x] 21. Verify `frontend/app/memory/page.tsx`
  - [x] 21.1 Loads at `/memory`, shows skeleton while loading, shows MemoryCard when loaded, shows error+retry on failure
  - References: Req 13

### Phase 8 — Welcome View Day 4 Upgrade (Already complete — verify)

- [x] 22. Verify `frontend/components/app/welcome-view.tsx` Day 4 upgrade
  - [x] 22.1 Returning user: "Welcome back, [name] 👋" headline + "Continue where you left off" card
  - [x] 22.2 New user: "Learning that remembers you." headline
  - [x] 22.3 Six topic chips visible
  - [x] 22.4 Privacy section and memory badge present
  - [x] 22.5 Four feature badges row present
  - References: Req 14

### Phase 9 — AI Activity Panel and Session Summary (Already complete — verify)

- [x] 23. Verify `frontend/components/app/ai-activity-panel.tsx`
  - [x] 23.1 Shows real LiveKit-event-driven activity items (not fabricated)
  - [x] 23.2 Technical Activity drawer visible
  - References: Req 16

- [x] 24. Verify `frontend/components/app/session-summary.tsx`
  - [x] 24.1 "Great session! 🎉" heading
  - [x] 24.2 Topics discussed and memory saved sections
  - [x] 24.3 "Continue Learning" and "View My Memory" CTAs
  - References: Req 16

- [x] 25. Verify `frontend/components/app/view-controller.tsx`
  - [x] 25.1 Session disconnect → SessionSummary → WelcomeView flow works
  - [x] 25.2 AnimatePresence transitions intact
  - References: Req 16

### Phase 10 — Navigation and Layout (Already complete — verify)

- [x] 26. Verify `frontend/app/layout.tsx` navigation
  - [x] 26.1 `NavBar` renders with VIDYA brand, Learn / Memory / About links, Start Learning button
  - [x] 26.2 Mobile hamburger menu works
  - [x] 26.3 Active Memory link highlighted on `/memory`
  - References: Req 15

### Phase 11 — Quality and Verification

- [x] 27. Run backend syntax, lint, and tests
  - [x] 27.1 `uv run ruff check .` — fix all errors (pay special attention to new RAG files and updated agent.py)
  - [x] 27.2 `uv run ruff format .` — apply formatting
  - [x] 27.3 `uv run pytest` — all tests pass including `test_memory.py`
  - References: Req 17, Req 19

- [x] 28. Run frontend quality checks
  - [x] 28.1 `pnpm typecheck` (or `npx tsc --noEmit`) — fix all TypeScript errors
  - [x] 28.2 `pnpm lint` — fix all ESLint errors
  - [x] 28.3 `pnpm build` — production build succeeds with no errors
  - References: Req 17

- [x] 29. Manual verification checklist
  - [x] 29.1 Backend starts → `vidya.db` created; no import errors for LangChain or RAG modules
  - [x] 29.2 Memory server starts: `uv run python -m src.api.memory_server` → "Memory API listening on http://localhost:8888"
  - [x] 29.3 First call: say "Hi, my name is Aarav" → Vidya asks consent → "Yes" → name saved; NO silence before greeting
  - [x] 29.4 Restart backend → call again → Vidya says "Welcome back, Aarav!" within the first two utterances
  - [x] 29.5 Consent refused: Vidya asks → "No" → nothing saved → restart → Vidya doesn't know name
  - [x] 29.6 "Forget everything" → Vidya confirms → confirmed → next call treats as new user
  - [x] 29.7 Hindi speech → response contains Devanagari (नमस्ते visible in transcript, not "Namaste")
  - [x] 29.8 Ask a curriculum question → Vidya calls `search_knowledge_base` → answer references source document
  - [x] 29.9 Typed chat message → transcript panel auto-opens → message visible → Vidya's reply visible
  - [x] 29.10 Hero section at 375px: text headline visible above orb, no content hidden behind navbar
  - [x] 29.11 Memory page at `/memory`: when memory server is running shows data; when offline shows "Memory service is offline" message (not raw "Failed to fetch")
  - [x] 29.12 AI Activity panel shows real events; no fabricated items
  - [x] 29.13 Session summary appears after hang-up with CTAs
  - [x] 29.14 Navigation bar Memory link active/highlighted on `/memory`
  - References: Req 1–20

### Phase 12 — Documentation

- [x] 30. Verify `DAY_4_MEMORY.md` exists at workspace root
  - References: Req 20

<!-- - [ ] 31. Update `backend/README.md` with Day 4 section
  - [x] 31.1 Add "Memory Server" section: database path, start command (`uv run python -m src.api.memory_server`), port
  - [x] 31.2 Add "RAG Knowledge Base" section: how to add documents, how to rebuild the index, knowledge directory path
  - [x] 31.3 Add "LangChain Integration" note: which version, what it does in the pipeline
  - References: Req 20 -->

---

## Notes

- **LangChain version pinning** — use exact versions (`==`) to prevent surprises on `uv sync`. See Phase 2, task 9.
- **Async retrieval** — `asyncio.create_task` is the key pattern. Memory lookup starts before `session.start` completes; the 2-second `wait_for` timeout ensures no silent hang.
- **RAG with no documents** — `search_knowledge_base` gracefully returns "Knowledge base not available." if `_vs is None`. The agent continues without RAG.
- **FAISS vs Chroma** — FAISS is chosen for zero external dependencies. Chroma can be swapped in later if persistence is preferred over rebuild-on-start.
- **Chat transcript** — the auto-open on message is a 3-line `useEffect` in `vidya-learning-room.tsx`. All message rendering logic in `AgentChatTranscript` already works; the only fix is ensuring the panel is visible.
- **Navbar spacer** — the `h-[57px]` div in `layout.tsx` is the simplest correct fix. An alternative is `pt-[57px]` on `<body>`, but that interferes with the learning room's `fixed inset-0` overlay.
- **Memory API URL** — adding `NEXT_PUBLIC_MEMORY_API_URL` to `.env.local` is necessary; `NEXT_PUBLIC_` prefix is required for Next.js to expose it to browser code.
- **Devanagari** — All Hindi must be written in native Devanagari script everywhere in the codebase including this spec, prompts, comments, and test strings. "Namaste" in Romanized form must never appear in any Hindi-language output.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "2", "3", "4", "5"],
      "description": "Verify existing DB/service/tests; create knowledge directory — all independent"
    },
    {
      "wave": 2,
      "tasks": ["6", "7", "9", "15"],
      "description": "RAG loader, vector store; LangChain deps; hero CSS fix — parallel, no cross-deps"
    },
    {
      "wave": 3,
      "tasks": ["8", "16", "17"],
      "description": "RAG retriever tool (depends on 7); chat fix; memory URL fix — parallel"
    },
    {
      "wave": 4,
      "tasks": ["10", "11"],
      "description": "Agent refactor with LangChain tools + async retrieval (depends on 8, 2); system prompt update"
    },
    {
      "wave": 5,
      "tasks": ["12", "13", "14", "18", "19", "20", "21", "22", "23", "24", "25", "26"],
      "description": "Verify all already-complete tasks against new RAG/LangChain additions"
    },
    {
      "wave": 6,
      "tasks": ["27", "28"],
      "description": "Backend lint/test and frontend typecheck/lint/build — run after all implementation"
    },
    {
      "wave": 7,
      "tasks": ["29", "30", "31"],
      "description": "Manual verification, documentation — final tasks"
    }
  ]
}
```
