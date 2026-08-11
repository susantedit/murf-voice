# Implementation Plan — Vidya Day 6: Outbound SIP Learning Calls

## Overview

Day 6 builds outbound calling on top of the working Day 1–5 system. Do not modify any existing working code unless a task explicitly says to update a specific file. All new backend code lives in new files; `agent.py` and `database.py` get targeted additions only.

---

## Tasks

### Phase 1 — Database Schema Extensions

- [x] 1. Extend `backend/src/db/database.py` schema
  - [x] 1.1 Add `call_history` table DDL inside `init_db()` using `CREATE TABLE IF NOT EXISTS` with columns: `id`, `user_id`, `started_at`, `ended_at`, `duration_seconds`, `topic`, `performance`, `status`, `retry_of`, `retry_attempted`, FK to users ON DELETE CASCADE
  - [x] 1.2 Add index `idx_callhist_user ON call_history(user_id)` using `CREATE INDEX IF NOT EXISTS`
  - [x] 1.3 Add idempotent `ALTER TABLE users ADD COLUMN preferred_time TEXT` wrapped in a try/except for `OperationalError` (column already exists)
  - [x] 1.4 Add idempotent `ALTER TABLE users ADD COLUMN call_opt_out INTEGER DEFAULT 0` (same pattern)
  - [x] 1.5 Add idempotent `ALTER TABLE users ADD COLUMN sip_uri TEXT` (same pattern)
  - [x] 1.6 Verify `init_db()` can be called twice on the same DB without error
  - References: Req 1, Design §Data Models

### Phase 2 — Call Repository

- [x] 2. Create `backend/src/db/call_repository.py`
  - [x] 2.1 Implement `insert_call(user_id, started_at, topic=None) -> int`: insert row with `status="answered"`, return `lastrowid`
  - [x] 2.2 Implement `update_call(call_id, *, ended_at=None, duration_seconds=None, topic=None, performance=None, status=None, retry_attempted=None)`: build dynamic UPDATE from non-None kwargs
  - [x] 2.3 Implement `get_calls(user_id, limit=10) -> list[dict]`: SELECT ordered by `started_at DESC LIMIT ?`
  - [x] 2.4 Implement `call_exists_today(user_id) -> bool`: check if any row with `started_at LIKE '{today}%'` exists for the user
  - [x] 2.5 Implement `get_missed_unretried(user_id) -> dict | None`: SELECT WHERE `status="missed" AND retry_attempted=0` ordered by `started_at DESC LIMIT 1`
  - [x] 2.6 Add `get_schedulable_users() -> list[dict]`: SELECT `user_id, preferred_time, sip_uri` WHERE `preferred_time IS NOT NULL AND call_opt_out = 0 AND sip_uri IS NOT NULL`
  - [x] 2.7 Add `set_opt_out(user_id, value: int)`: UPDATE users SET `call_opt_out = ?` WHERE `user_id = ?`
  - References: Req 1, Design §call_repository.py

### Phase 3 — Call Service

- [x] 3. Create `backend/src/services/call_service.py`
  - [x] 3.1 Import `livekit.api` as `lkapi`; import `call_repository` from `db`
  - [x] 3.2 Implement `async dispatch_outbound_sip_call(user_id, sip_uri) -> dict`:
        - Read `LIVEKIT_SIP_TRUNK_ID` from env; if absent return `{"success": False, "error": "no_sip_trunk"}`
        - Check `LINPHONE_UNAVAILABLE_SIMULATION=1` env var; if set return `{"success": False, "error": "simulated_unavailable"}`
        - Build `room_name = f"outbound-{user_id}-{datetime.utcnow().strftime('%Y%m%d-%H%M')}"`
        - Create `lkapi.LiveKitAPI()` with URL/key/secret from env
        - Dispatch agent via `lk.agent_dispatch.create_dispatch(...)` with metadata `{"outbound": True, "user_id": user_id}`
        - Create SIP participant via `lk.sip.create_sip_participant(...)` with trunk_id, sip_call_to=sip_uri, room_name
        - Insert call record via `call_repository.insert_call(...)`; return success + call_id
        - Catch all exceptions; log error; return `{"success": False, "error": "sip_dispatch_failed"}`
        - Always call `await lk.aclose()` in a finally block
  - [x] 3.3 Implement `async set_call_opt_out(user_id, opt_out=True) -> dict`: call `call_repository.set_opt_out(user_id, 1 if opt_out else 0)`; return `{"success": True}` or error
  - References: Req 3, 6, Design §call_service.py

