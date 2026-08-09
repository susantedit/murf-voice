# Design — Vidya Day 4: Persistent Memory + RAG + LangChain + Frontend Fixes

## Overview

Day 4 extends Vidya with:
1. **Persistent learner memory** — SQLite + consent-based agent tools
2. **Async retrieval** — memory lookup runs concurrently with the opening greeting (no silence)
3. **"Forget me" tool** — wipes the learner's entire record on request
4. **RAG over a knowledge base** — LangChain document loaders + FAISS vector store over local PDFs/text files
5. **LangChain agent integration** — tool calling via `langchain_core.tools` inside the LiveKit pipeline
6. **Chat transcript persistence fix** — typed messages appear in the transcript; panel auto-opens on send
7. **Hero CSS fix** — navbar height offset in `layout.tsx`; text `order-1` on mobile
8. **Memory API URL env var** — `NEXT_PUBLIC_MEMORY_API_URL` wired in `.env.local`; friendly offline error in the hook

Nothing working in Day 1–3 is replaced. All changes are additive or targeted fixes.

---

## Architecture

```
Browser (Next.js)
     │
     │  localStorage: vidya_user_id (UUID v4)
     │
     ▼
frontend/app/api/token/route.ts
     │  POST { userId }
     │  → LiveKit token with participantIdentity = userId
     │
     ▼
LiveKit Cloud ← STT (Deepgram Nova-3 multi) → TTS (Murf Falcon Anisha)
     │
     │  Participant identity = userId
     ▼
backend/src/agent.py  ← my_agent()
     │  ctx.room.local_participant.identity = userId
     │
     ▼
LangChain AgentExecutor  ← Gemini LLM
     │
     │  Tools:
     │  @tool get_learner_memory(user_id)
     │  @tool save_learner_memory(user_id, field, value)
     │  @tool forget_learner_memory(user_id)
     │  @tool search_knowledge_base(query)
     │
     ▼
backend/src/services/memory_service.py
     │  safe wrappers with try/except
     │
     ▼
backend/src/db/learner_repository.py  →  backend/data/vidya.db (SQLite)

                          ┌─────────────────────────────────┐
                          │  RAG pipeline                   │
                          │  backend/src/rag/               │
                          │  ├── loader.py                  │
                          │  ├── vector_store.py            │
                          │  └── retriever.py               │
                          │                                 │
                          │  Documents: backend/data/       │
                          │    knowledge/*.pdf / *.txt      │
                          │  Index: backend/data/           │
                          │    vector_store/ (FAISS)        │
                          └─────────────────────────────────┘

Separate process: Memory REST API (port 8888)
     backend/src/api/memory_server.py
     GET  /memory/{user_id}  → JSON
     DELETE /memory/{user_id} → { success: true }
     Same SQLite via same repository

Frontend memory hooks:
     frontend/hooks/useLearnerMemory.ts
     → GET  NEXT_PUBLIC_MEMORY_API_URL/memory/{userId}
     → DELETE NEXT_PUBLIC_MEMORY_API_URL/memory/{userId}
```

---

## Backend File Structure

```
backend/
├── data/
│   ├── vidya.db                        ← SQLite (gitignored)
│   ├── knowledge/                      ← source documents for RAG
│   │   ├── ncert_class10_science.pdf   ← example
│   │   └── *.txt / *.pdf
│   └── vector_store/                   ← FAISS index (gitignored)
├── src/
│   ├── agent.py                        ← LangChain tools + async retrieval
│   ├── db/
│   │   ├── __init__.py
│   │   ├── database.py                 ← init_db, get_connection (EXISTS)
│   │   └── learner_repository.py       ← CRUD (EXISTS)
│   ├── services/
│   │   ├── __init__.py
│   │   └── memory_service.py           ← safe wrappers (EXISTS)
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── loader.py                   ← NEW: load + chunk documents
│   │   ├── vector_store.py             ← NEW: build/load FAISS index
│   │   └── retriever.py                ← NEW: search_knowledge_base tool
│   └── api/
│       ├── __init__.py
│       └── memory_server.py            ← REST API (EXISTS)
└── tests/
    ├── test_agent.py                   ← existing
    └── test_memory.py                  ← existing
```

