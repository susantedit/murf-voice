# Design — Vidya Day 5: Tool Activity UI + Exercise/Feedback Cards + Tests

## Overview

Day 5 completes what the backend already started. The `get_next_exercise` and `score_answer` tools are fully implemented and emit events on the `vidya-tools` LiveKit data channel. Day 5 wires those events into the frontend and adds automated tests.

**Already done (do not reimplement):** `agent.py` tools, `exercise_service.py`, `exercise_repository.py`, `exercises.json`, `_emit_tool_event()`, `EXERCISE_SERVICE_DISABLED` env var.

**Still needed:** `useToolEvents` hook, `ExerciseCard`, `FeedbackCard`, activity panel updates, learning room updates, `test_exercise_service.py`, `.env.example` docs, README Day 5 section, LinkedIn caption.

---

## Data Models

### ToolEvent (frontend TypeScript interface)

```typescript
interface ToolEvent {
  type: 'tool_start' | 'exercise_ready' | 'answer_scored' | 'tool_error';
  tool?: string;           // 'get_next_exercise' | 'score_answer'
  label?: string;          // human-readable description
  topic?: string;          // exercise topic (exercise_ready, answer_scored)
  difficulty?: string;     // 'easy' | 'medium' | 'hard' (exercise_ready)
  level?: string;          // 'Class N' (exercise_ready)
  question?: string;       // question text (exercise_ready)
  exercise_id?: string;    // unique exercise id (exercise_ready)
  result?: string;         // 'correct' | 'incorrect' | 'partially_correct' (answer_scored)
  score_label?: string;    // same as result (answer_scored)
  data_source?: string;    // 'local_curated' (exercise_ready)
  error?: string;          // error code (tool_error)
  receivedAt: Date;        // added client-side on receipt
}
```

### ExerciseCardProps (frontend React props)

```typescript
interface ExerciseCardProps {
  topic: string;
  level?: string;
  difficulty: string;    // 'easy' | 'medium' | 'hard'
  question: string;
  dataSource?: string;
  className?: string;
}
```

### FeedbackCardProps (frontend React props)

```typescript
interface FeedbackCardProps {
  result: 'correct' | 'incorrect' | 'partially_correct';
  explanation: string;
  hint?: string;
  nextStep?: string;
  topic?: string;
  className?: string;
}
```

### Backend event payload (already implemented — reference)

Published via `agent._emit_tool_event()` on the `vidya-tools` LiveKit data channel topic. See §Backend: Tool Event Payloads for full examples.

---

## Components and Interfaces

### `useToolEvents` hook

**Location:** `frontend/hooks/useToolEvents.ts`  
**Purpose:** Subscribe to the `vidya-tools` LiveKit data channel and surface tool events to components.  
**Returns:** `ToolEvent[]` — ordered oldest to newest; consumers reverse if needed.  
**Dependencies:** `useRoomContext` from `@livekit/components-react`, `livekit-client` for types.

### `ExerciseCard` component

**Location:** `frontend/components/app/exercise-card.tsx`  
**Purpose:** Display the current practice exercise on screen while Vidya speaks it.  
**Props:** `ExerciseCardProps`  
**Visibility:** Shown when `exercise_ready` event arrives; hidden when `answer_scored` or `tool_error(get_next_exercise)` arrives.

### `FeedbackCard` component

**Location:** `frontend/components/app/feedback-card.tsx`  
**Purpose:** Display the scoring result after the learner answers.  
**Props:** `FeedbackCardProps`  
**Visibility:** Shown when `answer_scored` event arrives; hidden when next `exercise_ready` arrives.

### Updated `AIActivityPanel` component

**Location:** `frontend/components/app/ai-activity-panel.tsx`  
**Changes:** Adds `useToolEvents()` call; maps new event types to activity items; adds `'tool'` and `'error'` EventKind values.

### Updated `VidyaLearningRoom` component

**Location:** `frontend/components/app/vidya-learning-room.tsx`  
**Changes:** Adds `useToolEvents()`, `activeExercise` state, `activeFeedback` state; renders `ExerciseCard`/`FeedbackCard` based on events.

---

## Architecture The `get_next_exercise` and `score_answer` tools are fully implemented and emit events on the `vidya-tools` LiveKit data channel. Day 5 wires those events into the frontend and adds automated tests.

