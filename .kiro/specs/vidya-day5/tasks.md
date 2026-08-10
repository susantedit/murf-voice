# Implementation Plan

## Overview

Day 5 wires the already-implemented backend tools into a complete frontend experience and adds automated tests. The backend tools (`get_next_exercise`, `score_answer`, `_emit_tool_event`) are fully implemented. This plan covers only the remaining gap work.

**Do not reimplement anything that already works.** Reuse existing architecture.

---

## Tasks

### Phase 1 — Frontend Hook: Consume `vidya-tools` Data Channel

- [x] 1. Create `frontend/hooks/useToolEvents.ts`
  - [x] 1.1 Define `ToolEvent` interface with fields: `type`, `tool`, `label`, `topic`, `difficulty`, `level`, `question`, `exercise_id`, `result`, `score_label`, `data_source`, `error`, `receivedAt: Date`
  - [x] 1.2 Implement `useToolEvents()` hook: call `useRoomContext()` from `@livekit/components-react`; register a `dataReceived` listener on the room; filter by `topic === 'vidya-tools'`; decode `Uint8Array` payload with `TextDecoder`; parse JSON; append to state array with `receivedAt: new Date()`
  - [x] 1.3 Return the events array (oldest first, callers can reverse)
  - [x] 1.4 Clean up listener in `useEffect` return function to prevent memory leaks
  - [x] 1.5 Wrap JSON.parse in try/catch — silently ignore malformed payloads
  - [x] 1.6 Guard against null room: if `!room` return early without registering handler
  - References: Req 1, Design §useToolEvents

### Phase 2 — Frontend: Exercise Card Component

- [x] 2. Create `frontend/components/app/exercise-card.tsx`
  - [x] 2.1 Define `ExerciseCardProps`: `topic: string`, `level?: string`, `difficulty: string`, `question: string`, `dataSource?: string`, `className?: string`
  - [x] 2.2 Render topic in an uppercase indigo badge
  - [x] 2.3 Render difficulty badge with colour coding: `easy` → emerald, `medium` → amber, `hard` → red, default → primary
  - [x] 2.4 Render `level` if present (e.g. "Class 9") below the badges
  - [x] 2.5 Render "Practice Question" label above the question text
  - [x] 2.6 Render `question` in a readable font size (text-base or text-lg)
  - [x] 2.7 If `dataSource === "local_curated"` render a muted watermark: "From Vidya's local learning dataset"
  - [x] 2.8 Apply card styling consistent with existing UI: `border-border/40 bg-background/60 rounded-2xl border p-5 backdrop-blur-sm`
  - [x] 2.9 Wrap in `motion.div` from `motion/react` with `initial={{ opacity: 0, y: 12 }}` → `animate={{ opacity: 1, y: 0 }}` transition
  - References: Req 2, Design §ExerciseCard

### Phase 3 — Frontend: Feedback Card Component

- [x] 3. Create `frontend/components/app/feedback-card.tsx`
  - [x] 3.1 Define `FeedbackCardProps`: `result: 'correct' | 'incorrect' | 'partially_correct'`, `explanation: string`, `hint?: string`, `nextStep?: string`, `topic?: string`, `className?: string`
  - [x] 3.2 Render result-specific icon and heading:
        - `correct` → CheckCircle emerald, "Great work!"
        - `partially_correct` → CircleHalf blue (or similar), "You're close!"
        - `incorrect` → ArrowCounterClockwise amber, "Let's review."
  - [x] 3.3 Render `explanation` text (with fallback "Answer evaluated." if empty)
  - [x] 3.4 If `hint` is present, render a "💡 Hint" section with the hint text
  - [x] 3.5 If `nextStep` is present, render a "→ Next" section
  - [x] 3.6 Apply result-specific border/background:
        - `correct` → `border-emerald-500/20 bg-emerald-500/5`
        - `partially_correct` → `border-blue-500/20 bg-blue-500/5`
        - `incorrect` → `border-amber-500/20 bg-amber-500/5`
  - [x] 3.7 NEVER use the words "wrong", "failed", "that's incorrect" anywhere in the component copy
  - [x] 3.8 Wrap in `motion.div` with same entry animation as ExerciseCard
  - References: Req 3, Design §FeedbackCard

### Phase 4 — Frontend: Update `AIActivityPanel`

