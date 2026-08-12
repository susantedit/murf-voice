# Requirements Document

## Introduction

Day 7 adds **Human Escalation** to Vidya, the voice-based AI learning companion for Indian school students. When Vidya cannot adequately help a learner — because the learner is emotionally distressed or has failed the same topic three or more times in a session — Vidya pauses, asks explicit permission, and creates a structured **Teacher Support Request**. The request is persisted in SQLite, assigned a unique reference ID (e.g. `VID-7A42K9`), and forwarded to a Discord channel via a webhook so a human teacher is notified in near real-time.

All Day 1–6 features (memory, exercises, outbound SIP calls, activity panel, frontend UI) continue to work unchanged. Day 7 adds escalation capability on top.

---

## Glossary

| Term | Definition |
|---|---|
| **Escalation** | A structured Teacher Support Request created when Vidya cannot adequately help a learner |
| **Reference ID** | A unique 10-character identifier in the format `VID-XXXXXX` assigned to each escalation |
| **Escalation_Service** | The Python module `backend/src/services/escalation_service.py` responsible for all escalation business logic |
| **Escalation_Repository** | The Python module `backend/src/db/escalation_repository.py` that persists escalation records to SQLite |
| **Discord_Notifier** | The component inside Escalation_Service that sends a formatted Discord embed message via HTTP POST |
| **Trigger** | A condition (emotional distress or repeated failure) that causes Vidya to offer escalation |
| **Consent Flow** | The mandatory agent dialogue asking the learner for explicit permission before creating an escalation |
| **DISCORD_WEBHOOK_URL** | Environment variable holding the full Discord webhook URL; when absent, Discord notification is skipped and a warning is logged |
| **Urgency** | Classification of escalation severity: `low`, `medium`, or `high` |
| **Session failure count** | An in-session counter (held in `Assistant._topic_failure_counts`) tracking wrong answers per topic within a single LiveKit session |
| **Vidya** | The AI learning assistant — the LiveKit Agents–based voice agent defined in `backend/src/agent.py` |
| **create_escalation tool** | The `@function_tool` method on the `Assistant` class that the LLM calls to initiate a Teacher Support Request |

---

## Requirements

---

### Requirement 1: Escalation Trigger — Emotional Distress

**User Story:** As a student who is frustrated or wants to give up, I want Vidya to recognize my emotional state and offer to connect me with a human teacher, so I feel supported rather than abandoned.

#### Acceptance Criteria

1. WHEN a learner's spoken message contains distress signals such as "I give up", "I'm so frustrated", "I can't do this", "I hate this", "I don't understand anything", "I keep getting everything wrong", "I don't want to study anymore", or equivalent Hindi/Hinglish expressions in Devanagari script THEN THE Vidya SHALL respond empathetically and offer to create a Teacher Support Request.
2. WHEN the distress trigger fires THEN THE Vidya SHALL NOT immediately call `create_escalation` — it MUST first obtain explicit consent per Requirement 3.
3. WHEN a learner expresses mild confusion without distress signals THEN THE Vidya SHALL attempt to explain the concept again and SHALL NOT trigger the escalation consent flow.
4. THE Vidya SHALL classify emotional-distress escalations with `reason="learner_frustrated"` and `urgency="high"` — if the system determines a different classification based on context, it SHALL proceed with that classification without validation correction.
5. WHEN the distress trigger fires THEN THE Vidya SHALL set `urgency="high"` in the subsequent `create_escalation` call if consent is granted.

---

### Requirement 2: Escalation Trigger — Repeated Topic Failure

**User Story:** As a student who keeps getting the same topic wrong, I want Vidya to offer human help after three consecutive failures so I don't continue struggling alone.

#### Acceptance Criteria