### What is already done (do not reimplement)
- `backend/src/agent.py` — `get_next_exercise` and `score_answer` `@function_tool` methods
- `backend/src/services/exercise_service.py` — full service with memory integration, scoring, caching
- `backend/src/db/exercise_repository.py` — attempt tracking
- `backend/data/exercises/exercises.json` — 20 exercises, Classes 6–12
- `_emit_tool_event()` in `agent.py` — publishes `tool_start`, `exercise_ready`, `answer_scored`, `tool_error` events on `vidya-tools` topic
- `EXERCISE_SERVICE_DISABLED` env var — already implemented in `exercise_service.py`

### What is still needed
1. `frontend/hooks/useToolEvents.ts` — subscribe to `vidya-tools` data channel
2. `frontend/components/app/exercise-card.tsx` — show current exercise
3. `frontend/components/app/feedback-card.tsx` — show answer feedback
4. Update `frontend/components/app/ai-activity-panel.tsx` — consume tool events
5. Update `frontend/components/app/vidya-learning-room.tsx` — render exercise/feedback cards
6. `backend/tests/test_exercise_service.py` — automated tests
7. `backend/.env.example` — document `EXERCISE_SERVICE_DISABLED`
8. `README.md` — Day 5 section
9. `day5/linkedin.md` — LinkedIn caption

---

## Architecture

```
Voice (Learner)
    ↓
Deepgram STT (multilingual Nova-3)
    ↓
Groq LLM (llama-3.3-70b-versatile)
    ↓ (auto tool decision)
SQLite Memory (get_learner_memory)
    ↓
get_next_exercise() ──────────────► exercises.json (local dataset)
    ↓
LLM composes natural voice response
    ↓
Murf Falcon TTS (Anisha, Conversation)
    ↓
Learner hears exercise spoken naturally

Learner answers by voice
    ↓
score_answer(answer) ─────────────► exercises.json (answer lookup)
    ↓
LLM composes encouraging feedback
    ↓
Murf Falcon TTS
    ↓
Learner hears feedback

Parallel: LiveKit data channel (vidya-tools topic)
Backend _emit_tool_event() → Frontend useToolEvents hook → UI components
```

---

## Backend: Tool Event Payloads (already implemented — reference only)

The backend publishes these events on the `vidya-tools` LiveKit data channel topic. The frontend needs to consume them.

### `tool_start`
```json
{
  "type": "tool_start",
  "tool": "get_next_exercise",
  "label": "Fetching next exercise"
}
```
```json
{
  "type": "tool_start",
  "tool": "score_answer",
  "label": "Checking your answer"
}
```

### `exercise_ready`
```json
{
  "type": "exercise_ready",
  "tool": "get_next_exercise",
  "label": "Exercise ready",
  "topic": "algebra",
  "difficulty": "medium",
  "level": "Class 9",
  "question": "Solve for x: 2x − 3 = 11",
  "exercise_id": "alg-002",
  "data_source": "local_curated"
}
```

### `answer_scored`
```json
{
  "type": "answer_scored",
  "tool": "score_answer",
  "label": "Answer checked",
  "result": "correct",
  "topic": "algebra",
  "score_label": "correct"
}
```

### `tool_error`
```json
{
  "type": "tool_error",
  "tool": "get_next_exercise",
  "label": "Could not load exercise",
  "error": "service_unavailable"
}
```

---

## Frontend: New Hook — `useToolEvents`

**File:** `frontend/hooks/useToolEvents.ts`

```typescript
import { useEffect, useRef, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import type { DataPacket_Kind } from 'livekit-client';

export interface ToolEvent {
  type: 'tool_start' | 'exercise_ready' | 'answer_scored' | 'tool_error';
  tool?: string;
  label?: string;
  topic?: string;
  difficulty?: string;
  level?: string;
  question?: string;
  exercise_id?: string;
  result?: string;
  score_label?: string;
  data_source?: string;
  error?: string;
  receivedAt: Date;
}

/**
 * Subscribe to the `vidya-tools` LiveKit data channel topic.
 * Returns a live list of tool events for the current session.
 * 
 * Events arrive via room.on('dataReceived', ...) and are filtered by topic.
 * All events are appended in order — callers can slice/reverse as needed.
 */
export function useToolEvents(): ToolEvent[] {
  const room = useRoomContext();
  const [events, setEvents] = useState<ToolEvent[]>([]);

  useEffect(() => {
    if (!room) return;

    const handler = (
      payload: Uint8Array,
      _participant: unknown,
      _kind: DataPacket_Kind,
      topic?: string
    ) => {
      if (topic !== 'vidya-tools') return;
      try {
        const raw = JSON.parse(new TextDecoder().decode(payload)) as Omit<ToolEvent, 'receivedAt'>;
        const event: ToolEvent = { ...raw, receivedAt: new Date() };
        setEvents((prev) => [...prev, event]);
      } catch {
        // ignore malformed payloads
      }
    };

    room.on('dataReceived', handler);
    return () => {
      room.off('dataReceived', handler);
    };
  }, [room]);

  return events;
}
```