### Phase 4 — Call Scheduler

- [x] 4. Create `backend/src/scheduler/__init__.py` (empty)
- [x] 5. Create `backend/src/scheduler/call_scheduler.py`
  - [x] 5.1 Implement `_parse_hhmm(s: str) -> tuple[int, int]`: parse "HH:MM" → (hour, minute)
  - [x] 5.2 Implement `_is_within_window(preferred_time: str, now: datetime, window_minutes=5) -> bool`: compute delta between now and today's preferred_time; return True if delta ≤ window
  - [x] 5.3 Implement `async _process_tick()`: call `get_schedulable_users()`; for each user check `_is_within_window` and `not call_exists_today`; if both true call `asyncio.create_task(dispatch_outbound_sip_call(...))`
  - [x] 5.4 Implement retry logic inside `_process_tick()`: for each user, call `get_missed_unretried`; if a missed call exists and it started > 10 min ago, dispatch a retry and set `retry_attempted=1` on the original row
  - [x] 5.5 Implement `async run_scheduler(tick_interval=60)`: loop `asyncio.sleep(tick_interval)` then `await _process_tick()` wrapped in try/except that logs and continues
  - [x] 5.6 Log `INFO "Scheduler tick — checking {n} schedulable users"` each tick
  - References: Req 2, 7, Design §call_scheduler.py


### Phase 5 — Agent: Outbound Mode + Opt-Out Tool

- [x] 6. Update `backend/src/agent.py`
  - [x] 6.1 Add `is_outbound: bool = False` parameter to `Assistant.__init__`; store as `self._is_outbound`
  - [x] 6.2 Add `self._call_id: int | None = None` to `Assistant.__init__` for tracking the active call record
  - [x] 6.3 In `on_enter()`: add branch — `if self._is_outbound: await self._outbound_greeting(memory)` else existing inbound greeting logic
  - [x] 6.4 Implement `async _outbound_greeting(self, memory: dict)`: construct greeting with name (if found), identity, reason, opt-out sentence, and last topic (if present); all Hindi in Devanagari; call `await self.session.say(greeting)`
  - [x] 6.5 Add `@function_tool async def set_call_opt_out(self, placeholder: str = "") -> str`: call `call_service.set_call_opt_out(self._user_id)`; return JSON result
  - [x] 6.6 In `my_agent()`: parse `ctx.job.metadata` JSON; detect `outbound=True`; extract `user_id`; set `is_outbound` on `Assistant`
  - [x] 6.7 Add Day 6 outbound rules section to `SYSTEM_PROMPT`: include instructions for opt-out detection and `set_call_opt_out` usage
  - [x] 6.8 Emit `call_status` events via `_emit_tool_event`: `CONNECTING` on session start, `LISTENING` / `SPEAKING` / `THINKING` during session, `CALL ENDED` on disconnect
  - References: Req 4, 5, 10, Design §agent.py

### Phase 6 — REST API

- [x] 7. Create `backend/src/api/call_server.py`
  - [x] 7.1 Implement `GET /api/calls/{user_id}`: call `call_repository.get_calls(user_id, limit=10)`; return JSON array
  - [x] 7.2 Implement `POST /api/memory/schedule`: accept JSON `{user_id, preferred_time, sip_uri}`; validate HH:MM format; create learner if absent; update `preferred_time` + `sip_uri` on users row; return `{"success": True}`
  - [x] 7.3 Mount `call_server` routes on the existing `memory_server.py` app (or run as a separate ASGI app on the same port with a router)
  - [x] 7.4 Update `GET /api/memory/{user_id}` in `memory_server.py` to include `preferred_time`, `sip_uri`, `call_opt_out` fields in its response
  - References: Req 8, 9, Design §call_server.py

### Phase 7 — Backend Tests

