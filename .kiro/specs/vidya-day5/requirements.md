# Requirements Document

## Introduction

Day 5 completes Vidya's tool-calling layer. The backend tools (`get_next_exercise`, `score_answer`) and their supporting services are already implemented. The remaining work is:

1. Wiring the backend's `vidya-tools` LiveKit data channel into the frontend so real tool events appear in the activity panel.
2. Adding an Exercise Card that shows the current question on screen while Vidya speaks it.
3. Adding an Answer Feedback Card that shows score and feedback after `score_answer` fires.
4. Writing automated backend tests for the exercise service and tool failure paths.
5. Adding `EXERCISE_SERVICE_DISABLED` documentation to `.env.example`.
6. Updating the README with a complete Day 5 section and producing the LinkedIn caption.

All existing Day 1–4 functionality must continue to work unchanged.

---

## Glossary

| Term | Definition |
|---|---|
| **`vidya-tools` topic** | LiveKit data channel topic name used by the backend to publish tool events as JSON |
| **tool event** | JSON object published on the `vidya-tools` topic, e.g. `{"type": "tool_start", "tool": "get_next_exercise", "label": "Fetching next exercise"}` |
| **Exercise Card** | Frontend UI component that shows the current exercise (topic, difficulty, question) while Vidya speaks |
| **Feedback Card** | Frontend UI component that shows the scoring result (correct/incorrect/partial, explanation, hint, next step) |
| **`EXERCISE_SERVICE_DISABLED`** | Backend env var — set to `1` to simulate service failure for testing |
| **Tool Activity Panel** | The `AIActivityPanel` component showing real-time events from both agent state and tool events |

---

## Requirements

### Requirement 1: Frontend — Consume vidya-tools Data Channel Events

**User Story:** As a learner, I want to see real-time tool activity in the UI so I know what Vidya is doing — not fabricated states.

#### Acceptance Criteria

1. WHEN the LiveKit session is connected THEN the frontend subscribes to the `vidya-tools` data channel topic.
2. WHEN a `tool_start` event arrives THEN the activity panel shows the event's `label` field as a new item.
3. WHEN an `exercise_ready` event arrives THEN the activity panel shows "Exercise ready" as a new item.
4. WHEN an `answer_scored` event arrives THEN the activity panel shows "Answer checked" as a new item.
5. WHEN a `tool_error` event arrives THEN the activity panel shows the error label with a visually distinct error style.
6. WHEN any tool event arrives THEN it is added to the activity feed in the correct order — newer items at the top.
7. WHEN the session ends or the component unmounts THEN the data channel subscription is cleaned up with no memory leaks.
8. WHEN no data channel events have arrived yet THEN the existing idle state ("Activity will appear once the session starts.") is still shown.

---

### Requirement 2: Frontend — Exercise Card

**User Story:** As a learner, I want to see the current exercise on screen so I can read the question while Vidya speaks it.

#### Acceptance Criteria

1. WHEN an `exercise_ready` event arrives on the `vidya-tools` channel THEN an Exercise Card becomes visible in the Learning Room.
2. WHEN the Exercise Card is visible THEN it shows: topic (uppercase), difficulty badge, and the question text.
3. WHEN the topic is present THEN it is displayed in a styled header.
4. WHEN the difficulty is `easy` / `medium` / `hard` THEN a colour-coded badge is shown (e.g. green / amber / red).
5. WHEN a new `exercise_ready` event arrives THEN the card updates to the new exercise (replaces the previous one).
6. WHEN an `answer_scored` event arrives THEN the Exercise Card hides or fades (the Feedback Card takes its place).
7. WHEN a `tool_error` event for `get_next_exercise` arrives THEN the Exercise Card is not shown.
8. WHEN the session ends THEN the Exercise Card is cleared.
9. WHEN the exercise question contains mathematical notation or special characters THEN they render correctly (no HTML encoding issues).

---

### Requirement 3: Frontend — Answer Feedback Card

**User Story:** As a learner, I want to see feedback on screen after I answer — especially the score and a hint — to support my learning.

#### Acceptance Criteria

1. WHEN an `answer_scored` event arrives THEN the Feedback Card becomes visible.
2. WHEN the Feedback Card is visible THEN it shows: result label (Correct / Partially Correct / Incorrect), explanation text, and (if present) a hint.
3. WHEN `result === "correct"` THEN the card uses green/success styling.
4. WHEN `result === "incorrect"` THEN the card uses amber/warning styling — never red shame styling.
5. WHEN `result === "partially_correct"` THEN the card uses blue/info styling.
6. WHEN a hint is present THEN it is displayed with a distinct hint label.
7. WHEN the next_step field is present THEN it is shown below the hint.
8. WHEN a new `exercise_ready` event arrives THEN the Feedback Card hides and the Exercise Card takes its place.
9. WHEN the session ends THEN the Feedback Card is cleared.
10. The Feedback Card MUST NOT contain shaming language. Words/phrases like "wrong", "failed", "incorrect performance" are forbidden in all card copy — use "Let's review", "Close!", "You're on the right track."

---

### Requirement 4: Frontend — Tool Activity Panel Enhancement

**User Story:** As a learner or judge, I want the Activity panel to show real tool events (memory lookups, exercise fetches, answer scoring) not just LLM state changes.

#### Acceptance Criteria