**Important:** `useRoomContext()` requires this hook to be called inside a LiveKit `<RoomContext>` provider (which the session already provides). Do NOT attempt to use it outside a connected session.

---

## Frontend: Exercise Card Component

**File:** `frontend/components/app/exercise-card.tsx`

This is a card shown inside the Learning Room when an exercise is active.

### Props

```typescript
interface ExerciseCardProps {
  topic: string;
  level?: string;
  difficulty: string;   // 'easy' | 'medium' | 'hard'
  question: string;
  dataSource?: string;
  className?: string;
}
```

### Visual design

```
┌──────────────────────────────────┐
│  [ALGEBRA]    [MEDIUM]           │
│  Class 9                         │
│                                  │
│  Practice Question               │
│                                  │
│  Solve for x: 2x − 3 = 11        │
│                                  │
│  📚 Local learning dataset       │
└──────────────────────────────────┘
```

- Topic displayed UPPERCASE in a coloured badge (indigo)
- Difficulty badge: `easy` → emerald, `medium` → amber, `hard` → red
- Question in larger text, readable
- "Practice Question" label above question text
- Data source watermark at bottom — only show if `dataSource === "local_curated"` → "From Vidya's local learning dataset"
- Card uses `glass/soft` styling consistent with the rest of the UI
- Animate in with `motion/react` — `initial={{ opacity: 0, y: 12 }}` → `animate={{ opacity: 1, y: 0 }}`
- Full width on mobile, constrained width on desktop

### Difficulty badge colours

| difficulty | background | text |
|---|---|---|
| easy | `bg-emerald-500/10` | `text-emerald-400` |
| medium | `bg-amber-500/10` | `text-amber-400` |
| hard | `bg-red-500/10` | `text-red-400` |
| (default) | `bg-primary/10` | `text-primary` |

---

## Frontend: Feedback Card Component

**File:** `frontend/components/app/feedback-card.tsx`

Shown after `score_answer` fires.

### Props

```typescript
interface FeedbackCardProps {
  result: 'correct' | 'incorrect' | 'partially_correct';
  explanation: string;
  hint?: string;
  nextStep?: string;
  topic?: string;
  className?: string;
}
```

### Visual design

```
┌──────────────────────────────────┐
│  ✓ Great work!         [CORRECT] │
│                                  │
│  You correctly identified the    │
│  answer as 7.                    │
│                                  │
│  💡 Hint: (if present)           │
│  Try similar questions to...     │
│                                  │
│  → Next: Practice another        │
│    algebra equation              │
└──────────────────────────────────┘
```

### Result styles

| result | icon | heading | border/background |
|---|---|---|---|
| `correct` | ✓ CheckCircle (emerald) | "Great work!" | `border-emerald-500/20 bg-emerald-500/5` |
| `partially_correct` | ~ CircleHalf (blue) | "You're close!" | `border-blue-500/20 bg-blue-500/5` |
| `incorrect` | ↺ ArrowCounterClockwise (amber) | "Let's review." | `border-amber-500/20 bg-amber-500/5` |

**Forbidden copy:** Do not use "wrong", "failed", "that's incorrect", "you got it wrong". Use "Let's review", "Not quite", "You're close", "Let's try again".

---

## Frontend: Update `AIActivityPanel`

**File:** `frontend/components/app/ai-activity-panel.tsx`

### Changes needed

1. Import and call `useToolEvents()` hook inside the component.
2. When new events arrive from `useToolEvents`, add them to the `items` array with appropriate `kind`.
3. Add new `EventKind` values: `'tool'` and `'error'`.
4. Add icon mappings for the new kinds.

### Kind mapping for tool events

| event.type | kind |
|---|---|
| `tool_start` (get_next_exercise) | `'tool'` |
| `tool_start` (score_answer) | `'tool'` |
| `exercise_ready` | `'tool'` |
| `answer_scored` | `'memory'` (reuse existing memory icon — brain) OR new `'evaluate'` kind |
| `tool_error` | `'error'` |