1. THE Assistant SHALL maintain an in-session topic failure counter (`_topic_failure_counts: dict[str, int]`) that is initialised to an empty dict on session start.
2. WHEN `score_answer` returns `result="incorrect"` for a given topic THEN THE Assistant SHALL increment `_topic_failure_counts[topic]` by 1.
3. WHEN `_topic_failure_counts[topic]` reaches 3 for any topic THEN THE Vidya SHALL offer to create a Teacher Support Request for that topic.
4. WHEN the repeated-failure trigger fires and explicit consent has been obtained THEN THE Vidya SHALL proceed with calling `create_escalation` immediately.
5. THE Vidya SHALL classify repeated-failure escalations with `reason="repeated_topic_failure"` and `urgency="medium"`.
6. WHEN a learner gets a correct answer on a topic THEN THE Assistant SHALL reset `_topic_failure_counts[topic]` to 0 for that topic.
7. WHEN the escalation consent flow is already active for a topic THEN THE Assistant SHALL NOT re-offer escalation for additional wrong answers on the same topic in the same session.

---

### Requirement 3: Mandatory Consent Flow Before Escalation

**User Story:** As a student, I want to be asked for permission before any information about me is shared with a teacher, so I remain in control of my own data.

#### Acceptance Criteria

1. WHEN either escalation trigger fires THEN THE Vidya SHALL ask for explicit permission using the language that mirrors the learner's current session language.
2. WHEN the session language is Hindi or Hinglish THEN THE Vidya SHALL ask: `"मैं आपकी मदद के लिए एक teacher-support request बना सकती हूँ। इसमें आपका नाम, समस्या का छोटा summary और आपकी preferred language share होगी। क्या मैं इसे भेज दूँ?"` (all Hindi in Devanagari script).
3. WHEN the session language is English THEN THE Vidya SHALL ask: `"I can create a teacher-support request for you. It will share your name, a short summary of the issue, and your preferred language. May I send this?"`.
4. WHEN the learner responds with YES, हाँ, sure, ok, send it, or equivalent affirmative THEN THE Vidya SHALL call `create_escalation` immediately.
5. WHEN the learner responds with NO, नहीं, don't, cancel, or equivalent negative THEN THE Vidya SHALL NOT call `create_escalation` and SHALL continue the learning session as best as possible.
6. IF the learner does not respond to the consent question within the session THEN THE Vidya SHALL NOT create an escalation automatically.
7. THE Vidya SHALL describe exactly which data will be shared (name, issue summary, preferred language) and SHALL NOT claim other data will be shared.

---

### Requirement 4: `create_escalation` Tool — Agent Interface

**User Story:** As the Vidya agent, I need a structured tool to create escalation records so the LLM can trigger human help in a safe, reproducible way.

#### Acceptance Criteria

1. THE `create_escalation` tool on the `Assistant` class SHALL accept parameters: `reason` (str), `summary` (str), `what_was_checked` (str, optional), `urgency` (str, default `"medium"`), `language` (str, default `"Hindi-English"`), `follow_up_method` (str, default `"teacher_callback"`).
2. WHEN `create_escalation` is called THEN THE Escalation_Service SHALL generate a unique reference ID via `generate_reference_id()` that matches the pattern `VID-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}`.
3. WHEN `create_escalation` is called THEN THE Escalation_Service SHALL run `sanitize_summary()` on both `summary` and `what_was_checked` before storing or transmitting them.
4. WHEN `create_escalation` is called THEN THE Escalation_Service SHALL persist the record to the `escalations` SQLite table via Escalation_Repository.
5. WHEN `create_escalation` is called THEN THE Escalation_Service SHALL attempt to notify via Discord (Requirement 5) and SHALL proceed even if the Discord notification fails.
6. WHEN `create_escalation` succeeds THEN it SHALL return `{"success": True, "reference_id": "VID-XXXXXX", "status": "open"}` to the agent.
7. IF the SQLite write fails THEN `create_escalation` SHALL return `{"success": False, "error": "<reason>"}` and SHALL NOT return a reference ID.
8. THE `create_escalation` tool docstring SHALL instruct the LLM that it MUST NOT be called without prior explicit learner consent.
9. WHEN `create_escalation` succeeds THEN THE Assistant SHALL emit a `"escalation_created"` event via the LiveKit data channel containing `reference_id`, `reason`, `urgency`, `language`, and `status`.