1. WHEN a `tool_start` event arrives with `tool === "get_next_exercise"` THEN the panel shows a book/exercise icon with the label.
2. WHEN a `tool_start` event arrives with `tool === "score_answer"` THEN the panel shows a checkmark/evaluate icon.
3. WHEN an `exercise_ready` event arrives THEN the panel shows "✓ Exercise selected" with topic metadata in a secondary line.
4. WHEN an `answer_scored` event arrives THEN the panel shows "✓ Answer evaluated" with the result (correct/incorrect/partial).
5. WHEN a `tool_error` event arrives THEN the panel shows the label in a red/error colour with an error icon.
6. WHEN tool events and agent state events both arrive THEN they are all interleaved correctly in the feed by timestamp.
7. WHEN the Technical Details section is expanded THEN it shows the raw event JSON for the last 8 events.

---

### Requirement 5: Backend — Exercise Service Tests

**User Story:** As a developer, I need automated tests for the exercise service and failure paths so I can verify tool behaviour without a live session.

#### Acceptance Criteria

1. WHEN `backend/tests/test_exercise_service.py` runs THEN it covers all of the following scenarios:
   - `get_next_exercise` returns `success=True` and all required fields for a known user
   - `get_next_exercise` uses learner memory (level/topic) to filter exercises when memory exists
   - `get_next_exercise` returns a different exercise when recent exercises are excluded
   - `get_next_exercise` returns `success=False` when `EXERCISE_SERVICE_DISABLED=1`
   - `get_next_exercise` returns `success=False` when the dataset is empty (patched)
   - `score_answer` returns `result="correct"` for an exact correct answer
   - `score_answer` returns `result="partially_correct"` for a close answer (similarity ≥ 0.65)
   - `score_answer` returns `result="incorrect"` for a wrong answer
   - `score_answer` returns `success=False` when `EXERCISE_SERVICE_DISABLED=1`
   - `score_answer` records the attempt in `exercise_attempts` via `record_attempt`
2. WHEN all tests run THEN `uv run pytest backend/tests/test_exercise_service.py` passes with no errors.
3. WHEN each test creates a learner row THEN it uses a unique UUID and cleans up after itself.
4. WHEN tests run THEN they use an isolated SQLite temp database (same pattern as `test_memory.py`).

---

### Requirement 6: Backend — Failure Mode Documentation

**User Story:** As a developer or judge, I need to know how to trigger the exercise service failure mode for a live demo.

#### Acceptance Criteria

1. WHEN `backend/.env.example` is read THEN it documents `EXERCISE_SERVICE_DISABLED=1` with a comment explaining it simulates exercise service failure.
2. WHEN `EXERCISE_SERVICE_DISABLED=1` is set in the environment THEN both `get_next_exercise` and `score_answer` return `success=False` without crashing.
3. WHEN the agent receives a `success=False` result from `get_next_exercise` THEN the system prompt instructs it to say something like "I'm having trouble loading a new exercise right now" — this instruction already exists in `SYSTEM_PROMPT` and must not be removed.

---

### Requirement 7: README — Day 5 Section

**User Story:** As a judge or developer, I need the README to document the Day 5 tools clearly.

#### Acceptance Criteria

1. WHEN the README is read THEN a `## Day 5 — Tools` section is present with subsections for:
   - What was built
   - Tools (`get_next_exercise`, `score_answer`, `retrieve_learning_context` / `search_knowledge_base`)
   - Architecture diagram (text-based, Voice → STT → LLM → Memory → Tool → Data → LLM → TTS → User)
   - Data source (clearly states LOCAL, source is `backend/data/exercises/exercises.json`, curated dataset for Indian school curriculum Classes 6–12)
   - Failure handling (how to enable `EXERCISE_SERVICE_DISABLED`, expected Vidya response)
   - Privacy (what is stored: exercise attempt topic + result, subject to consent for other fields)
   - Testing instructions
2. WHEN the README data source section is read THEN it states the dataset is `LOCAL` — not live internet data.
3. WHEN the README is read THEN it does not contain fabricated claims about the data being live or real-time.

---

### Requirement 8: LinkedIn Caption

**User Story:** As the project owner, I need a Day 5 LinkedIn caption ready to post.

#### Acceptance Criteria

1. WHEN `day5/linkedin.md` is read THEN it contains a complete LinkedIn post caption.
2. The caption MUST mention: Day 5, Murf AI Voice Agent Challenge, Vidya, Learning & Literacy, tool/function calling, personalized exercises, persistent learner memory, Murf Falcon, 10 Days of Voice Agents.
3. The caption MUST include hashtags: `#10DaysofAIVoiceAgents` `#MurfFalcon` `#VoiceForBharat` `#MurfAI`.
4. The caption MUST tag Murf AI (mention `@MurfAI` or equivalent).
5. The caption length SHOULD be suitable for LinkedIn (under 3000 characters).

---

### Requirement 9: Day 1–4 Regression

**User Story:** As the project owner, I want all existing functionality to keep working after Day 5 changes.

#### Acceptance Criteria

1. WHEN `uv run ruff check .` runs in the backend THEN it passes with no errors.
2. WHEN `uv run pytest` runs THEN existing `test_memory.py` and `test_agent.py` tests all pass.
3. WHEN `pnpm build` runs in the frontend THEN it completes with no TypeScript errors.
4. WHEN `pnpm lint` runs THEN it passes with no errors.
5. WHEN the agent runs and the learner says "give me something to practice" THEN `get_next_exercise` fires (confirmed by activity panel showing tool event).
6. WHEN the learner answers a question THEN `score_answer` fires and feedback appears in voice and on screen.
7. WHEN `EXERCISE_SERVICE_DISABLED=1` is set THEN Vidya says a graceful fallback message and no exercise card appears.
8. WHEN a returning learner connects THEN their name and last topic are used in the greeting (Day 4 regression).
9. WHEN a learner says "forget everything" and confirms THEN their memory is wiped (Day 4 regression).
