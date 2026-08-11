# Requirements Document

## Introduction

Day 6 transforms Vidya from a purely reactive voice assistant (student opens website → speaks) into a proactive AI learning companion that initiates outbound voice calls at a student-chosen daily practice time.

The telephony layer uses **LiveKit SIP** as the bridge and **Linphone** as the SIP softphone client on the student's device — no Twilio, no PSTN required. A backend call scheduler reads student preferred-time records from the existing SQLite database and dispatches outbound SIP calls through LiveKit's SIP participant dispatch API.

All Day 1–5 features (memory, exercises, tool-calling, activity panel, frontend UI) continue to work unchanged. Day 6 adds new capabilities on top.

---

## Glossary

| Term | Definition |
|---|---|
| **Linphone** | Open-source SIP softphone. Students install it as the "phone" that rings when Vidya calls |
| **SIP URI** | SIP address of the form `sip:username@domain` used to route the call to Linphone |
| **LiveKit SIP Bridge** | LiveKit's built-in SIP gateway — converts SIP ↔ RTC so the agent can speak into a SIP call |
| **SIP Trunk** | A configured LiveKit SIP outbound trunk (using a free SIP server such as sip.linphone.org) |
| **Call Scheduler** | Python `asyncio` loop that checks the DB every 60 s and fires a call when a student's `preferred_time` matches the current local time (±drift window) |
| **Drift window** | ±5-minute window in which a scheduled call is still allowed to fire, even if the scheduler loop drifted |
| **Outbound session** | An `AgentSession` started by the scheduler (not by a web participant) — the agent speaks first |
| **Call record** | DB row in `call_history` table capturing start time, duration, topic, performance, and status |
| **opt-out** | Student says "बंद करो" / "stop calls" / "unsubscribe" → `call_opt_out` flag set to 1 in DB |
| **preferred_time** | HH:MM string (24-hour, local time) stored in the `users` table extension; when NULL no calls are scheduled |

---

## Requirements

---

### Requirement 1: DB Schema Extensions for Outbound Calls

**User Story:** As the system, I need to store scheduling preferences and call history in SQLite so the scheduler can operate and the frontend can display history.

#### Acceptance Criteria

1. WHEN `init_db()` runs THEN it creates (if not exists) a `call_history` table with columns: `id INTEGER PRIMARY KEY AUTOINCREMENT`, `user_id TEXT NOT NULL`, `started_at TEXT NOT NULL`, `ended_at TEXT`, `duration_seconds INTEGER`, `topic TEXT`, `performance TEXT`, `status TEXT NOT NULL` (values: `answered` | `missed` | `failed`), `FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE`.
2. WHEN `init_db()` runs THEN it creates (if not exists) an index `idx_callhist_user ON call_history(user_id)`.
3. WHEN `init_db()` runs THEN the `users` table has columns `preferred_time TEXT` (HH:MM 24-hour), `call_opt_out INTEGER DEFAULT 0`, and `sip_uri TEXT` added via `ALTER TABLE … ADD COLUMN IF NOT EXISTS` (idempotent).
4. WHEN `init_db()` is called multiple times THEN it completes without error (idempotent).
5. WHEN a learner row is deleted THEN all associated `call_history` rows are deleted via CASCADE.

---

### Requirement 2: Call Scheduler — Timing and Drift Tolerance

**User Story:** As a student, I want Vidya to call me at the time I picked, and I want the call to still happen even if the server was briefly busy.

#### Acceptance Criteria