---

## Data Models

### Database Schema (unchanged from existing)

```sql
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    name TEXT,
    language_preference TEXT,
    current_level TEXT,
    learning_goal TEXT,
    last_interaction TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learner_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, key),
    FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    status TEXT DEFAULT 'studying',
    last_discussed TEXT,
    FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_facts_user ON learner_facts(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_user ON learning_topics(user_id);
```

---

## Components and Interfaces

See the detailed component and interface definitions in the sections below.

---

## LangChain Integration Design

### Tool Definitions (`backend/src/agent.py`)

```python
from langchain_core.tools import tool

@tool
def get_learner_memory_tool(user_id: str) -> str:
    """
    Look up the learner's saved memory. Call this at the start of every session.
    Returns JSON with name, level, language, topics, and last interaction.
    If found=false, treat the learner as new.
    """
    import json
    result = memory_service.get_learner_memory(user_id)
    return json.dumps(result)

@tool
def save_learner_memory_tool(user_id: str, field: str, value: str) -> str:
    """
    Save one piece of learner information AFTER the user has given explicit consent.
    Allowed fields: name, language_preference, current_level, learning_goal, topic.
    Never call this without first asking the user for permission.
    """
    import json
    result = memory_service.save_learner_memory(user_id, field, value)
    return json.dumps(result)

@tool
def forget_learner_memory_tool(user_id: str) -> str:
    """
    Delete all of the learner's saved memory. Only call after the user confirms.
    Returns {"success": true} on success.
    """
    import json
    result = memory_service.forget_learner_memory(user_id)
    return json.dumps(result)
```

### Async Retrieval Design

Memory lookup must NOT block the greeting. Design:

```python
import asyncio

async def my_agent(ctx: JobContext):
    await ctx.connect()
    user_id = ctx.room.local_participant.identity or f"anon-{ctx.room.name}"

    # Start memory lookup in the background — do NOT await yet
    memory_task = asyncio.create_task(
        asyncio.to_thread(memory_service.get_learner_memory, user_id)
    )

    # Agent starts speaking greeting immediately
    session = AgentSession(...)
    await session.start(agent=VidyaAgent(user_id=user_id, memory_task=memory_task), ...)
```

Inside `VidyaAgent.on_enter()`:
```python
async def on_enter(self):
    # Kick off greeting immediately
    await self.say("नमस्ते! मैं Vidya हूँ — आपकी AI learning assistant।")
    # Check if memory arrived within 2s
    try:
        memory = await asyncio.wait_for(self._memory_task, timeout=2.0)
        if memory.get("found") and memory.get("name"):
            await self.say(f"Welcome back, {memory['name']}! ...")
    except asyncio.TimeoutError:
        pass  # proceed as new user
```

---

## RAG Pipeline Design

### Document Loading (`backend/src/rag/loader.py`)

```python
from langchain_community.document_loaders import PyPDFLoader, TextLoader, DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

KNOWLEDGE_DIR = Path("backend/data/knowledge")
CHUNK_SIZE = 800
CHUNK_OVERLAP = 80

def load_documents() -> list[Document]:
    """Load all .pdf and .txt files from the knowledge directory."""
    if not KNOWLEDGE_DIR.exists():
        KNOWLEDGE_DIR.mkdir(parents=True, exist_ok=True)
        return []
    # Load PDFs + text files, split into chunks
    ...
```

### Vector Store (`backend/src/rag/vector_store.py`)

```python
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings

VECTOR_STORE_PATH = Path("backend/data/vector_store")

def build_vector_store(docs: list[Document]) -> FAISS:
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    return FAISS.from_documents(docs, embeddings)

def load_or_build_vector_store() -> FAISS | None:
    """Load existing index or build from documents. Returns None if no docs."""
    ...
```