- [x] 8. Create `backend/tests/test_call_repository.py`
  - [x] 8.1 Add `isolated_db` autouse fixture (same pattern as `test_memory.py`)
  - [x] 8.2 `test_insert_and_get_call`: insert a call, call `get_calls`, assert the record is returned with correct fields
  - [x] 8.3 `test_call_exists_today`: insert call with today's date → assert True; no calls → assert False
  - [x] 8.4 `test_update_call_status`: insert → update to `missed` → get_calls → assert status is `missed`
  - [x] 8.5 `test_get_missed_unretried`: insert missed call with `retry_attempted=0` → assert returned; set `retry_attempted=1` → assert None returned
  - References: Req 1, Design §Testing Strategy

- [x] 9. Create `backend/tests/test_call_service.py`
  - [x] 9.1 Add `isolated_db` autouse fixture
  - [x] 9.2 `test_dispatch_no_trunk(monkeypatch)`: ensure `LIVEKIT_SIP_TRUNK_ID` not set → `result["error"] == "no_sip_trunk"`
  - [x] 9.3 `test_dispatch_simulated_unavailable(monkeypatch)`: set `LINPHONE_UNAVAILABLE_SIMULATION=1` → `result["error"] == "simulated_unavailable"`
  - [x] 9.4 `test_set_opt_out`: create learner, call `set_call_opt_out`, query DB → `call_opt_out = 1`
  - References: Req 3, 6, Design §Testing Strategy

- [x] 10. Create `backend/tests/test_call_scheduler.py`
  - [x] 10.1 Add `isolated_db` autouse fixture; monkeypatch `dispatch_outbound_sip_call` to a mock that records calls
  - [x] 10.2 `test_fires_within_window`: set preferred_time = now; run `_process_tick()`; assert dispatch called once
  - [x] 10.3 `test_skips_outside_window`: set preferred_time = now + 15 min; assert dispatch NOT called
  - [x] 10.4 `test_skips_existing_call_today`: insert a call today; assert dispatch NOT called
  - [x] 10.5 `test_skips_opted_out`: set `call_opt_out=1`; assert dispatch NOT called
  - [x] 10.6 `test_retry_logic`: insert missed call 15 min ago with `retry_attempted=0`; run tick; assert retry dispatch called and `retry_attempted` set to 1
  - [x] 10.7 `test_no_double_retry`: `retry_attempted=1` → assert no second retry dispatch
  - References: Req 2, 7, Design §Testing Strategy

### Phase 8 — Frontend: Types and Hooks

- [x] 11. Create `frontend/types/call.ts`
  - [x] 11.1 Export `CallRecord` interface with all fields from design
  - [x] 11.2 Export `ScheduleConfig` interface
  - [x] 11.3 Export `CallStatusEvent` interface with all 7 status values
  - References: Design §Frontend TypeScript

- [x] 12. Create `frontend/hooks/useCallStatus.ts`
  - [x] 12.1 Use existing `useToolEvents` pattern; filter events where `event.type === "call_status"`
  - [x] 12.2 Return `{ status: CallStatusEvent["status"] | null }` — the latest status value only
  - [x] 12.3 Reset to null when session ends
  - References: Req 10, Design §useCallStatus

### Phase 9 — Frontend: New Components

- [x] 13. Create `frontend/components/app/call-schedule-panel.tsx`
  - [x] 13.1 Fetch current schedule from `GET /api/memory/{user_id}` on mount; populate fields
  - [x] 13.2 Render a time input (type="time") for preferred_time
  - [x] 13.3 Render a text input for SIP URI with placeholder `sip:username@sip.linphone.org`
  - [x] 13.4 Disable save button when sip_uri is empty; show hint text
  - [x] 13.5 On save, POST to `/api/memory/schedule`; show confirmation "Vidya will call you daily at [time]"
  - [x] 13.6 Show current opt-out status; if opted out show "Scheduled calls are currently paused" with a Re-enable button
  - References: Req 8, Design §call-schedule-panel.tsx