---

### Requirement 5: Discord Webhook Notification

**User Story:** As a teacher monitoring a Discord server, I want to receive a formatted notification whenever a student requests human help, so I can respond quickly without logging into a dashboard.

#### Acceptance Criteria

1. WHEN `create_escalation` is called and `DISCORD_WEBHOOK_URL` is set in the environment THEN THE Escalation_Service SHALL send an HTTP POST to `DISCORD_WEBHOOK_URL` using `urllib.request` (no new dependencies).
2. THE Discord notification payload SHALL be a JSON object with a top-level `"embeds"` array containing one embed with: `title` set to `"🆘 Teacher Support Request — <reference_id>"`, `color` set to `16711680` (red) for high urgency, `15105570` (orange) for medium, and `3066993` (green) for low.
3. THE embed SHALL contain fields: `"Student"` (name or `"Unknown"`), `"User ID"` (user_id), `"Reason"` (reason), `"Summary"` (sanitized summary), `"What Was Tried"` (what_was_checked or `"N/A"`), `"Urgency"` (urgency), `"Language"` (language), `"Status"` (`"open"`), `"Created"` (ISO 8601 UTC timestamp).
4. THE embed footer SHALL read `"Vidya AI Learning Assistant — Day 7"`.
5. WHEN `DISCORD_WEBHOOK_URL` is absent or empty THEN THE Escalation_Service SHALL log a warning `"DISCORD_WEBHOOK_URL not set — skipping Discord notification"` and SHALL continue without error.
6. WHEN the HTTP POST to Discord returns a non-2xx status code THEN THE Escalation_Service SHALL log the error, SHALL return `False` from `send_discord_notification`, and SHALL NOT raise an exception — the SQLite record has already been committed and any Discord message attempt is treated as best-effort.
7. WHEN the Discord HTTP call raises a network exception THEN THE Escalation_Service SHALL catch it, log the error, and continue — the escalation record remains valid.
8. THE Discord notification function SHALL be implemented as `send_discord_notification(record: dict) -> bool` returning `True` on success and `False` on any failure.
9. WHEN `create_escalation` is called THEN `send_discord_notification` SHALL be called AFTER the SQLite record is committed, not before.

---

### Requirement 6: Reference ID Delivery to Learner

**User Story:** As a student, I want to receive a reference ID after my teacher support request is created, so I can track its status or share it with my teacher.

#### Acceptance Criteria

1. WHEN `create_escalation` returns `success=True` THEN THE Vidya SHALL speak the exact `reference_id` returned by the tool — never a hallucinated or truncated ID.
2. WHEN the session language is Hindi or Hinglish THEN THE Vidya SHALL say: `"आपकी teacher-support request बन गई है। आपका reference ID <ID> है। इस ID को संभालकर रखें।"` (Hindi portions in Devanagari).
3. WHEN the session language is English THEN THE Vidya SHALL say: `"Your teacher support request has been created. Your reference ID is <ID>. Please keep this ID safe."`.
4. THE Vidya SHALL NOT promise that a teacher will respond within a specific time.
5. IF `create_escalation` returns `success=False` THEN THE Vidya SHALL say: `"माफ़ कीजिए, teacher-support request अभी create नहीं हो पाई। कृपया थोड़ी देर बाद फिर कोशिश करें।"` (Hindi in Devanagari) or the English equivalent, and SHALL NOT speak any reference ID.

---

### Requirement 7: Privacy and Data Safety

**User Story:** As a student and as a teacher, I want the escalation summary to contain only relevant educational information and never any credentials, so private data is protected.

#### Acceptance Criteria