### New icons

```tsx
// tool kind
<BookOpen size={14} weight="bold" className={cn(base, 'text-primary')} />

// evaluate kind
<CheckCircle size={14} weight="duotone" className={cn(base, 'text-emerald-400')} />

// error kind
<Warning size={14} weight="bold" className={cn(base, 'text-red-400')} />
```

### Important

`useToolEvents` requires a `RoomContext`. The `AIActivityPanel` is already rendered inside the session, so this is safe. But it must only be called when the session is connected — guard with a try/catch or conditional.

---

## Frontend: Update `VidyaLearningRoom`

**File:** `frontend/components/app/vidya-learning-room.tsx`

### Changes needed

1. Import `useToolEvents` hook and `ExerciseCard`, `FeedbackCard` components.
2. Track current exercise state: `activeExercise: ExerciseCardProps | null`.
3. Track current feedback state: `activeFeedback: FeedbackCardProps | null`.
4. Subscribe to tool events:
   - On `exercise_ready`: set `activeExercise`, clear `activeFeedback`
   - On `answer_scored`: set `activeFeedback`, clear `activeExercise`
   - On `tool_error` for `get_next_exercise`: clear `activeExercise`
   - On session end: clear both
5. Render the cards below the orb section, above the inspiration chips.

### Layout

```
[Orb + state badge]
[sublabel]

[ExerciseCard OR FeedbackCard — AnimatePresence for transitions]

[Inspiration chips — hidden when a card is shown]

[Memory Journey card]
```

Use `<AnimatePresence mode="wait">` around the card area so transitions are clean.

---

## Backend: Test File

**File:** `backend/tests/test_exercise_service.py`

### Test structure

```python
"""
Tests for the exercise service (backend/src/services/exercise_service.py).

Uses isolated SQLite (same pattern as test_memory.py).
Does NOT require LiveKit credentials.
"""
import os
import uuid
import pytest
from contextlib import suppress

import src.db.database as _db_module
from src.db import database as database
from src.db.learner_repository import create_learner, delete_learner
from src.services.exercise_service import (
    get_next_exercise,
    score_answer,
    reset_cache,
)
from src.services.memory_service import save_learner_memory


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    temp_db = str(tmp_path / "test_vidya.db")
    monkeypatch.setattr(_db_module, "DB_PATH", temp_db)
    database.init_db()
    reset_cache()
    yield
    reset_cache()


@pytest.fixture
def learner_id():
    uid = str(uuid.uuid4())
    yield uid
    with suppress(Exception):
        delete_learner(uid)
```

### Required tests

| Test name | Scenario |
|---|---|
| `test_get_next_exercise_returns_exercise` | Basic call returns `success=True` with required fields |
| `test_get_next_exercise_uses_memory_topic` | Saves memory topic, call returns exercise matching that topic |
| `test_get_next_exercise_excludes_recent` | Call twice, assert different exercise_id (or same if only 1 in topic) |
| `test_get_next_exercise_service_disabled` | `monkeypatch.setenv("EXERCISE_SERVICE_DISABLED", "1")`, assert `success=False` |
| `test_get_next_exercise_empty_dataset` | Patch `_exercises_cache = []`, assert `success=False` |
| `test_score_answer_correct` | Exact answer for alg-001 ("7"), assert `result="correct"` |
| `test_score_answer_incorrect` | Wrong answer ("42"), assert `result="incorrect"` |
| `test_score_answer_partial` | Slightly off answer, assert `result` is `"partially_correct"` OR `"correct"` based on similarity |
| `test_score_answer_service_disabled` | `monkeypatch.setenv("EXERCISE_SERVICE_DISABLED", "1")`, assert `success=False` |
| `test_score_answer_records_attempt` | After scoring, check `exercise_attempts` table has a row |

---

## Backend: `.env.example` Addition

Add to `backend/.env.example`:

```bash
# -----------------------------------------------------------------------------
# Exercise service — Day 5 tool failure simulation
# Set to 1 to simulate the exercise service being unavailable.
# Vidya will respond gracefully: "I'm having trouble loading a new exercise."
# -----------------------------------------------------------------------------
# EXERCISE_SERVICE_DISABLED=1
```

---

## README: Day 5 Section

Add after the existing content, before the Deploy section:

```markdown
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
```

---

## File Change Summary