- [x] 14. Create `frontend/components/app/practice-history-panel.tsx`
  - [x] 14.1 Fetch `GET /api/calls/{user_id}` on mount
  - [x] 14.2 Render list of up to 10 call records: date (locale string), duration (mm:ss), topic, status badge (green=answered, amber=missed, red=failed)
  - [x] 14.3 Show "No calls yet. Set your daily practice time to get started." when empty
  - [x] 14.4 Fetch `GET /api/memory/{user_id}` to compute progress stats from `exercise_attempts`; show total attempts, accuracy %, top topic
  - References: Req 9, Design §practice-history-panel.tsx

- [x] 15. Create `frontend/components/app/outbound-call-dashboard.tsx`
  - [x] 15.1 Import `useCallStatus` hook; read current status
  - [x] 15.2 Render animated AI orb (reuse existing orb component or adapt)
  - [x] 15.3 Render SVG status icon + text label for each state (no emojis)
  - [x] 15.4 Status text: READY (idle), CONNECTING (pulsing orb), CALLING (ring animation), LISTENING (waveform), THINKING (dots), SPEAKING (waveform), CALL ENDED (faded)
  - [x] 15.5 Only show the dashboard when status is not null (i.e. an outbound call is active)
  - References: Req 10, 11, Design §outbound-call-dashboard.tsx

- [x] 16. Create `frontend/components/app/student-dashboard.tsx`
  - [x] 16.1 Fetch `GET /api/memory/{user_id}` on mount
  - [x] 16.2 Render: student name (or "New Student"), level (or "—"), current topic (last in topics array), memory status badge (Active if found, New if not)
  - [x] 16.3 Show practice count from call history (fetched separately or passed as prop)
  - References: Req 11, Design §student-dashboard.tsx

### Phase 10 — Frontend: Page Redesign

- [x] 17. Update `frontend/app/page.tsx` — hero section and navbar
  - [x] 17.1 Add a `<nav>` with links: Home, Features, How it Works, Privacy, About (scroll anchors with `id` targets on the same page)
  - [x] 17.2 Replace or augment existing hero with: large "VIDYA" heading, subtitle "Your Personal AI Learning Companion", tagline "Learn • Practice • Improve", body "Voice-based learning in Hindi and English", "Start Learning" CTA button
  - [x] 17.3 Add a Features section with 5 cards — each with a Phosphor SVG icon and text title + description (no emojis)
  - [x] 17.4 Remove or replace any emoji characters in existing UI with equivalent SVG icons from `@phosphor-icons/react`
  - [x] 17.5 Integrate `StudentDashboard`, `CallSchedulePanel`, `PracticeHistoryPanel` into the appropriate page sections
  - [x] 17.6 Run `pnpm lint` and `pnpm build`; fix all errors
  - References: Req 11, Design §page.tsx

### Phase 11 — Environment and Dependencies

- [x] 18. Update `backend/.env.example`
  - [x] 18.1 Add section documenting `LIVEKIT_SIP_TRUNK_ID` (required for SIP calling)
  - [x] 18.2 Add `SCHEDULER_ENABLED=0` (set to 1 to start the scheduler)
  - [x] 18.3 Add `LINPHONE_UNAVAILABLE_SIMULATION=0` (set to 1 for test mode)
  - [x] 18.4 Add Linphone setup instructions as comments
  - References: Req 12

- [x] 19. Update `backend/pyproject.toml`
  - [x] 19.1 Add `livekit-api>=0.7` to dependencies if not already present (check first — it may be included transitively)
  - [x] 19.2 Run `uv sync` to resolve; fix any conflicts
  - References: Design §call_service.py

### Phase 12 — README and LinkedIn

- [x] 20. Update `README.md`
  - [x] 20.1 Add `## Day 6 — Outbound Calls` section
  - [x] 20.2 Include: what was built, architecture diagram (text), Linphone setup steps, SIP configuration, env var table, testing steps, limitations (SIP trunk required, Linphone must be registered)
  - References: Day 6 brief

- [x] 21. Create `day6/linkedin.md`
  - [x] 21.1 Write LinkedIn caption mentioning: Day 6, Murf AI Voice Agent Challenge, Vidya, outbound calling, SIP/Linphone, scheduled learning calls, Hindi + English, Murf Falcon, 10 Days of Voice Agents
  - [x] 21.2 Include hashtags: `#10DaysofAIVoiceAgents` `#MurfFalcon` `#VoiceForBharat` `#MurfAI`
  - [x] 21.3 Keep under 3000 characters