- [x] 4. Update `frontend/components/app/ai-activity-panel.tsx`
  - [x] 4.1 Import `useToolEvents` hook from `@/hooks/useToolEvents`
  - [x] 4.2 Add new `EventKind` values: `'tool'` and `'error'`
  - [x] 4.3 Add `KindIcon` cases: `tool` → `BookOpen` (primary colour), `error` → `Warning` (red-400)
  - [x] 4.4 Call `useToolEvents()` inside the component
  - [x] 4.5 Add a `useEffect` that watches the `toolEvents` array length; when it grows, create a new `ActivityItem` from the latest event:
        - Map `tool_start` → label from event, kind `'tool'`
        - Map `exercise_ready` → `"✓ Exercise selected — ${topic}"`, kind `'tool'`
        - Map `answer_scored` → `"✓ Answer evaluated — ${result}"`, kind `'tool'` (or create `'evaluate'`)
        - Map `tool_error` → event label, kind `'error'`
  - [x] 4.6 Prepend the new item to the `items` array (newest first, same pattern as existing items)
  - [x] 4.7 In the Technical Details section, include the raw `type` + `tool` from tool events in the raw events list
  - [x] 4.8 Verify existing agent-state items still appear and interleave correctly with tool items
  - References: Req 4, Design §AIActivityPanel

### Phase 5 — Frontend: Update `VidyaLearningRoom`

- [x] 5. Update `frontend/components/app/vidya-learning-room.tsx`
  - [x] 5.1 Import `useToolEvents` from `@/hooks/useToolEvents`, `ExerciseCard` from `@/components/app/exercise-card`, `FeedbackCard` from `@/components/app/feedback-card`
  - [x] 5.2 Add state: `activeExercise: { topic: string; level?: string; difficulty: string; question: string; dataSource?: string } | null` — initialise to `null`
  - [x] 5.3 Add state: `activeFeedback: { result: 'correct' | 'incorrect' | 'partially_correct'; explanation: string; hint?: string; nextStep?: string; topic?: string } | null` — initialise to `null`
  - [x] 5.4 Call `useToolEvents()` and add a `useEffect` that watches the events array:
        - On new `exercise_ready` event: set `activeExercise` from event fields, clear `activeFeedback`
        - On new `answer_scored` event: `activeFeedback` needs `result`/`explanation` — note that `answer_scored` only contains `result` and `topic` (not `explanation`). For now, map `result` to a default explanation string (e.g. correct → "Well done!", partially_correct → "You're close!", incorrect → "Let's review the concept.") since `explanation` is not in the tool event payload. Set `activeExercise` to null.
        - On `tool_error` for `get_next_exercise`: clear `activeExercise`
  - [x] 5.5 Render inside the Learning Room center column, below the orb section and above the inspiration chips:
        ```tsx
        <div className="w-full max-w-sm mx-auto px-4 pb-4">
          <AnimatePresence mode="wait">
            {activeExercise && (
              <ExerciseCard key="exercise" {...activeExercise} />
            )}
            {activeFeedback && (
              <FeedbackCard key="feedback" {...activeFeedback} />
            )}
          </AnimatePresence>
        </div>
        ```
  - [x] 5.6 Hide the inspiration chips when either card is active: wrap them in `{!activeExercise && !activeFeedback && (...)}` 
  - [x] 5.7 On session disconnect/end: clear both states (add to cleanup logic)
  - [x] 5.8 Verify no TypeScript errors — all event fields must be properly typed
  - References: Req 1, 2, 3, Design §VidyaLearningRoom

### Phase 6 — Backend: Exercise Service Tests