### Retriever Tool (`backend/src/rag/retriever.py`)

```python
from langchain_core.tools import tool

_vs: FAISS | None = None  # module-level singleton

def init_retriever():
    global _vs
    _vs = load_or_build_vector_store()

@tool
def search_knowledge_base(query: str) -> str:
    """
    Search the Vidya knowledge base for relevant educational content.
    Use this before answering factual questions about curriculum topics.
    Returns relevant text chunks and their source document names.
    """
    if _vs is None:
        return "Knowledge base not available."
    docs = _vs.similarity_search(query, k=3)
    return "\n\n".join(
        f"[{d.metadata.get('source', 'unknown')}]\n{d.page_content}"
        for d in docs
    )
```

### Dependencies to add to `pyproject.toml`

```toml
langchain = "==0.3.25"
langchain-community = "==0.3.24"
langchain-core = "==0.3.59"
langchain-google-genai = "==2.1.4"
faiss-cpu = "==1.11.0"
pypdf = "==5.6.0"
```

---

## Frontend Fixes Design

### Fix 1: Hero CSS — Navbar Offset

**Problem:** Fixed navbar overlaps page content; on mobile the orb renders above the text.

**Fix in `frontend/app/layout.tsx`:**
```tsx
<NavBar />
{/* Spacer — matches navbar height so fixed nav does not overlap content */}
<div className="h-[57px]" aria-hidden="true" />
{children}
```

**Fix in `frontend/components/app/welcome-view.tsx`:**
```tsx
{/* Was: py-20 lg:py-0  order-2 text / order-1 orb */}
{/* Now: py-8 lg:min-h-[calc(100svh-57px)]  order-1 text / order-2 orb */}
<div className="relative z-10 flex w-full items-center justify-center px-4 py-8 lg:py-0 lg:min-h-[calc(100svh-57px)]">
  ...
  {/* Text column — order-1 on all breakpoints so it appears above orb on mobile */}
  <div className="order-1 flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
  ...
  {/* Orb column — order-2 on mobile, pushed to right on desktop */}
  <div className="order-2 flex items-center justify-center lg:order-2">
```

### Fix 2: Chat Transcript — Messages Disappearing

**Problem:** Typed chat messages are sent via `useChat().send()` and appear in `useSessionMessages()` messages array, but the transcript panel is closed by default so users never see them.

**Fix in `frontend/components/app/vidya-learning-room.tsx`:**
```tsx
// Auto-open the transcript panel whenever a new message arrives
const prevMessageCount = useRef(messages.length);
useEffect(() => {
  if (messages.length > prevMessageCount.current) {
    setTranscriptOpen(true);  // auto-open when new message arrives
    prevMessageCount.current = messages.length;
  }
}, [messages.length]);
```

Also pass `messages` to the desktop transcript and ensure `AgentChatTranscript` renders all messages including `from.isLocal === true`.

### Fix 3: Memory "Failed to Fetch" — Friendly Error

**Problem:** `useLearnerMemory` shows raw "Failed to fetch" when the memory server at port 8888 isn't running.

**Fix 1 — `frontend/.env.local`:** Add the variable so it is explicit:
```
NEXT_PUBLIC_MEMORY_API_URL=http://localhost:8888
```

**Fix 2 — `frontend/hooks/useLearnerMemory.ts`:** Improve the error message:
```typescript
} catch (err) {
  const msg = err instanceof Error ? err.message : '';
  const isOffline = msg.includes('Failed to fetch') || msg.includes('NetworkError');
  setError(
    isOffline
      ? 'Memory service is offline. Make sure the memory server is running (uv run python -m src.api.memory_server).'
      : msg || 'Failed to load learning memory.'
  );
}
```

**Fix 3 — Memory page and welcome view:** Show the offline message gracefully instead of an error state that looks like a crash.

---

## Updated System Prompt Memory Section