### Phase 13 — Quality Verification

- [x] 22. Backend lint and tests
  - [x] 22.1 Run `uv run ruff check .` in `backend/` — fix all errors
  - [x] 22.2 Run `uv run ruff format .`
  - [x] 22.3 Run `uv run pytest` — all tests pass including `test_memory.py`, `test_exercise_service.py`, `test_call_repository.py`, `test_call_service.py`, `test_call_scheduler.py`
  - References: Req 13

- [x] 23. Frontend quality checks
  - [x] 23.1 Run `pnpm typecheck` (or `npx tsc --noEmit`) — fix all TypeScript errors
  - [x] 23.2 Run `pnpm lint` — fix all ESLint errors
  - [x] 23.3 Run `pnpm build` — production build completes with no errors
  - References: Req 13

- [x] 24. Regression verification
  - [x] 24.1 Start backend without `SCHEDULER_ENABLED` — no scheduler, no errors
  - [x] 24.2 Connect inbound via browser — Day 1–5 flow works unchanged
  - [x] 24.3 Say "give me something to practice" — Exercise Card appears (Day 5 regression)
  - [x] 24.4 Say a name and ask to save — memory saves (Day 4 regression)
  - References: Req 13

---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "11", "18"],
      "description": "DB schema; TS types; env docs — all independent"
    },
    {
      "wave": 2,
      "tasks": ["2", "12"],
      "description": "Call repository (needs schema); useCallStatus hook (needs types)"
    },
    {
      "wave": 3,
      "tasks": ["3", "4", "5"],
      "description": "Call service and scheduler (both need call_repository)"
    },
    {
      "wave": 4,
      "tasks": ["6", "7"],
      "description": "Agent outbound mode (needs call_service); REST API (needs call_repository)"
    },
    {
      "wave": 5,
      "tasks": ["8", "9", "10", "13", "14", "15", "16", "19"],
      "description": "All backend tests + all new frontend components + pyproject deps — parallel"
    },
    {
      "wave": 6,
      "tasks": ["17", "20", "21"],
      "description": "Page redesign (needs all components); README; LinkedIn"
    },
    {
      "wave": 7,
      "tasks": ["22", "23"],
      "description": "Backend lint/test; frontend typecheck/build — after all implementation"
    },
    {
      "wave": 8,
      "tasks": ["24"],
      "description": "Regression verification — final"
    }
  ]
}
```

---

## Notes

- **Linphone SIP account:** Use a free account at `sip.linphone.org`. The SIP URI format is `sip:username@sip.linphone.org`. Linphone desktop is available for Windows, Mac, Linux.
- **LiveKit SIP trunk:** Requires a LiveKit Cloud account with SIP enabled, or a self-hosted LiveKit SIP bridge. The `LIVEKIT_SIP_TRUNK_ID` is obtained from the LiveKit dashboard after configuring an outbound trunk pointing to `sip.linphone.org`.
- **`ctx.job.metadata` in agent:** LiveKit Agents SDK provides `ctx.job.metadata` as a string on `AgentDispatch` jobs. Parse it with `json.loads(ctx.job.metadata or "{}")`.
- **call_status events:** These are published on the same `vidya-tools` LiveKit data channel used by Day 5 tool events. The `useToolEvents` hook already subscribes to this topic — `useCallStatus` filters by `type === "call_status"`.
- **No Twilio:** The entire telephony path uses LiveKit SIP + Linphone. No Twilio SDK, no Twilio account required.
- **SCHEDULER_ENABLED guard:** Add `if os.getenv("SCHEDULER_ENABLED") == "1": asyncio.create_task(run_scheduler())` near the end of `my_agent()` or in a startup hook so the scheduler only runs when explicitly opted in.
- **ALTER TABLE idempotency:** SQLite doesn't support `IF NOT EXISTS` for `ALTER TABLE ADD COLUMN`. Wrap each in `try/except sqlite3.OperationalError` and ignore the "duplicate column name" error.
