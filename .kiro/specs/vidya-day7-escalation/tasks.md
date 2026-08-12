# Implementation Plan: vidya-day7-escalation

## Overview

Four backend gaps and one frontend gap remain from the Day 7 design. The work is
additive: nothing from Day 1–6 is removed or broken. Implementation order is:
Discord notification → topic failure counter → PATCH REST endpoint → Activity Panel
inline cards → tests.

## Tasks

- [x] 1. Implement `send_discord_notification` in `escalation_service.py`
  - [x] 1.1 Add `send_discord_notification(record: dict) -> bool` function to `backend/src/services/escalation_service.py`
    - Read `DISCORD_WEBHOOK_URL` from `os.getenv`; if absent/empty, log warning and return `False`
    - Build the Discord embed JSON payload per the design: `embeds[0].title`, `color` keyed on urgency (`high=16711680`, `medium=15105570`, `low=3066993`), nine named fields, and `footer.text = "Vidya AI Learning Assistant — Day 7"`
    - Use `urllib.request.Request` with `method="POST"` and `Content-Type: application/json` — no new dependencies
    - Wrap `urllib.request.urlopen()` in `try/except Exception`; on non-2xx status or any exception log and return `False`; on success return `True`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 1.2 Wire `send_discord_notification` into `create_escalation` after the `create_escalation_record` call
    - Call `send_discord_notification(created_record)` as best-effort — result is not checked for the return value
    - Verify failure in Discord does not prevent `create_escalation` from returning `success=True`
    - _Requirements: 4.5, 5.9_

  - [x] 1.3 Write property test for Discord embed payload completeness (Property 6)
    - **Property 6: Discord embed payload contains all required fields**
    - **Validates: Requirements 5.2, 5.3, 5.4, 12.5**
    - Use `hypothesis` with a strategy generating valid escalation record dicts
    - Monkeypatch `urllib.request.urlopen` to capture the payload without network calls
    - Assert `embeds[0]` has `title` containing `reference_id`, correct `color` for each urgency, all nine required field names, and `footer.text`

- [x] 2. Add `_topic_failure_counts` counter to `Assistant` in `agent.py`
  - [x] 2.1 Add `_topic_failure_counts: dict[str, int] = {}` to `Assistant.__init__`
    - Place the line after the existing `self._current_exercise` initialisation
    - _Requirements: 2.1_

  - [x] 2.2 Update `score_answer` in `agent.py` to increment/reset the counter and signal the LLM
    - Inside the `result.get("success")` branch, after the `answer_scored` emit:
      - Extract `topic_key = result.get("topic", "")` and `score_result = result.get("result", "")`
      - If `score_result == "incorrect"` and `topic_key`: increment `_topic_failure_counts[topic_key]` by 1; log the new count
      - If `score_result == "correct"` and `topic_key`: reset `_topic_failure_counts[topic_key]` to 0
      - If `_topic_failure_counts.get(topic_key, 0) >= 3`: add `escalation_suggested=True` and `failure_count=<count>` to the returned JSON dict
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 2.3 Write property tests for failure counter increment and correct-answer reset (Properties 3 & 4)
    - **Property 3: Topic failure counter increments correctly**
    - **Property 4: Correct answer resets topic failure counter**
    - **Validates: Requirements 2.1, 2.2, 2.6**
    - Use `hypothesis` with `st.text(min_size=1, max_size=50)` for topic and `st.integers(min_value=1, max_value=20)` for N failures
    - Instantiate `Assistant(user_id="pbt-user")` and drive `_topic_failure_counts` directly; assert count equals N; then reset to 0 and assert 0