```python
MEMORY_INSTRUCTIONS = """
## MEMORY

You have four tools: get_learner_memory, save_learner_memory, forget_learner_memory, search_knowledge_base.

SESSION START:
Call get_learner_memory at the start of every session (it runs while you are greeting).
If memory is found: greet them by name and reference their last topic naturally.
  Example: "नमस्ते Aarav! Last time we were working on photosynthesis — shall we continue?"
If not found: greet normally as a new learner.

CONSENT RULES (mandatory):
- Before calling save_learner_memory for ANY fact, ask explicit permission.
- If the learner says no, declines, or is silent: do NOT call save_learner_memory.
- Silence is NOT consent. Ambiguous responses require clarification.

WHAT CAN BE SAVED (ONLY):
name, language_preference, current_level, learning_goal, topic

WHAT MUST NEVER BE SAVED:
Passwords, OTPs, PINs, payment info, government IDs, health info, API keys

FORGET:
- Ask for confirmation before calling forget_learner_memory.
- On confirmation: call it, then say "Done — I've cleared your saved learning information."

RAG:
- For curriculum questions, call search_knowledge_base first.
- Cite sources naturally: "According to the Class 10 Science syllabus..."
- If no relevant chunks are found: answer from general knowledge. Never fabricate citations.

SCRIPT RULES (mandatory):
- Hindi responses MUST use Devanagari. Example: "नमस्ते! आज क्या सीखना है?"
- Romanized Hindi (Namaste, kya, hai) in a Hindi response is PROHIBITED.
- Hinglish: Hindi words → Devanagari, English terms → Latin.
  Example: "बिल्कुल! Let's learn photosynthesis step by step."

MEMORY USE:
- Use remembered facts naturally in conversation.
- Do NOT repeatedly say "I remember that...".
- If memory retrieval fails: "I couldn't access your saved information right now, but we can still continue."
- Never claim to remember something unless get_learner_memory confirms it.
"""
```

---

## Frontend Component Changes Summary

| File | Change | Requirement |
|---|---|---|
| `frontend/app/layout.tsx` | Add `h-[57px]` spacer div after `<NavBar />` | Req 12 |
| `frontend/components/app/welcome-view.tsx` | `py-8 lg:min-h-...`; text `order-1`, orb `order-2` | Req 12 |
| `frontend/components/app/vidya-learning-room.tsx` | Auto-open transcript on new message; pass messages correctly | Req 10 |
| `frontend/hooks/useLearnerMemory.ts` | Friendly offline error message | Req 11 |
| `frontend/.env.local` | Add `NEXT_PUBLIC_MEMORY_API_URL=http://localhost:8888` | Req 11 |
| `frontend/app/memory/page.tsx` | Show offline state gracefully | Req 11 |

---

## Security Considerations

1. **SQL injection** — all queries use parameterized `?` placeholders.
2. **Sensitive data** — system prompt and tool docstrings both enforce rejection.
3. **User ID** — UUID v4, anonymous, never a real name.
4. **gitignore** — `*.db`, `data/`, `vector_store/` are gitignored.
5. **Memory API** — validates `user_id` length and format before any DB query.
6. **RAG documents** — only local files from `backend/data/knowledge/` are indexed; no external URLs are fetched at runtime.

---

## Error Handling

| Failure scenario | Backend behavior | User-facing behavior |
|---|---|---|
| Memory lookup takes >2s | `asyncio.wait_for` timeout, proceed as new user | No silence — greeting continues normally |
| SQLite error during session | Log, return `{found: false}` | "I couldn't access your saved information right now, but we can still continue." |
| `save_learner_memory` DB error | Log, return `{success: false}` | Agent informs learner the save didn't work |
| `forget_learner_memory` DB error | Log, return `{success: false}` | Agent asks learner to try again |
| Memory REST API offline | Frontend catches fetch error | "Memory service is offline. Start the memory server." |
| RAG knowledge base empty | `search_knowledge_base` returns "Knowledge base not available." | Agent answers from general knowledge |
| FAISS index build fails | Log, `_vs` stays `None` | Agent continues without RAG |
| `user_id` missing | Fall back to `anon-{room.name}` | Session continues, memory won't persist |
| Invalid `user_id` to memory API | Return 400 | Frontend shows generic error |