- [x] 6. Create `backend/tests/test_exercise_service.py`
  - [x] 6.1 Add autouse fixture `isolated_db` (same pattern as `test_memory.py`): monkeypatch `DB_PATH` to a temp file, call `database.init_db()`, call `reset_cache()` before and after
  - [x] 6.2 Add `learner_id` fixture: yield a new `uuid.uuid4()` string, teardown calls `delete_learner` with suppress
  - [x] 6.3 Write `test_get_next_exercise_returns_exercise(learner_id)`:
        - Call `get_next_exercise(learner_id)`
        - Assert `result["success"] is True`
        - Assert all required fields present: `exercise_id`, `topic`, `level`, `difficulty`, `question`, `hint`, `data_source`
  - [x] 6.4 Write `test_get_next_exercise_uses_memory_topic(learner_id)`:
        - `create_learner(learner_id)` and `save_learner_memory(learner_id, "topic", "algebra")`
        - Call `get_next_exercise(learner_id)` with no args
        - Assert `result["topic"] == "algebra"` OR assert `matched_from_memory is True`
  - [x] 6.5 Write `test_get_next_exercise_excludes_recent(learner_id)`:
        - Call `get_next_exercise(learner_id, topic="algebra")` twice
        - If two algebra exercises exist, assert IDs differ; if only one, assert the same exercise is returned (fallback is acceptable — assert `success=True`)
  - [x] 6.6 Write `test_get_next_exercise_service_disabled(monkeypatch, learner_id)`:
        - `monkeypatch.setenv("EXERCISE_SERVICE_DISABLED", "1")`
        - Call `get_next_exercise(learner_id)`
        - Assert `result["success"] is False`
        - Assert `result["error"] == "service_unavailable"`
  - [x] 6.7 Write `test_get_next_exercise_empty_dataset(monkeypatch, learner_id)`:
        - `monkeypatch.setattr(exercise_service_module, "_exercises_cache", [])`
        - Also set `_dataset_meta` to a non-None value so it doesn't reload
        - Call `get_next_exercise(learner_id)`
        - Assert `result["success"] is False`
  - [x] 6.8 Write `test_score_answer_correct(learner_id)`:
        - Call `get_next_exercise(learner_id, topic="algebra")` to get an exercise
        - Call `score_answer(learner_id, result["exercise_id"], result["_answer"], result)`
        - Assert `score["success"] is True`
        - Assert `score["result"] == "correct"`
  - [x] 6.9 Write `test_score_answer_incorrect(learner_id)`:
        - Get an exercise (any topic)
        - Call `score_answer(learner_id, exercise_id, "xyzzy_wrong_answer_42", exercise)`
        - Assert `score["result"] == "incorrect"`
  - [x] 6.10 Write `test_score_answer_service_disabled(monkeypatch, learner_id)`:
        - `monkeypatch.setenv("EXERCISE_SERVICE_DISABLED", "1")`
        - Call `score_answer(learner_id, "alg-001", "7", None)`
        - Assert `result["success"] is False`
  - [x] 6.11 Write `test_score_answer_records_attempt(learner_id)`:
        - `create_learner(learner_id)` (needed for FK constraint)
        - Get an exercise, score it
        - Query `exercise_attempts` table directly: assert at least 1 row for `user_id = learner_id`
  - [x] 6.12 Run `uv run pytest backend/tests/test_exercise_service.py -v` and fix all failures
  - References: Req 5

### Phase 7 — Backend: Environment Documentation

- [x] 7. Update `backend/.env.example`
  - [x] 7.1 Add a new section after the LLM section:
        ```
        # -----------------------------------------------------------------------------
        # Exercise service — Day 5 tool failure simulation
        # Set to 1 to simulate the exercise service being unavailable.
        # Vidya will respond: "I'm having trouble loading a new exercise right now."
        # Unset or set to 0 for normal operation.
        # -----------------------------------------------------------------------------
        # EXERCISE_SERVICE_DISABLED=1
        ```
  - [x] 7.2 Verify `.env.local` does NOT have `EXERCISE_SERVICE_DISABLED` set (it should be unset for production)
  - References: Req 6

### Phase 8 — README Update

- [x] 8. Update `README.md` with Day 5 section
  - [x] 8.1 Add `## Day 5 — Tools` section (see design.md for full content)
  - [x] 8.2 Include subsections: What was built, Tools table, Architecture diagram, Data Source, Failure Handling, Privacy, Testing
  - [x] 8.3 Data source section MUST state `Type: LOCAL` — not live internet data
  - [x] 8.4 Failure Handling section MUST document `EXERCISE_SERVICE_DISABLED=1` and the expected Vidya response
  - [x] 8.5 Testing section MUST include `uv run pytest tests/test_exercise_service.py -v` command
  - References: Req 7

### Phase 9 — LinkedIn Caption

- [x] 9. Create `day5/linkedin.md`
  - [x] 9.1 Write a LinkedIn caption that mentions: Day 5 of Murf AI Voice Agent Challenge, Vidya, Learning & Literacy, tool/function calling, personalized exercises, persistent learner memory, Murf Falcon, 10 Days of Voice Agents
  - [x] 9.2 Include hashtags: `#10DaysofAIVoiceAgents` `#MurfFalcon` `#VoiceForBharat` `#MurfAI`
  - [x] 9.3 Mention or tag Murf AI
  - [x] 9.4 Keep under 3000 characters
  - References: Req 8