1. THE `sanitize_summary` function SHALL redact patterns matching passwords, OTPs, PINs, CVVs, credit/debit card numbers, and API keys/secrets using regex substitution before any storage or transmission.
2. WHEN a summary contains the word `password` followed by a value THEN THE Escalation_Service SHALL replace the value with `[REDACTED PASSWORD]`.
3. WHEN a summary contains `otp`, `pin`, or `cvv` followed by digits THEN THE Escalation_Service SHALL replace them with `[REDACTED AUTH TOKEN]`.
4. WHEN a summary contains a 13–16 digit number sequence THEN THE Escalation_Service SHALL replace it with `[REDACTED CARD/ACCOUNT NUMBER]`.
5. THE `create_escalation` tool docstring SHALL explicitly list prohibited content: passwords, OTPs, PINs, account numbers, credentials, and full raw conversation transcripts.
6. THE Discord embed SHALL use the post-sanitization values only — raw unsanitized strings SHALL NOT appear in the Discord payload.
7. THE Escalation_Service SHALL NOT store the learner's spoken conversation verbatim — only the agent-generated summary is stored.

---

### Requirement 8: SQLite Persistence

**User Story:** As the system, I need escalation records reliably stored in SQLite so they survive server restarts and can be reviewed in the teacher dashboard.

#### Acceptance Criteria

1. THE `escalations` table SHALL exist after `init_db()` runs with columns: `reference_id TEXT PRIMARY KEY`, `user_id TEXT NOT NULL`, `name TEXT`, `reason TEXT NOT NULL`, `summary TEXT NOT NULL`, `what_was_checked TEXT`, `urgency TEXT DEFAULT 'medium'`, `language TEXT`, `follow_up_method TEXT`, `status TEXT DEFAULT 'open'`, `created_at TEXT NOT NULL`, and a `FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE`.
2. WHEN `init_db()` is called multiple times THEN THE database SHALL complete without error (idempotent).
3. WHEN a learner row is deleted from `users` THEN all associated `escalations` rows SHALL be deleted via CASCADE.
4. WHEN `get_escalation_by_id(reference_id)` is called THEN THE Escalation_Repository SHALL return the matching record as a dict or `None` if not found.
5. WHEN `get_escalations_for_user(user_id)` is called THEN THE Escalation_Repository SHALL return all records for that user sorted by `created_at` descending.
6. WHEN `update_escalation_status(reference_id, status)` is called with a status not in `{"open", "in_progress", "resolved"}` THEN THE Escalation_Repository SHALL raise `ValueError`.

---

### Requirement 9: REST API — Escalation Endpoints

**User Story:** As a teacher using the dashboard, I need REST API endpoints to view and update escalation requests, so I can manage student support cases without direct database access.

#### Acceptance Criteria

1. WHEN a `GET /escalations` request is received THEN THE memory_server SHALL return all escalation records as a JSON array, optionally filtered by `?status=open|in_progress|resolved` query parameter.
2. WHEN a `GET /escalations/{user_id}` request is received THEN THE memory_server SHALL return all escalation records for that user as a JSON array.
3. WHEN a `PATCH /escalations/{reference_id}` request is received with a JSON body containing `{"status": "<new_status>"}` THEN THE memory_server SHALL update the record and return `{"success": true, "reference_id": "<id>", "status": "<new_status>"}`.
4. WHEN `PATCH /escalations/{reference_id}` is called with an invalid status THEN THE memory_server SHALL return HTTP 400 with `{"error": "invalid_status"}`.
5. WHEN `PATCH /escalations/{reference_id}` is called for a non-existent reference_id THEN THE memory_server SHALL return HTTP 404 with `{"error": "not_found"}`.

---

### Requirement 10: Frontend — Escalation Status in Activity Panel

**User Story:** As a student watching the web UI during a session, I want to see a live escalation card appear when a Teacher Support Request is created, so I can confirm the request was sent and note my reference ID.

#### Acceptance Criteria

