# Requirements Document

## Introduction

Day 8 adds a **Call Analytics Dashboard** to Vidya, the voice-based AI learning companion for Class 10 Science students. The dashboard surfaces three top-level metrics — Total Calls, Successful Calls, and Failed Calls — derived from real call data already stored in the `call_history` SQLite table.

A **successful call** is defined as a call session during which the learner completed at least one exercise (i.e., `score_answer` returned any result — correct, incorrect, or partially_correct — at least once during that session). All other answered calls are counted as **failed** calls. Calls with a status other than `answered` (e.g., `missed`) are excluded from success/failure counts but are included in the total when relevant aggregate queries are run.

All Day 1–7 features (memory, exercises, outbound SIP calls, escalation, activity panel, frontend UI) continue to work unchanged. Day 8 adds analytics capability on top.

---

## Glossary

| Term | Definition |
|---|---|
| **Call** | A single row in the `call_history` table representing one voice session between a learner and Vidya |
| **Successful Call** | A call during which the learner completed at least one exercise (i.e., at least one `exercise_attempts` row exists for the same `user_id` with an `attempted_at` timestamp that falls within the call's `started_at`–`ended_at` window) |
| **Failed Call** | An `answered` call that is not a Successful Call |
| **Dashboard_API** | The new `GET /dashboard/metrics` HTTP endpoint served by `memory_server.py` |
| **Analytics_Repository** | The new Python module `backend/src/db/analytics_repository.py` responsible for all dashboard aggregate queries |
| **Dashboard_Page** | The new Next.js page at `frontend/app/dashboard/page.tsx` that renders the three metric cards |
| **Metric Card** | A UI component displaying a single labelled numeric value (Total Calls, Successful Calls, Failed Calls) |
| **call_history** | The existing SQLite table at `backend/data/vidya.db` tracking every call session |
| **exercise_attempts** | The existing SQLite table recording every scored answer, used to detect exercise completion within a call |
| **MEMORY_API_URL** | The frontend environment variable pointing at the backend HTTP server (e.g., `http://localhost:8888`) |

---

## Requirements

---

### Requirement 1: Define and Persist Call Outcome at Session End

**User Story:** As a product owner, I want every Vidya call to record whether the learner completed an exercise, so that success metrics are grounded in real learning activity.

#### Acceptance Criteria

1. THE `call_history` table SHALL gain an `outcome` column (`TEXT`, nullable, default `NULL`) added via an idempotent `ALTER TABLE … ADD COLUMN` migration in `init_db()`, using `contextlib.suppress(sqlite3.OperationalError)` so the migration is safe to call when the column already exists.
2. WHEN a LiveKit agent session ends (the `on_session_end` or equivalent lifecycle hook fires in `agent.py`), THE Agent SHALL compute the call outcome as `'success'` if at least one `exercise_attempts` row exists for `self._user_id` with `attempted_at` between `self._call_start_time` and the current UTC time, or `'failure'` otherwise.
3. WHEN the outcome is computed and `self._call_id` is not `None`, THE Agent SHALL call `call_repository.update_call(self._call_id, outcome=outcome)` to persist the result.
4. THE `call_repository.update_call` function SHALL accept an `outcome` keyword argument and include it in the `SET` clause when non-`None`.
5. WHEN `self._is_outbound is False` (inbound session) and the learner completes at least one exercise, THE `call_history` row SHALL have `outcome = 'success'`. WHEN `self._is_outbound is False` and the learner completes zero exercises, THE `call_history` row SHALL have `outcome = 'failure'`.
6. WHEN `self._is_outbound is True` (outbound SIP session), THE `call_history` row SHALL always have `outcome = 'success'` regardless of whether the learner completed any exercise — the outbound call itself is the success event.
7. IF `self._call_id` is `None` at session end (no row was inserted), THE Agent SHALL compute the outcome as normal, log a warning at `WARNING` level that includes both `call_id=None` and the computed outcome string for debugging visibility, and SHALL NOT raise an exception.
8. THE `Assistant.__init__` method SHALL initialise `self._call_start_time: str | None = None` alongside `self._call_id: int | None = None` so the attribute is always defined before any lifecycle hook references it.

---

### Requirement 2: Analytics Repository — Aggregate Queries

**User Story:** As a developer, I want a dedicated analytics module that computes dashboard metrics from the database, so that the API layer stays thin and queries are testable in isolation.

#### Acceptance Criteria

1. THE `Analytics_Repository` SHALL be created at `backend/src/db/analytics_repository.py` and expose a function `get_dashboard_metrics() -> dict` that returns a single dict.
2. THE returned dict from `get_dashboard_metrics()` SHALL contain exactly these three keys — `total_calls` (int), `successful_calls` (int), `failed_calls` (int) — and no additional keys.
3. `total_calls` SHALL equal the count of all rows in `call_history` where `status = 'answered'`.
4. `successful_calls` SHALL equal the count of rows in `call_history` where `status = 'answered'` AND `outcome = 'success'`.
5. `failed_calls` SHALL equal the count of rows in `call_history` where `status = 'answered'` AND (`outcome = 'failure'` OR `outcome IS NULL`).
6. THE invariant `successful_calls + failed_calls = total_calls` SHALL always hold for the values returned by `get_dashboard_metrics()`.
7. WHEN the `call_history` table is empty, `get_dashboard_metrics()` SHALL return `{"total_calls": 0, "successful_calls": 0, "failed_calls": 0}` without error.
8. IF a database error occurs inside `get_dashboard_metrics()`, THE function SHALL allow the exception to propagate uncaught to the caller — it SHALL NOT silently return zeros for a genuine DB failure.
9. THE `call_history` table MUST have the `outcome` column (added by the migration in Requirement 1) before `get_dashboard_metrics()` is called; the function MAY assume the column exists.

---

### Requirement 3: Dashboard REST API Endpoint

**User Story:** As the frontend, I need a single REST endpoint that returns the three call metrics, so the dashboard page can render real numbers without touching the database directly.

#### Acceptance Criteria

1. WHEN a `GET /dashboard/metrics` request is received, THE Dashboard_API SHALL return HTTP 200 with a JSON body containing exactly: `{"total_calls": <int>, "successful_calls": <int>, "failed_calls": <int>}`.
2. THE `GET /dashboard/metrics` endpoint SHALL be handled inside `memory_server.py`'s `do_GET` method and SHALL serve the same port as existing routes (`/memory/`, `/calls/`, `/escalations`).
3. THE Dashboard_API SHALL include CORS headers matching the existing `_CORS_HEADERS` list in `memory_server.py` so the Next.js frontend can fetch it from a different port without errors.
4. WHEN the database query succeeds, THE response body SHALL contain only the three metric keys — no user identifiers, names, phone numbers, SIP URIs, conversation transcripts, or other personal data.
5. IF the database query throws an exception, THE Dashboard_API SHALL return HTTP 500 with `{"error": "internal_error"}` and SHALL log the exception before responding.
6. THE endpoint SHALL respond to `OPTIONS /dashboard/metrics` with the CORS preflight response (HTTP 200, no body) so browser-based fetch works correctly.

---

### Requirement 4: Dashboard UI Page

**User Story:** As a tutor or product manager, I want a simple web page that shows Total Calls, Successful Calls, and Failed Calls in real time, so I can monitor learning outcomes without accessing the database.

#### Acceptance Criteria

1. THE `Dashboard_Page` SHALL be created at `frontend/app/dashboard/page.tsx` and SHALL be accessible at the `/dashboard` route.
2. THE `Dashboard_Page` SHALL render three Metric Cards: one labelled "Total Calls", one labelled "Successful Calls", and one labelled "Failed Calls".
3. WHEN the page loads, THE `Dashboard_Page` SHALL fetch data from `GET /dashboard/metrics` using the `NEXT_PUBLIC_MEMORY_API_URL` environment variable as the base URL (defaulting to `http://localhost:8888` if the variable is absent).
4. WHILE the fetch is in progress, THE `Dashboard_Page` SHALL display a loading state (e.g., skeleton placeholders or a spinner) in place of the numeric values.
5. WHEN the fetch succeeds and the response body contains `total_calls`, `successful_calls`, and `failed_calls` as integers, THE `Dashboard_Page` SHALL replace the loading state with those numeric values.
6. WHEN the fetch fails (network error, timeout, or non-200 response), THE `Dashboard_Page` SHALL display an error message (e.g., "Could not load dashboard data. Is the backend running?"), SHALL show placeholder dashes `—` in the Metric Cards instead of numeric values, and SHALL NOT display zeros as if they were real data.
7. THE Metric Cards SHALL use accent colours that reflect data state: "Successful Calls" uses a green accent when `successful_calls > 0`, "Failed Calls" uses a red accent when `failed_calls > 0`, and both cards SHALL use a neutral accent when their value is zero, during the loading state, or when data is unavailable.
8. THE `Dashboard_Page` SHALL NOT display any personal data — specifically no learner names, phone numbers, SIP URIs, passwords, OTPs, PINs, account numbers, or conversation transcripts.
9. THE `Dashboard_Page` SHALL include a page title ("Call Analytics") and a "Last updated" timestamp in `HH:MM:SS` local time format showing when the data was last successfully fetched; the timestamp SHALL NOT update while a fetch is in progress.
10. THE `Dashboard_Page` SHALL include a "Refresh" button. WHEN the "Refresh" button is clicked, THE page SHALL immediately start a new fetch request. IF a prior fetch is still in progress when the button is clicked, THE page SHALL start the new fetch without waiting for the prior request to complete, and the first response that arrives SHALL update the metrics.

---

### Requirement 5: Frontend Environment Variable

**User Story:** As a developer, I want the backend API URL documented as a frontend environment variable, so I can point the dashboard at any deployed backend without changing source code.

#### Acceptance Criteria

1. THE `frontend/.env.example` file SHALL document `NEXT_PUBLIC_MEMORY_API_URL` with a comment that states its purpose (backend memory/analytics API base URL) and its default value (`http://localhost:8888`).
2. WHEN `NEXT_PUBLIC_MEMORY_API_URL` is absent from the environment OR is set to an empty string, THE `Dashboard_Page` SHALL render without error and SHALL use `http://localhost:8888` as the base URL for all API calls.
3. WHEN `NEXT_PUBLIC_MEMORY_API_URL` is set to a well-formed absolute URL beginning with `http://` or `https://`, THE `Dashboard_Page` SHALL use that value as the base URL such that the outbound request URL begins with that value (e.g., `<NEXT_PUBLIC_MEMORY_API_URL>/dashboard/metrics`).
4. THE `frontend/.env.local` file SHALL NOT contain a `NEXT_PUBLIC_MEMORY_API_URL` key (not even as a comment) unless the developer explicitly adds it — it is opt-in.

---

### Requirement 6: Data Privacy — No Sensitive Data Exposure

**User Story:** As a student, I want to be assured that the analytics dashboard never reveals my personal details, credentials, or what I said during a call, so my privacy is protected.

#### Acceptance Criteria

1. THE `GET /dashboard/metrics` response body SHALL contain exactly three keys — `total_calls`, `successful_calls`, `failed_calls` — and no other fields; any row-level detail (including `user_id`, `name`, `sip_uri`, `preferred_time`, call transcripts, or escalation summaries) is prohibited.
2. THE `Dashboard_Page` SHALL NOT render any per-learner information — only the three aggregate numbers and the generic metadata (title, last-updated timestamp) are displayed.
3. THE `Analytics_Repository` SQL queries SHALL SELECT only `COUNT(*)` aggregates and SHALL NOT SELECT the columns `user_id`, `name`, `sip_uri`, `preferred_time`, `topic`, `performance`, `status` (row-level), or any column from the `users` table.
4. THE `Dashboard_Page` SHALL export a Next.js `Metadata` object with a `title` of `"Call Analytics | Vidya"` and a `description` of `"Aggregate call performance metrics for Vidya AI Learning Assistant"` — neither value SHALL reference any individual learner.
5. WHEN `pnpm build` runs in `frontend/`, THE build SHALL complete with exit code 0 and no TypeScript errors.

---

### Requirement 7: Call Session Tracking — Agent Startup

**User Story:** As the system, I need the agent to record the start of a call in the database at session begin, so that the call's outcome can be updated at the end.

#### Acceptance Criteria

1. WHEN the first human participant has joined and `on_enter` begins executing, THE Agent SHALL compute `started_at` as the current UTC time in ISO 8601 format (e.g., `"2026-08-13T10:30:00.000000+00:00"`), call `call_repository.insert_call(user_id, started_at)`, and store the returned integer id in `self._call_id`.
2. WHEN `call_repository.insert_call` is called for a session where `self._is_outbound is False` (browser-based inbound session), THE `call_history` row SHALL have `status = 'answered'`.
3. IF `call_repository.insert_call` raises an exception, THE Agent SHALL log the error, set both `self._call_id = None` and `self._call_start_time = None`, and continue the session — call tracking failure SHALL NOT prevent the learner from talking to Vidya.
4. THE `Assistant.__init__` method SHALL initialise `self._call_start_time: str | None = None` alongside the existing `self._call_id: int | None = None` attribute so both are always defined before any hook references them.
5. WHEN `call_repository.insert_call` succeeds, THE Agent SHALL set `self._call_start_time` to the same `started_at` UTC ISO 8601 string that was passed to the insert call.

---

### Requirement 8: Day 1–7 Regression

**User Story:** As the project owner, I want all existing features to continue working after Day 8 changes, so no learner is disrupted.

#### Acceptance Criteria

1. WHEN `uv run ruff check .` runs in `backend/`, THE check SHALL exit with code 0 and produce no error-level diagnostics.
2. WHEN `uv run pytest` runs in `backend/`, all collected test files SHALL pass — at minimum `test_memory.py`, `test_exercise_service.py`, `test_agent.py`, `test_escalation.py`, and `test_call_scheduler.py`; any additional collected test files SHALL also pass.
3. WHEN `pnpm build` runs in `frontend/`, THE build SHALL complete with exit code 0 and no TypeScript errors.
4. WHEN a student connects via the web browser (inbound session), THE LiveKit connection SHALL establish successfully, the agent SHALL emit a greeting within 10 seconds of the participant joining, and all existing `@function_tool` method signatures SHALL remain unchanged.
5. WHEN a returning learner connects and `get_learner_memory` returns `found=True` and `name` is non-empty, THE Agent SHALL include the learner's name in the greeting. WHEN `get_learner_memory` returns `found=True` and `topics` is non-empty, THE Agent SHALL reference the most recent topic in the greeting.
6. WHEN a learner requests an exercise inbound, `get_next_exercise` SHALL fire and THE Agent SHALL emit an `exercise_ready` data-channel event containing a non-empty `question` field, and the Exercise Card SHALL appear in the activity panel.
7. WHEN `DISCORD_WEBHOOK_URL` is absent from the environment, THE backend SHALL reach a ready state without raising an unhandled exception, and `send_discord_notification` SHALL return `False` for any escalation created during that session.
8. THE `init_db()` migration that adds the `outcome` column to `call_history` SHALL use `contextlib.suppress(sqlite3.OperationalError)` so that calling `init_db()` when the column already exists raises no error.