### Phase 10 — Quality Verification

- [x] 10. Run backend lint and tests
  - [x] 10.1 Run `uv run ruff check .` in `backend/` — fix any errors
  - [x] 10.2 Run `uv run ruff format .` in `backend/`
  - [x] 10.3 Run `uv run pytest` — all tests pass including `test_memory.py`, `test_exercise_service.py`
  - References: Req 9

- [x] 11. Run frontend quality checks
  - [x] 11.1 Run `pnpm typecheck` (or `npx tsc --noEmit`) in `frontend/` — fix all TypeScript errors
  - [x] 11.2 Run `pnpm lint` — fix all ESLint errors
  - [x] 11.3 Run `pnpm build` — production build completes with no errors
  - References: Req 9

- [x] 12. Manual verification
  - [x] 12.1 Start backend: `uv run python src/agent.py dev` — no import errors
  - [x] 12.2 Start frontend: `pnpm dev` — no console errors
  - [x] 12.3 Connect to Vidya, say "Give me something to practice"
  - [x] 12.4 Confirm Activity panel shows "Fetching next exercise" → "Exercise ready" (from data channel, not from agent state)
  - [x] 12.5 Confirm Exercise Card appears on screen with topic, difficulty, and question
  - [x] 12.6 Answer the question
  - [x] 12.7 Confirm Activity panel shows "Checking your answer" → "Answer evaluated"
  - [x] 12.8 Confirm Feedback Card appears with result and explanation
  - [x] 12.9 Set `EXERCISE_SERVICE_DISABLED=1`, repeat step 12.3 — no Exercise Card, graceful voice fallback
  - [x] 12.10 Day 4 regression: say "मेरा नाम X है" → consent → save → restart → greeting by name
  - References: Req 9

---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "6", "7"],
      "description": "Data channel hook; exercise tests; env docs — all independent"
    },
    {
      "wave": 2,
      "tasks": ["2", "3"],
      "description": "Exercise Card and Feedback Card components — depend on hook types from task 1 being defined"
    },
    {
      "wave": 3,
      "tasks": ["4", "5"],
      "description": "Update AIActivityPanel (needs hook) and VidyaLearningRoom (needs hook + cards)"
    },
    {
      "wave": 4,
      "tasks": ["8", "9"],
      "description": "README and LinkedIn — can write in parallel with wave 3"
    },
    {
      "wave": 5,
      "tasks": ["10", "11"],
      "description": "Backend lint/test and frontend typecheck/lint/build — after all implementation"
    },
    {
      "wave": 6,
      "tasks": ["12"],
      "description": "Manual verification — final task"
    }
  ]
}
```

---

## Notes

- **`useToolEvents` location in component tree:** Both `AIActivityPanel` and `VidyaLearningRoom` call `useToolEvents()` independently. This is fine — both subscribe to the same data channel. Events will be received by both. There is no shared state needed.
- **`answer_scored` payload vs score detail:** The `answer_scored` event from the backend (`_emit_tool_event`) only contains `result` and `topic`, not the full `explanation`/`hint` from `score_answer`'s return value. For the Feedback Card, map `result` to default copy rather than trying to extract `explanation` from the event. The full explanation is spoken by Vidya via TTS — the card supplements, not replaces, the voice.
- **`useRoomContext` in hooks:** Only call `useToolEvents()` inside components that are rendered within a LiveKit session provider. `VidyaLearningRoom` and `AIActivityPanel` are both inside `<AgentSessionProvider>` — this is safe.
- **Animation cleanup:** When the session ends and the component unmounts, React's cleanup will handle the `useEffect` return. The `setActiveExercise(null)` / `setActiveFeedback(null)` calls in the disconnect handler prevent stale card state if the component is remounted.
- **Hindi/Devanagari:** No changes needed for script rules — the backend `SYSTEM_PROMPT` already enforces Devanagari. No frontend changes affect language output.
- **MCP:** Not adding MCP — the LiveKit function tool approach is simpler and already works. The spec requirement explicitly says "do not add MCP unnecessarily."
- **`retrieve_learning_context`:** This is the existing `search_knowledge_base` tool (same function, different alias in the spec). Already implemented. No action needed.