---

## Correctness Properties

### Property 1: Consent Invariant
`save_learner_memory` is never called unless the immediately preceding user turn contained an explicit affirmative response to Vidya's consent question.
**Validates: Requirements 4.5, 4.6, 18.2**

### Property 2: Persistence Invariant
After `create_learner` + `update_learner`, closing and reopening the SQLite connection and calling `get_learner(user_id)` returns the same data.
**Validates: Requirements 1.3, 19.1**

### Property 3: Cascade Delete Invariant
After `delete_learner(user_id)`, `get_facts(user_id)` and `get_topics(user_id)` both return empty lists.
**Validates: Requirements 2.8, 3.3**

### Property 4: Allowed Fields Invariant
`save_learner_memory` and `upsert_fact` only store data for fields in `{name, language_preference, current_level, learning_goal, topic}`. Any other field raises `ValueError` before SQL executes.
**Validates: Requirements 2.4, 3.2, 18.1**

### Property 5: Devanagari Invariant
For any Hindi-language response, all Hindi words are in Unicode Devanagari range (U+0900–U+097F). Romanized Hindi is never used as a substitute.
**Validates: Requirements 4.12, 10.5**

### Property 6: No Silence Invariant
Time from session connect to first agent utterance is ≤ 1 second regardless of memory lookup duration.
**Validates: Requirements 5.1, 5.3**

---

## Testing Strategy

### Unit tests (`test_memory.py`)
All repository functions tested in isolation using a temporary SQLite database. Each test uses a unique UUID and cleans up after itself.

### Integration tests
Session identity flow tested end-to-end: browser UUID → token route → participant identity → agent `user_id` → database lookup. RAG pipeline tested with a sample document to confirm `search_knowledge_base` returns a non-empty result.

### Manual verification
Full checklist in tasks.md Phase 11, task 29.

### Async retrieval test
Verify that time from `ctx.connect()` to first TTS utterance is < 1 second by logging timestamps in `on_enter`.

### Property-based approach
The six correctness properties above can be codified using Python's `hypothesis` library if desired for regression testing.

---

## Task Dependency Graph

```
Phase 1 (DB) ──────────────────────────────────────────────
  1 (learner_repository verify) → 2 (memory_service)
  2 → 3 (memory tests)
  2 → 4 (agent tools - LangChain)
  2 → 5 (memory server)

Phase 2 (RAG) ──────────────────────────────────────────────
  6 (rag/loader.py) → 7 (rag/vector_store.py) → 8 (rag/retriever.py tool)
  8 → 4 (agent gets search_knowledge_base tool)

Phase 3 (Agent) ─────────────────────────────────────────────
  4 (async retrieval + LangChain tools + system prompt update)
  depends on: 2 (memory_service), 8 (rag retriever)

Phase 4 (Identity + API) ────────────────────────────────────
  9 (user-identity.ts) → 10 (token route)
  5 (memory_server) + 9 → 11 (useLearnerMemory hook)
  11 → 12 (memory-card) → 13 (forget-modal) → 14 (memory page)

Phase 5 (Frontend fixes) ────────────────────────────────────
  15 (hero CSS fix: layout.tsx spacer + welcome-view order)
  16 (chat transcript auto-open fix)
  17 (memory API URL .env.local + friendly offline error)

Phase 6 (Welcome + Summary + Nav) ───────────────────────────
  11 → 18 (welcome-view Day 4 upgrade)
  19 (ai-activity-panel) → 20 (session-summary) → 21 (view-controller)
  21 → 22 (nav layout.tsx)

Phase 7 (QA) ────────────────────────────────────────────────
  23 (backend lint/test)
  24 (frontend typecheck/lint/build)
  25 (manual verification)
  26 (documentation)
```
