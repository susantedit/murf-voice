# Implementation Plan: vidya-day8-dashboard

## Overview

Day 8 adds a read-only Call Analytics Dashboard to Vidya. The work splits into
five ordered layers: schema migration → agent session tracking → analytics
repository → dashboard REST API → dashboard UI page. Backend tests (pytest +
Hypothesis) and frontend tests (Jest/Vitest + RTL) are written alongside each
layer. All Day 1–7 features remain untouched.

## Tasks

- [x] 1. Schema migration — add `outcome` column to `call_history`
  - [x] 1.1 Add idempotent `ALTER TABLE` migration in `backend/src/db/database.py`
    - Inside `init_db()`, after the existing Day 6 `contextlib.suppress` block, add:
      ```python
      with contextlib.suppress(sqlite3.OperationalError):
          conn.execute("ALTER TABLE call_history ADD COLUMN outcome TEXT")
      ```
    - `contextlib` is already imported in this block — no new import needed
    - _Requirements: 1.1, 8.8_

  - [x] 1.2 Write Property 1 — `init_db()` idempotency for `outcome` column
    - **Property 1: init_db() idempotency**
    - **Validates: Requirements 1.1, 8.8**
    - Create `backend/tests/test_analytics_repository.py` (new file)
    - Add `isolated_db` fixture: creates a temp SQLite file, monkeypatches `DB_PATH`, calls `init_db()`, yields, then removes the file
    - Add `@given(st.integers(min_value=2, max_value=5))` test that calls `init_db()` N times on a fresh temp DB and asserts the `outcome` column exists in `PRAGMA table_info(call_history)` and no exception is raised
    - Minimum 100 iterations via `@settings(max_examples=100)`
    - _Requirements: 1.1, 8.8_

- [x] 2. `call_repository.update_call()` — add `outcome` keyword argument
  - [x] 2.1 Add `outcome: str | None = None` parameter to `update_call` signature
    - In `backend/src/db/call_repository.py`, extend the `fields` dict in `update_call` to include `"outcome": outcome`
    - The existing `{k: v for k, v in fields.items() if v is not None}` filter handles it automatically — no extra logic needed
    - _Requirements: 1.3, 1.4_

  - [x] 2.2 Write Property 4 — `update_call` persists outcome
    - **Property 4: update_call persists outcome**
    - **Validates: Requirements 1.3, 1.4**
    - In `test_analytics_repository.py`, add `@given(st.sampled_from(["success", "failure"]))` test that:
      1. Inserts a test user row into `users` and a `call_history` row with `status='answered'`
      2. Calls `call_repository.update_call(call_id, outcome=outcome_value)`
      3. Reads the row back and asserts `row["outcome"] == outcome_value`
    - Minimum 100 iterations
    - _Requirements: 1.3, 1.4_

- [x] 3. `exercise_repository` — add `has_attempt_in_window` helper
  - [x] 3.1 Implement `has_attempt_in_window` in `backend/src/db/exercise_repository.py`
    - Add function with signature: `def has_attempt_in_window(user_id: str, started_at: str | None, ended_at: str) -> bool`
    - Return `False` immediately if `started_at is None`
    - Query `exercise_attempts` with `WHERE user_id = ? AND attempted_at >= ? AND attempted_at <= ? LIMIT 1`
    - Return `row is not None`
    - _Requirements: 1.2, 1.5_