| File | Type | Change |
|---|---|---|
| `frontend/hooks/useToolEvents.ts` | New | Subscribe to `vidya-tools` data channel |
| `frontend/components/app/exercise-card.tsx` | New | Exercise display card |
| `frontend/components/app/feedback-card.tsx` | New | Answer feedback card |
| `frontend/components/app/ai-activity-panel.tsx` | Update | Consume tool events from `useToolEvents` |
| `frontend/components/app/vidya-learning-room.tsx` | Update | Render exercise/feedback cards based on tool events |
| `backend/tests/test_exercise_service.py` | New | Automated tests for exercise service |
| `backend/.env.example` | Update | Document `EXERCISE_SERVICE_DISABLED` |
| `README.md` | Update | Add Day 5 section |
| `day5/linkedin.md` | New | LinkedIn caption |

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| `vidya-tools` event arrives but JSON is malformed | Silently ignored — no crash, no error displayed |
| `exercise_ready` arrives but `question` field is missing | Exercise Card shows "(question not available)" as fallback |
| `answer_scored` arrives but `explanation` field is empty | Feedback Card shows "Answer evaluated." as fallback |
| `tool_error` for `get_next_exercise` | Activity panel shows error in red; no Exercise Card is shown |
| `useRoomContext()` is called outside a connected session | Hook returns null room; guard prevents subscription attempt |
| Backend never publishes to `vidya-tools` | Frontend falls back gracefully — activity panel shows agent-state events only |

---

## Security Considerations

1. Tool event JSON comes from the backend agent over the LiveKit data channel — it is trusted transport but the frontend still wraps JSON parsing in try/catch.
2. No user-identifiable data is included in tool events (no user_id, no email, no personal facts).
3. The exercise question text is rendered as plain text, not `dangerouslySetInnerHTML` — no XSS risk.
4. `EXERCISE_SERVICE_DISABLED` is a dev/test flag — document clearly that it must not be set in production.

---

## Testing Strategy

### Automated
- `backend/tests/test_exercise_service.py` — 10 unit tests covering all required scenarios

### Manual (demo checklist)
1. Connect to Vidya.
2. Say "मुझे आज practice के लिए कुछ दो।"
3. Confirm Activity panel shows "Fetching next exercise" → "Exercise ready" (real data channel events, not faked).
4. Exercise Card appears on screen with topic, difficulty, and question.
5. Answer the question.
6. Confirm Activity panel shows "Checking your answer" → "Answer checked".
7. Feedback Card appears with result and explanation.
8. Vidya speaks the feedback naturally in appropriate language register.
9. Set `EXERCISE_SERVICE_DISABLED=1`, repeat step 2 — no Exercise Card, graceful voice message.
10. Reconnect as a returning learner — Vidya uses saved level/topic to personalise the exercise.

### Frontend build verification
```bash
cd frontend
pnpm typecheck
pnpm lint
pnpm build
```

### Backend lint/test
```bash
cd backend
uv run ruff check .
uv run pytest
```

---

## Correctness Properties

### Property 1: Data Channel Fidelity
Events received on the `vidya-tools` topic arrive in the order they were published. The frontend never reorders or drops events (only ignores malformed JSON).
**Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6**

### Property 2: Exercise Card Exclusivity
At any given time, at most one of `activeExercise` or `activeFeedback` is non-null. They cannot both be shown simultaneously.
**Validates: Requirements 2.6, 3.8**

### Property 3: No Fabricated Tool Events
The activity panel only shows items derived from real data channel events or real LiveKit agent state transitions. It never fabricates an "Exercise selected" item without a corresponding `exercise_ready` data channel event.
**Validates: Requirements 4.3, 4.4**

### Property 4: Service Disabled Invariant
When `EXERCISE_SERVICE_DISABLED=1` is set, both `get_next_exercise` and `score_answer` return `{"success": false}` without raising an exception. The agent never speaks JSON or a stack trace — it uses the graceful fallback message from the system prompt.
**Validates: Requirements 6.2, 6.3, 9.7**

### Property 5: Test Isolation Invariant
Each test in `test_exercise_service.py` uses a unique UUID and a separate temp SQLite file. No test writes to the production `data/vidya.db`.
**Validates: Requirements 5.3, 5.4**

### Property 6: No Shaming Copy
The `FeedbackCard` component never renders the strings "wrong", "failed", or "that's incorrect" in any code path, including the `incorrect` result branch.
**Validates: Requirements 3.10**