1. WHEN the frontend receives a LiveKit data channel event with `type="escalation_created"` THEN THE activity panel SHALL render an `EscalationCard` component.
2. THE `EscalationCard` SHALL display: the reference ID (e.g. `VID-7A42K9`), a copy-to-clipboard button, the reason, urgency badge, and status (`open`).
3. WHEN the reference ID copy button is clicked THEN THE frontend SHALL copy the reference ID to the clipboard and briefly show a "Copied!" confirmation.
4. WHEN the frontend receives a `type="escalation_failed"` event THEN THE activity panel SHALL display an error notice: `"Teacher support request could not be created. Please try again."`.
5. WHEN no escalation events have been received THEN THE activity panel SHALL NOT show any escalation card.

---

### Requirement 11: Environment Variables

**User Story:** As a developer, I need all new Day 7 environment variables documented in `.env.example`, so the system starts safely without Discord configured and I know exactly what to set.

#### Acceptance Criteria

1. WHEN `backend/.env.example` is read THEN it SHALL document `DISCORD_WEBHOOK_URL` with an explanatory comment describing how to obtain a Discord webhook URL.
2. WHEN `DISCORD_WEBHOOK_URL` is absent or empty THEN THE backend SHALL start normally and all Day 1–6 features SHALL continue to work — Discord notification is silently skipped.
3. WHEN `DISCORD_WEBHOOK_URL` is set THEN Discord notifications SHALL be sent for every new escalation without any additional configuration.
4. WHEN `backend/.env.local` is read THEN `DISCORD_WEBHOOK_URL` SHALL be absent by default (developer opts in manually).

---

### Requirement 12: Test Paths — Escalation vs Normal Flow

**User Story:** As a developer, I need automated tests covering both the escalation path and the normal-learning path, so regressions are caught before deployment.

#### Acceptance Criteria

1. WHEN the test suite runs `tests/test_escalation.py` THEN all tests SHALL pass, including: reference ID format validation, privacy sanitization, escalation created on consent, no record when consent denied, status lifecycle update, graceful DB failure handling, Day 4 memory preservation alongside Day 7 escalation, and native Devanagari script enforcement in the system prompt.
2. WHEN a test simulates a learner saying `"I give up, I'm so frustrated"` THEN the escalation service SHALL return `success=True` with a valid reference ID when called with appropriate parameters.
3. WHEN a test simulates normal learning (no distress, no failure threshold) THEN NO escalation record SHALL exist in the DB for that user.
4. WHEN `send_discord_notification` is called and `DISCORD_WEBHOOK_URL` is unset THEN the function SHALL return `False` and SHALL NOT raise an exception.
5. WHEN `send_discord_notification` is called with a valid record dict THEN it SHALL build a correctly structured Discord embed payload with all required fields present.

---

### Requirement 13: Day 1–6 Regression

**User Story:** As the project owner, I want all existing functionality to continue working after Day 7 changes.

#### Acceptance Criteria

1. WHEN `uv run ruff check .` runs in `backend/` THEN it SHALL pass with no errors.
2. WHEN `uv run pytest` runs in `backend/` THEN `test_memory.py`, `test_exercise_service.py`, `test_agent.py`, `test_escalation.py`, and `test_call_scheduler.py` SHALL all pass.
3. WHEN `pnpm build` runs in `frontend/` THEN it SHALL complete with no TypeScript errors.
4. WHEN a student connects via the web browser THEN the inbound session SHALL work exactly as before (Day 1–6 behavior unchanged).
5. WHEN `DISCORD_WEBHOOK_URL` is absent THEN starting the backend SHALL produce no errors — escalations are created in SQLite only.
6. WHEN a returning learner connects inbound THEN their name and last topic SHALL be used in the greeting (Day 4 regression).
7. WHEN a learner requests an exercise inbound THEN `get_next_exercise` SHALL fire and the Exercise Card SHALL appear in the activity panel (Day 5 regression).