- [ ] 4. `agent.py` — session tracking and outcome persistence
  - [x] 4.1 Initialise `_call_start_time` in `Assistant.__init__`
    - Add `self._call_start_time: str | None = None` on the line after `self._call_id: int | None = None`
    - _Requirements: 1.8, 7.4_

  - [x] 4.2 Insert call row at session start in `on_enter`
    - At the end of `on_enter`, after the greeting branch (both inbound and outbound), add a try/except block:
      ```python
      from datetime import datetime, timezone
      started_at = datetime.now(timezone.utc).isoformat()
      try:
          self._call_id = call_repository.insert_call(self._user_id, started_at)
          self._call_start_time = started_at
      except Exception:
          logger.error("insert_call failed for user_id=%r — call tracking disabled", self._user_id)
          self._call_id = None
          self._call_start_time = None
      ```
    - Ensure `call_repository` is already imported at the top of the file (it is)
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [x] 4.3 Add `_compute_and_persist_outcome` coroutine to `Assistant`
    - Add a new `async def _compute_and_persist_outcome(self) -> None` method:
      - If `self._is_outbound`: `outcome = "success"`
      - Else: `ended_at = datetime.now(timezone.utc).isoformat()`, call `await asyncio.to_thread(exercise_repository.has_attempt_in_window, self._user_id, self._call_start_time, ended_at)`, set `outcome = "success" if has_attempt else "failure"`
      - If `self._call_id is None`: log WARNING including `call_id=None` and the computed outcome string, then `return`
      - Otherwise: call `call_repository.update_call(self._call_id, outcome=outcome)` inside a try/except that logs ERROR and swallows the exception
    - Ensure `exercise_repository` is imported at the top of the file (add import if missing)
    - _Requirements: 1.2, 1.3, 1.5, 1.6, 1.7_

  - [x] 4.4 Call `_compute_and_persist_outcome` at session end
    - Hook `_compute_and_persist_outcome` into the agent's session-end lifecycle
    - In `my_agent`, after `agent.start(ctx.room)`, register a shutdown callback: `ctx.add_shutdown_callback(agent._compute_and_persist_outcome)` or hook into the equivalent LiveKit session-end event
    - If `on_session_end` or `aclose` is the correct hook for this SDK version, use that instead — check existing patterns in the file
    - _Requirements: 1.2, 1.3_

  - [x] 4.5 Write Property 2 — inbound outcome computation correctness
    - **Property 2: Inbound outcome computation correctness**
    - **Validates: Requirements 1.2, 1.5**
    - In `test_analytics_repository.py`, add a composite Hypothesis strategy that generates:
      - A random UTC `call_start` datetime
      - A list of `attempted_at` timestamps, some inside `[call_start, call_start + delta]`, some outside
    - Insert them into the isolated DB and call `exercise_repository.has_attempt_in_window`
    - Assert return value is `True` iff at least one timestamp falls within the window
    - Minimum 100 iterations
    - _Requirements: 1.2, 1.5_

  - [x] 4.6 Write Property 3 — outbound calls always yield `'success'`
    - **Property 3: Outbound calls always yield 'success'**
    - **Validates: Requirements 1.6**
    - Add `@given(st.text(min_size=1), st.lists(st.text()))` test that instantiates an `Assistant(user_id=uid, is_outbound=True)`, sets `_call_start_time` to a timestamp, and asserts that `_is_outbound` being `True` would route to `outcome = "success"` regardless of attempt list
    - This can be a pure unit test (no DB needed): assert the branch logic directly
    - Minimum 100 iterations
    - _Requirements: 1.6_

- [x] 5. Analytics Repository — `backend/src/db/analytics_repository.py`
  - [x] 5.1 Create `analytics_repository.py` with `get_dashboard_metrics()`
    - Create `backend/src/db/analytics_repository.py`
    - Add the try/except import for `get_connection` matching the pattern in other repository files
    - Implement `get_dashboard_metrics() -> dict` using a single `SELECT COUNT(*), SUM(CASE …) AS successful_calls, SUM(CASE …) AS failed_calls FROM call_history WHERE status = 'answered'` query
    - Return `{"total_calls": int(row["total_calls"] or 0), "successful_calls": int(row["successful_calls"] or 0), "failed_calls": int(row["failed_calls"] or 0)}`
    - Do NOT catch exceptions — let them propagate to the caller
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 6.1, 6.3_

  - [x] 5.2 Write unit tests for `get_dashboard_metrics` in `test_analytics_repository.py`
    - Empty `call_history` → `{"total_calls": 0, "successful_calls": 0, "failed_calls": 0}`
    - Mix of `answered` and `missed` rows → only `answered` rows are counted in `total_calls`
    - `outcome = 'success'` rows increment `successful_calls`
    - `outcome = 'failure'` rows increment `failed_calls`
    - `outcome IS NULL` rows increment `failed_calls` (not `successful_calls`)
    - DB error propagates: monkeypatch `get_connection` to raise `sqlite3.OperationalError`; assert the exception is not swallowed
    - _Requirements: 2.3, 2.4, 2.5, 2.7, 2.8_

  - [x] 5.3 Write Property 5 — dashboard metrics invariant and key contract
    - **Property 5: Dashboard metrics invariant and key contract**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 6.1, 6.3**
    - Add a composite strategy that builds a random list of `call_history` rows with varying `status` (`'answered'`, `'missed'`) and `outcome` (`'success'`, `'failure'`, `None`)
    - Insert them into the isolated DB, call `get_dashboard_metrics()`, and assert:
      1. Returned dict has exactly the keys `{"total_calls", "successful_calls", "failed_calls"}`
      2. `successful_calls + failed_calls == total_calls`
      3. All three values are non-negative integers
    - Minimum 100 iterations
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 6.1, 6.3_