- [ ] 3. Fix `PATCH /escalations/{reference_id}` in `memory_server.py`
  - [x] 3.1 Replace the `do_PATCH` method body with clean URL-based reference_id extraction
    - Parse `reference_id` from URL path: `parts = self.path.split("?")[0].strip("/").split("/")` — expect `["escalations", "<ref_id>"]`
    - Return HTTP 404 `{"error": "not_found"}` if path structure is wrong or reference_id missing
    - Parse `status` from the JSON request body; return HTTP 400 `{"error": "status_required"}` if absent
    - Call `escalation_service.get_escalation(ref_id)`; return HTTP 404 if `None`
    - Call `escalation_service.update_status(ref_id, new_status)`:
      - Success → HTTP 200 with result dict
      - `"invalid"` in error string → HTTP 400 `{"error": "invalid_status"}`
      - Other failure → HTTP 500
    - _Requirements: 9.3, 9.4, 9.5_

  - [-] 3.2 Update `TeacherSupportPanel.handleUpdateStatus` to use `PATCH /escalations/{refId}`
    - Change `fetch(\`${API_BASE}/escalations\`, { method: 'POST', ... })` to `fetch(\`${API_BASE}/escalations/${encodeURIComponent(refId)}\`, { method: 'PATCH', ... })`
    - Remove `reference_id` from the JSON body (it's now in the URL)
    - _Requirements: 9.3_

- [ ] 4. Checkpoint — run backend tests and lint
  - Ensure `uv run pytest backend/tests/` passes (all existing tests still green)
  - Ensure `uv run ruff check .` passes in `backend/` with no errors
  - Ask the user if anything is unclear before proceeding to frontend.

- [ ] 5. Wire inline `EscalationCard` into `ai-activity-panel.tsx`
  - [-] 5.1 Add `escalationCards` state and import `EscalationCard` in `ai-activity-panel.tsx`
    - Import `EscalationCard` and `EscalationCardProps` from `@/components/app/escalation-card`
    - Import `AnimatePresence` from `motion/react`
    - Add state: `const [escalationCards, setEscalationCards] = useState<Array<EscalationCardProps & { id: string }>>([]);`
    - _Requirements: 10.1, 10.5_

  - [x] 5.2 Handle `escalation_created` and `escalation_failed` events in the `toolEvents` `useEffect`
    - Before falling through to `toolEventToItem`, intercept events with `type === 'escalation_created'` and push an `EscalationCardProps` with `status='created'`, `referenceId`, `reason`, `summary`, `urgency`, `language` into `escalationCards`; use `continue` to skip adding a text item
    - Intercept `type === 'escalation_failed'` and push `status='failed'` with `error` message; use `continue`
    - Intercept `type === 'escalation_consent_requested'` and push `status='preparing'`; use `continue`
    - _Requirements: 10.1, 10.4, 10.5_

  - [x] 5.3 Render `EscalationCard` components above the text feed in the JSX
    - Add an `AnimatePresence` block above the `<ul>` items list that maps `escalationCards` to `<EscalationCard key={card.id} {...card} className="mb-2" />`
    - Only render the block when `escalationCards.length > 0`
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 6. Document `DISCORD_WEBHOOK_URL` in `backend/.env.example`
  - [x] 6.1 Add the Day 7 Discord webhook block to `backend/.env.example`
    - Replace or augment the existing bare `webhook=` line at the bottom of `backend/.env.example`
    - Add the documented block with section header comment, step-by-step instructions for obtaining the URL, and `DISCORD_WEBHOOK_URL=` (empty default)
    - Ensure `DISCORD_WEBHOOK_URL` is absent from `backend/.env.local` (not committed with a real value)
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 7. Add Discord notification tests to `test_escalation.py`
  - [-] 7.1 Add `test_discord_notification_skipped_when_no_webhook` test
    - `monkeypatch.delenv("DISCORD_WEBHOOK_URL", raising=False)` and call `escalation_service.send_discord_notification({...minimal record...})`
    - Assert the return value is `False` and no exception is raised
    - _Requirements: 5.5, 12.4_

  - [x] 7.2 Add `test_discord_notification_payload_structure` test
    - `monkeypatch.setenv("DISCORD_WEBHOOK_URL", "https://discord.com/api/webhooks/fake")`
    - Monkeypatch `urllib.request.urlopen` to capture the request payload and return a simulated 204 response
    - Assert `"embeds"` in payload; first embed `title` contains `"VID-ABCDEF"`; all required field names present; `footer.text == "Vidya AI Learning Assistant — Day 7"`; `color == 16711680` for `urgency="high"`
    - _Requirements: 5.2, 5.3, 5.4, 12.5_

  - [x] 7.3 Write property tests for reference ID format (Property 1) and summary sanitization (Property 2)
    - **Property 1: Reference ID format is always valid**
    - **Validates: Requirements 4.2**
    - Call `generate_reference_id()` 200 times (no hypothesis input needed); assert each matches `^VID-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$`
    - **Property 2: Summary sanitization removes all sensitive patterns**
    - **Validates: Requirements 4.3, 7.1, 7.2, 7.3, 7.4**
    - Use a `hypothesis` composite strategy generating strings with injected password/OTP/card/API-key patterns mixed with benign text
    - Assert `sanitize_summary(input)` contains no original sensitive value and does contain at least one `[REDACTED` marker

  - [x] 7.4 Write property test for `create_escalation` return contract (Property 5)
    - **Property 5: create_escalation return contract**
    - **Validates: Requirements 4.6**
    - Use `hypothesis` with `st.text(min_size=1)` for `user_id`, `reason`, `summary`
    - Assert returned dict has `success=True`, `escalation["reference_id"]` starts with `"VID-"`, and `escalation["status"] == "open"`

- [~] 8. Final checkpoint — full regression pass
  - Run `uv run pytest backend/tests/` — all tests must pass including the two new Discord tests
  - Run `uv run ruff check .` in `backend/` — no errors
  - Run `pnpm build` in `frontend/` — TypeScript compiles with no errors
  - Ensure `uv run pytest` passes for `test_memory.py`, `test_exercise_service.py`, `test_agent.py`, `test_escalation.py`, `test_call_scheduler.py`
  - Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; they add correctness confidence but are not blocking
- The design document's "Implementation Status Summary" shows the exact gap: `send_discord_notification`, `_topic_failure_counts`, clean `PATCH` endpoint, inline `EscalationCard`, and Discord tests are the only remaining work
- `hypothesis` is already in the backend dev dependencies — use `from hypothesis import given, settings, strategies as st`
- All Hindi text in system prompt and test assertions must remain in Devanagari script — never Romanized
- The `.env.local` file must NOT be committed with a real Discord webhook URL; the existing bare `webhook=` line at the bottom of `.env.example` should be replaced with the properly documented `DISCORD_WEBHOOK_URL=` block

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "6.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "3.1"] },
    { "id": 2, "tasks": ["3.2", "5.1", "7.1", "7.2"] },
    { "id": 3, "tasks": ["5.2", "1.3", "2.3", "7.3", "7.4"] },
    { "id": 4, "tasks": ["5.3"] }
  ]
}
```