1. WHEN `backend/src/scheduler/call_scheduler.py` is started THEN it runs an `asyncio` loop that wakes every 60 seconds.
2. WHEN the scheduler wakes THEN it queries the `users` table for all rows where `preferred_time IS NOT NULL AND call_opt_out = 0`.
3. WHEN a student's `preferred_time` is within ±5 minutes of the current local time THEN the scheduler fires a call for that student — this is the drift window requirement.
4. WHEN a student's `preferred_time` is outside the ±5-minute window THEN no call is fired.
5. WHEN a call has already been fired for a student today (a `call_history` row exists with `started_at` on today's date for that `user_id`) THEN the scheduler does NOT fire a second call that same day.
6. WHEN the scheduler fires a call THEN it logs `INFO "Initiating outbound call for user_id=%r"` before dispatching.
7. WHEN the scheduler loop raises an unexpected exception THEN it logs the error and continues — the loop does NOT crash.
8. WHEN `call_opt_out = 1` for a student THEN the scheduler skips that student entirely.

---

### Requirement 3: LiveKit SIP Outbound Call Dispatch

**User Story:** As the system, I need to place an outbound SIP call that LiveKit's agent framework can join and speak through.

#### Acceptance Criteria

1. WHEN the scheduler decides to call a student THEN it calls `dispatch_outbound_sip_call(user_id, sip_uri)` in `backend/src/services/call_service.py`.
2. WHEN `dispatch_outbound_sip_call` is called THEN it creates a LiveKit room named `outbound-{user_id}-{YYYYMMDD-HHmm}` and dispatches a SIP participant to `sip_uri` using the LiveKit Python SDK `SIPClient.create_sip_participant`.
3. WHEN the SIP participant is created THEN the agent joins that room in outbound mode (scheduler triggers an `AgentDispatch` to the `my-agent` worker).
4. WHEN the room is created THEN the LiveKit API key and secret are read from `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` env vars (already present in `.env.local`).
5. WHEN `LIVEKIT_SIP_TRUNK_ID` env var is present THEN it is used as the outbound trunk ID; WHEN it is absent THEN `dispatch_outbound_sip_call` logs a warning and returns `{"success": False, "error": "no_sip_trunk"}`.
6. WHEN `sip_uri` is NULL or empty for a student THEN the scheduler skips that student and logs a warning.
7. WHEN the LiveKit SIP API call fails THEN `dispatch_outbound_sip_call` logs the error and returns `{"success": False, "error": "sip_dispatch_failed"}`.
8. WHEN the call is successfully dispatched THEN a `call_history` row is inserted with `status="answered"` (updated to `missed`/`failed` later if needed).

---

### Requirement 4: Outbound Agent Greeting — Identity and Opt-Out

**User Story:** As a student receiving a call I didn't request, I need to know immediately who is calling, why, and how to stop future calls.

#### Acceptance Criteria

1. WHEN the `Assistant` agent enters an outbound session THEN `on_enter` detects it is outbound (via `_is_outbound` flag) and delivers an outbound-specific opening.
2. WHEN the outbound greeting fires THEN the first spoken sentence identifies: who is calling ("मैं Vidya AI Learning Assistant हूँ"), why ("आपके daily learning practice session के लिए call कर रही हूँ"), and how to opt out ("अगर आप future calls बंद करना चाहते हैं तो मुझे बता सकते हैं").
3. WHEN the student's memory has `found=True` and `name` is set THEN the greeting addresses them by name (e.g. "नमस्ते Susant,").
4. WHEN the student's memory has `found=False` THEN the greeting uses a generic opening without a name.
5. WHEN the student's memory has a `last_topic` THEN the greeting mentions it after the ID/opt-out sentences (e.g. "पिछली बार हम algebra practice कर रहे थे। आज उसी topic को continue करें?").
6. WHEN the student says "stop calls", "बंद करो", "no more calls", "unsubscribe", or equivalent THEN the agent calls `set_call_opt_out` and confirms: "ठीक है, मैं आगे से call नहीं करूँगी।"
7. WHEN `set_call_opt_out` is called THEN it sets `call_opt_out = 1` in the `users` table for that `user_id`.
8. WHEN the outbound greeting is delivered THEN all Hindi words are written in Devanagari script — romanized Hindi is forbidden.

---

### Requirement 5: Outbound Session — Personalized Learning Conversation

**User Story:** As a student, I want the outbound call to continue into a personalized practice session using my saved profile and previous topics.

#### Acceptance Criteria

1. WHEN the outbound greeting completes THEN the agent proceeds with the same learning conversation flow as inbound sessions (exercises, scoring, knowledge-base search).
2. WHEN the student's memory has `current_level` set THEN `get_next_exercise` uses that level to filter exercises.
3. WHEN the student's memory has a recent topic THEN `get_next_exercise` uses that topic by default (student can override).
4. WHEN the call is an outbound session THEN all Day 5 tools (`get_next_exercise`, `score_answer`, `search_knowledge_base`) remain available and work identically to inbound sessions.
5. WHEN the student opts out during the session THEN the agent ends the learning conversation gracefully after confirming opt-out.
6. WHEN the call ends (SIP hangup or session timeout) THEN the agent updates the `call_history` row with `ended_at` and `duration_seconds`.

---

### Requirement 6: Call Failure Handling

**User Story:** As the system operator, I need graceful handling of all call failure modes so the scheduler never crashes and the student is never left with silence.

#### Acceptance Criteria

1. WHEN the SIP call is not answered within 30 seconds THEN the scheduler marks the `call_history` row as `status="missed"` and schedules a retry attempt (see Req 7).
2. WHEN a SIP connection error occurs mid-call THEN the agent logs the error, updates `call_history` with `status="failed"`, and does not retry that session.
3. WHEN Linphone is unavailable or the SIP URI is unreachable THEN `dispatch_outbound_sip_call` catches the exception and returns `{"success": False, "error": "sip_unreachable"}`.
4. WHEN any failure occurs THEN the scheduler loop continues — a single failed call does not stop other students' calls.
5. WHEN `LINPHONE_UNAVAILABLE_SIMULATION=1` is set in the environment THEN `dispatch_outbound_sip_call` immediately returns `{"success": False, "error": "simulated_unavailable"}` (for testing).

---

### Requirement 7: Missed Call Retry

**User Story:** As a student, if I missed my daily call I want Vidya to try again once so I don't miss my practice entirely.

#### Acceptance Criteria

1. WHEN a call has `status="missed"` in `call_history` THEN the scheduler checks once if a retry is due.
2. WHEN a retry is due (missed call was < 2 hours ago and no `retry_attempted` flag) THEN the scheduler fires one retry call after a 10-minute delay.
3. WHEN the retry call is dispatched THEN a new `call_history` row is inserted with a `retry_of` reference to the original missed call's `id`.
4. WHEN the retry call is also missed THEN no further retries are attempted — maximum one retry per scheduled call.
5. WHEN `retry_attempted = 1` in the original `call_history` row THEN the scheduler does not schedule another retry.

---

### Requirement 8: Student Profile — Preferred Time Setup (Frontend)

**User Story:** As a student, I need a way to set my preferred daily call time in the web UI so Vidya knows when to call me.

#### Acceptance Criteria

1. WHEN the student opens the frontend THEN a "Call Schedule" settings panel is accessible from the main UI.
2. WHEN the student selects a time (HH:MM, 24-hour) and saves THEN a `POST /api/memory/schedule` request is made to the backend with `{ user_id, preferred_time, sip_uri }`.
3. WHEN the backend receives this request THEN it updates `users.preferred_time` and `users.sip_uri` for that `user_id` (creating the user row if absent).
4. WHEN `preferred_time` and `sip_uri` are saved THEN the UI confirms: "Vidya will call you daily at [time]."
5. WHEN the student sets `preferred_time` to `null` or clears the field THEN scheduled calls are disabled for that student.
6. WHEN the `sip_uri` field is empty THEN the save button is disabled and a hint is shown: "Enter your Linphone SIP address to receive calls."
7. WHEN the Call Schedule panel is open THEN it shows the student's current `name`, `preferred_time`, `sip_uri`, and `call_opt_out` status read from `GET /api/memory/{user_id}`.

---

### Requirement 9: Call History & Learning Progress (Frontend)

**User Story:** As a student, I want to see my call history and learning progress in the dashboard so I can track my practice streak.

#### Acceptance Criteria

1. WHEN the frontend renders THEN a "Practice History" section shows the student's last 10 call records fetched from `GET /api/calls/{user_id}`.
2. WHEN a call record is shown THEN it displays: date, duration (mm:ss), topic, and status (Answered / Missed / Failed).
3. WHEN performance is set on a call record THEN it shows a simple badge (e.g. "8/10 correct").
4. WHEN there are no call records THEN the panel shows: "No calls yet. Set your daily practice time to get started."
5. WHEN the frontend renders THEN a "Learning Progress" section shows: total questions attempted, accuracy percentage, and most practiced topic — derived from `exercise_attempts` table.

---

### Requirement 10: Live Call Status Push to Frontend

**User Story:** As a student watching the web UI during a call, I want real-time call status so I know Vidya is connecting, listening, speaking, etc.

#### Acceptance Criteria

1. WHEN an outbound call is initiated THEN the backend publishes a `call_status` event via LiveKit data channel with `{ type: "call_status", status: "CONNECTING" }`.
2. WHEN the SIP participant answers THEN a `{ type: "call_status", status: "CALLING" }` event is published.
3. WHEN the agent speaks THEN `{ type: "call_status", status: "SPEAKING" }` is published.
4. WHEN the agent is listening THEN `{ type: "call_status", status: "LISTENING" }` is published.
5. WHEN the call ends THEN `{ type: "call_status", status: "CALL ENDED" }` is published.
6. WHEN the frontend receives a `call_status` event THEN it updates the outbound call dashboard state indicator.
7. WHEN the call dashboard shows a state THEN it uses the animated AI orb and a text label — no emojis in the status text, use SVG icons only.

---

### Requirement 11: Frontend Redesign — Premium UI

**User Story:** As a judge evaluating the product, I want the UI to feel like a polished AI education product, not a developer demo.

#### Acceptance Criteria

1. WHEN the homepage loads THEN a hero section shows: "VIDYA", "Your Personal AI Learning Companion", "Learn • Practice • Improve", "Voice-based learning in Hindi and English", and a "Start Learning" CTA button.
2. WHEN the homepage loads THEN a navbar contains: Home, Features, How it Works, Privacy, About links.
3. WHEN the homepage loads THEN feature cards show: Personalized Learning, AI Memory, Hindi + English Support, Voice Conversations, Privacy First — each with an SVG icon (no emojis).
4. WHEN a student is in a session THEN a Student Dashboard panel shows: name, learning level, current topic, memory status (Active / New), and practice history count.
5. WHEN emojis were used in the previous UI THEN they are replaced with equivalent SVG icons or Phosphor icons consistent with the existing icon set.
6. WHEN the UI renders THEN it passes `pnpm build` and `pnpm lint` with no errors.

---

### Requirement 12: Environment Variables and Configuration

**User Story:** As a developer or operator, I need all new env vars documented and defaulted safely so the backend starts without SIP configured.

#### Acceptance Criteria

1. WHEN `backend/.env.example` is read THEN it documents all new Day 6 vars: `LIVEKIT_SIP_TRUNK_ID`, `LINPHONE_UNAVAILABLE_SIMULATION`, and `SCHEDULER_ENABLED`.
2. WHEN `SCHEDULER_ENABLED` is absent or `0` THEN the scheduler does NOT start — the agent starts normally for inbound sessions only.
3. WHEN `SCHEDULER_ENABLED=1` THEN the scheduler starts alongside the agent worker.
4. WHEN any new env var is missing THEN the backend logs a warning but does NOT crash — all Day 1–5 features continue to work.
5. WHEN `backend/.env.local` is read by the backend THEN it does NOT contain `SCHEDULER_ENABLED=1` by default (opted in manually by developer).

---

### Requirement 13: Day 1–5 Regression

**User Story:** As the project owner, I want all existing functionality to continue working after Day 6 changes.

#### Acceptance Criteria

1. WHEN `uv run ruff check .` runs in `backend/` THEN it passes with no errors.
2. WHEN `uv run pytest` runs THEN `test_memory.py`, `test_exercise_service.py`, and `test_agent.py` all pass.
3. WHEN `pnpm build` runs in `frontend/` THEN it completes with no TypeScript errors.
4. WHEN `pnpm lint` runs THEN it passes with no errors.
5. WHEN a student connects via the web browser THEN the inbound session works exactly as before (Day 1–5 behaviour unchanged).
6. WHEN `SCHEDULER_ENABLED` is absent THEN starting the backend does not start the scheduler and produces no errors.
7. WHEN a returning learner connects inbound THEN their name and last topic are used in the greeting (Day 4 regression).
8. WHEN a learner says "give me something to practice" inbound THEN `get_next_exercise` fires and the Exercise Card appears (Day 5 regression).