- [x] 6. Dashboard REST API — `GET /dashboard/metrics` in `memory_server.py`
  - [x] 6.1 Add import for `get_dashboard_metrics` in `memory_server.py`
    - Add the try/except import block after the existing repository imports:
      ```python
      try:
          from db.analytics_repository import get_dashboard_metrics
      except ImportError:
          from src.db.analytics_repository import get_dashboard_metrics  # type: ignore[no-redef]
      ```
    - _Requirements: 3.1, 3.2_

  - [x] 6.2 Add `GET /dashboard/metrics` route to `do_GET`
    - At the top of `do_GET`, before the `/escalations` check, add:
      ```python
      if self.path in ("/dashboard/metrics", "/dashboard/metrics/"):
          try:
              metrics = get_dashboard_metrics()
              self._send_json(200, metrics)
          except Exception:
              logger.exception("Error in GET /dashboard/metrics")
              self._send_json(500, {"error": "internal_error"})
          return
      ```
    - CORS and OPTIONS are already handled globally — no extra code needed
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 6.3 Write Property 6 — dashboard API response contains no personal data
    - **Property 6: Dashboard API response contains no personal data**
    - **Validates: Requirements 3.1, 3.4, 6.1, 6.2**
    - In `test_analytics_repository.py`, add a Hypothesis test that:
      1. Builds a random `call_history` state (same composite strategy as Property 5)
      2. Makes an in-process call to `get_dashboard_metrics()`
      3. Serialises the result with `json.dumps` and asserts the JSON string does NOT contain any of: `user_id`, `name`, `sip_uri`, `preferred_time`, `topic`, `performance`
      4. Asserts the key set is exactly `{"total_calls", "successful_calls", "failed_calls"}`
    - Minimum 100 iterations
    - _Requirements: 3.1, 3.4, 6.1, 6.2_

- [x] 7. Frontend environment variable — `frontend/.env.example`
  - [x] 7.1 Document `NEXT_PUBLIC_MEMORY_API_URL` in `frontend/.env.example`
    - Append the following block to `frontend/.env.example`:
      ```dotenv
      # -----------------------------------------------------------------------------
      # Backend memory / analytics API base URL
      # Used by the Call Analytics Dashboard (Day 8) and other pages that query
      # the backend REST API (memory, calls, escalations).
      # Default: http://localhost:8888 — no need to set this for local development.
      # -----------------------------------------------------------------------------
      # NEXT_PUBLIC_MEMORY_API_URL=http://localhost:8888
      ```
    - Do NOT add `NEXT_PUBLIC_MEMORY_API_URL` to `frontend/.env.local`
    - _Requirements: 5.1, 5.4_

- [x] 8. Dashboard UI Page — `frontend/app/dashboard/page.tsx`
  - [x] 8.1 Create `frontend/app/dashboard/page.tsx` with metadata export and `DashboardClient` shell
    - Export `metadata: Metadata` with `title: "Call Analytics | Vidya"` and `description: "Aggregate call performance metrics for Vidya AI Learning Assistant"`
    - Create a `'use client'` `DashboardClient` component (default export from the same file)
    - Initialise state: `metrics: DashboardMetrics | null`, `status: "idle" | "loading" | "success" | "error"`, `lastUpdated: Date | null`, `error: string | null`
    - Derive `BASE_URL` as `process.env.NEXT_PUBLIC_MEMORY_API_URL?.trim() || "http://localhost:8888"`
    - _Requirements: 4.1, 5.2, 5.3, 6.4_

  - [x] 8.2 Implement `fetchMetrics` function and `useEffect` on mount
    - Inside `DashboardClient`, define `fetchMetrics` that:
      1. Sets `status` to `"loading"`
      2. `fetch`es `${BASE_URL}/dashboard/metrics`
      3. On success (`response.ok`): sets `metrics`, `status = "success"`, `error = null`, updates `lastUpdated` to `new Date()`
      4. On non-200 or network error: sets `status = "error"`, `error = "Could not load dashboard data. Is the backend running?"` — does NOT update `lastUpdated`
    - Call `fetchMetrics()` inside `useEffect([], [])` on mount
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.9_

  - [x] 8.3 Implement Refresh button with concurrent-fetch semantics
    - Add a "Refresh" `<button>` that calls `fetchMetrics()` on click
    - Track in-flight requests with a ref holding the current fetch's controller
    - When `fetchMetrics` is called while another is in-progress: start the new fetch without aborting the old one — whichever resolves first updates state
    - Show the button as disabled (with visual affordance) while `status === "loading"`
    - _Requirements: 4.10_

  - [x] 8.4 Implement `MetricCard` sub-component
    - Define `interface MetricCardProps { label: string; value: number | null; accentVariant: "green" | "red" | "neutral" }`
    - Render the label, and either the numeric value, `—` (when `value` is `null`), or a skeleton placeholder (while loading)
    - Apply Tailwind classes based on `accentVariant`: green border/text for `"green"`, red for `"red"`, neutral gray for `"neutral"`
    - _Requirements: 4.2, 4.4, 4.5, 4.6, 4.7_

  - [x] 8.5 Wire up metric cards, loading state, error state, and last-updated timestamp
    - Render three `<MetricCard>` components:
      - "Total Calls" — `value={metrics?.total_calls ?? null}`, `accentVariant="neutral"`
      - "Successful Calls" — `value={metrics?.successful_calls ?? null}`, `accentVariant={metrics && metrics.successful_calls > 0 ? "green" : "neutral"}`
      - "Failed Calls" — `value={metrics?.failed_calls ?? null}`, `accentVariant={metrics && metrics.failed_calls > 0 ? "red" : "neutral"}`
    - While `status === "loading"`: show skeleton divs in place of values
    - When `status === "error"`: display the error message string above the cards; show `—` in each card
    - Render `<h1>Call Analytics</h1>` page title
    - Render "Last updated: HH:MM:SS" only when `lastUpdated` is non-null; format with `toLocaleTimeString()`; do not update the timestamp during an in-progress fetch
    - Do not render any per-learner data (no names, phone numbers, SIP URIs, transcripts)
    - _Requirements: 4.2, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 6.2_

- [x] 9. Frontend tests — `MetricCard` and `DashboardClient`
  - [x] 9.1 Write unit tests for `MetricCard`
    - Use the existing test framework in the frontend (Jest or Vitest + RTL — check `package.json`)
    - Create `frontend/app/dashboard/__tests__/page.test.tsx`
    - `MetricCard` renders label and numeric value
    - `MetricCard` applies green CSS class when `accentVariant='green'`
    - `MetricCard` applies red CSS class when `accentVariant='red'`
    - `MetricCard` renders `—` when `value` is `null`
    - `metadata.title` equals `"Call Analytics | Vidya"`
    - _Requirements: 4.2, 4.7, 6.4_

  - [x] 9.2 Write unit tests for `DashboardClient` fetch behaviour
    - Mock `global.fetch` with `jest.fn()` or `vi.fn()`
    - `DashboardClient` shows loading state on initial render (before fetch resolves)
    - `DashboardClient` shows metric values after successful fetch with `{ total_calls: 5, successful_calls: 3, failed_calls: 2 }`
    - `DashboardClient` shows error message and `—` placeholders after a failed fetch (non-200)
    - `DashboardClient` does NOT update `lastUpdated` after a failed fetch
    - `DashboardClient` DOES update `lastUpdated` only after a successful fetch
    - Clicking the Refresh button triggers a new `fetch` call
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.9, 4.10, 5.2_

- [x] 10. Regression gate — lint, tests, and build
  - [x] 10.1 Run `uv run ruff check .` in `backend/` — assert exit code 0
    - Fix any lint errors introduced by Day 8 changes before proceeding
    - _Requirements: 8.1_

  - [x] 10.2 Run `uv run pytest` in `backend/` — assert all tests pass
    - Confirm `test_memory.py`, `test_exercise_service.py`, `test_agent.py`, `test_escalation.py`, `test_call_scheduler.py`, and the new `test_analytics_repository.py` all pass
    - _Requirements: 8.2_

  - [x] 10.3 Run `pnpm build` in `frontend/` — assert exit code 0 and zero TypeScript errors
    - Fix any type errors in `frontend/app/dashboard/page.tsx` before marking done
    - _Requirements: 6.5, 8.3_

## Notes

- `contextlib` is already imported in `database.py` — the `init_db` migration in Task 1.1 requires no new import.
- `call_repository` is already imported in `agent.py` — no new top-level import needed for Tasks 4.2–4.4.
- `exercise_repository` may need to be imported in `agent.py` for Task 4.3 — check the existing imports and add if absent.
- All Hypothesis property tests live in `backend/tests/test_analytics_repository.py` (new file). Use the `isolated_db` fixture (temp SQLite file + monkeypatched `DB_PATH`) consistent with the pattern in `test_call_repository.py` and `test_memory.py`.
- The `do_OPTIONS` handler in `memory_server.py` already calls `_send_cors_preflight()` unconditionally — CORS preflight for `/dashboard/metrics` requires no additional code.
- The `DashboardClient` "first-response-wins" behaviour for concurrent fetches means both fetches remain in flight; do NOT abort the old one — just replace the controller reference so the new one can also be tracked.
- Frontend test framework should match what's already configured in `frontend/package.json` — check before creating test files.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1", "7.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "4.1", "5.1"] },
    { "id": 2, "tasks": ["4.2", "4.5", "5.2", "6.1"] },
    { "id": 3, "tasks": ["4.3", "4.6", "5.3", "6.2", "8.1"] },
    { "id": 4, "tasks": ["4.4", "6.3", "8.2", "8.3", "8.4"] },
    { "id": 5, "tasks": ["8.5", "9.1"] },
    { "id": 6, "tasks": ["9.2"] },
    { "id": 7, "tasks": ["10.1", "10.2", "10.3"] }
  ]
}
```








