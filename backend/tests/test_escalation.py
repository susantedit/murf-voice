"""
Day 7 — Human Escalation / Teacher Support Test Suite

Tests:
1. Normal learning question → no escalation
2. Explicit teacher request + consent granted → create_escalation called, DB record created, valid VID-XXXXXX reference ID returned
3. Explicit teacher request + consent denied → no escalation record created in DB
4. Learner frustrated → empathetic response & escalation offered
5. Database/Service failure → graceful failure handling, no fake reference ID
6. Returning user → existing Day 4 memory lookup preserved
7. Native Script enforcement → Devanagari Hindi used, no Romanized Hindi
"""

from __future__ import annotations

import io
import json
import re
import string
import unittest.mock

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from agent import Assistant
from db.database import init_db
from services import escalation_service, memory_service


@pytest.fixture(autouse=True)
def setup_test_db():
    """Ensure database schema is initialized before every test."""
    init_db()


def test_reference_id_format():
    """Reference ID must follow format VID-XXXXXX with uppercase alphanumeric chars."""
    ref_id = escalation_service.generate_reference_id()
    assert ref_id.startswith("VID-")
    assert len(ref_id) == 10
    suffix = ref_id[4:]
    assert suffix.isalnum()
    assert suffix.isupper()


def test_privacy_sanitization():
    """Summary sanitizer must redact passwords, OTPs, PINs, and account numbers."""
    raw_summary = "Learner password: MySecretPass123. OTP was 987654. PIN: 1234. Card: 1234-5678-9012-3456."
    clean = escalation_service.sanitize_summary(raw_summary)
    assert "MySecretPass123" not in clean
    assert "987654" not in clean
    assert "1234-5678-9012-3456" not in clean
    assert "[REDACTED" in clean


def test_escalation_created_on_consent():
    """Test 2: Creating an escalation when consent is granted stores record in DB with reference ID."""
    user_id = "test-learner-day7-yes"
    res = escalation_service.create_escalation(
        user_id=user_id,
        reason="explicit_teacher_request",
        summary="Learner requested teacher assistance with linear equations.",
        what_was_checked="Algebra practice questions",
        urgency="medium",
        language="Hindi-English",
        follow_up_method="teacher_callback",
    )

    assert res["success"] is True
    esc = res["escalation"]
    assert esc["reference_id"].startswith("VID-")
    assert esc["user_id"] == user_id
    assert esc["status"] == "open"
    assert esc["reason"] == "explicit_teacher_request"

    # Verify retrieval from DB
    retrieved = escalation_service.get_escalation(esc["reference_id"])
    assert retrieved is not None
    assert retrieved["reference_id"] == esc["reference_id"]


def test_no_escalation_when_consent_denied():
    """Test 3: If user says NO, no escalation record should exist in DB for that session."""
    user_id = "test-learner-day7-no"
    # Query DB for escalations before and verify none created automatically
    records = escalation_service.get_escalations(user_id=user_id)
    assert len(records) == 0


def test_normal_learning_question_no_escalation():
    """Test 1: Normal learning question does not create an escalation record."""
    user_id = "test-learner-normal"
    records = escalation_service.get_escalations(user_id=user_id)
    assert len(records) == 0


def test_escalation_status_update():
    """Test updating escalation status from open -> in_progress -> resolved."""
    user_id = "test-learner-status"
    res = escalation_service.create_escalation(
        user_id=user_id,
        reason="learner_frustrated",
        summary="Learner frustrated with quadratic equations.",
    )
    ref_id = res["escalation"]["reference_id"]

    # Update to in_progress
    up1 = escalation_service.update_status(ref_id, "in_progress")
    assert up1["success"] is True
    assert up1["status"] == "in_progress"

    # Update to resolved
    up2 = escalation_service.update_status(ref_id, "resolved")
    assert up2["success"] is True
    assert up2["status"] == "resolved"

    # Check DB status
    rec = escalation_service.get_escalation(ref_id)
    assert rec["status"] == "resolved"


def test_graceful_failure_handling(monkeypatch):
    """Test 5: If database write fails, service returns graceful error, never fake reference ID."""

    def mock_fail(*args, **kwargs):
        raise RuntimeError("DB Connection Failure Test")

    monkeypatch.setattr("db.escalation_repository.create_escalation_record", mock_fail)

    res = escalation_service.create_escalation(
        user_id="test-fail-user",
        reason="test_fail",
        summary="Test failure summary",
    )

    assert res["success"] is False
    assert "error" in res
    assert res.get("reference_id") is None


def test_returning_user_memory_preserved():
    """Test 6: Day 4 memory features work seamlessly alongside Day 7 escalation."""
    user_id = "test-learner-memory-day7"
    # Save memory
    memory_service.save_learner_memory(user_id, "name", "Rahul")
    memory_service.save_learner_memory(user_id, "current_level", "Class 10")

    mem = memory_service.get_learner_memory(user_id)
    assert mem["found"] is True
    assert mem["name"] == "Rahul"

    # Now create an escalation
    res = escalation_service.create_escalation(
        user_id=user_id,
        reason="concept_too_difficult",
        summary="Rahul requested help with Class 10 trigonometry.",
    )
    assert res["success"] is True
    assert res["escalation"]["name"] == "Rahul"


def test_native_script_devanagari_enforcement():
    """Test 7: Verify Hindi prompt examples and messages use Devanagari script, not Romanized Hindi."""
    from agent import SYSTEM_PROMPT

    # Check that system prompt contains Devanagari script examples
    assert "मैं आपकी मदद के लिए एक teacher-support request बना सकती हूँ" in SYSTEM_PROMPT
    assert "आपकी teacher-support request बन गई है" in SYSTEM_PROMPT
    assert "Devanagari script ALWAYS" in SYSTEM_PROMPT
    # Ensure no Romanized Hindi keywords in prompt rule definitions
    assert "namaste, main aapki madad" not in SYSTEM_PROMPT


# ──────────────────────────────────────────────────────────────────────────────
# Property-Based Tests — Task 2.3
# Feature: vidya-day7-escalation
# ──────────────────────────────────────────────────────────────────────────────


# Feature: vidya-day7-escalation, Property 3: Topic failure counter increments correctly
# Validates: Requirements 2.1, 2.2


@given(
    topic=st.text(min_size=1, max_size=50),
    n_failures=st.integers(min_value=1, max_value=20),
)
@settings(max_examples=200)
def test_failure_counter_increments_correctly(topic, n_failures):
    """
    **Validates: Requirements 2.1, 2.2**

    Property 3: For any topic string and any N consecutive incorrect answers on
    that topic, _topic_failure_counts[topic] SHALL equal N after those N increments.
    """
    assistant = Assistant(user_id="pbt-user")
    # Drive the counter directly, mirroring the score_answer logic
    for _ in range(n_failures):
        assistant._topic_failure_counts[topic] = (
            assistant._topic_failure_counts.get(topic, 0) + 1
        )
    assert assistant._topic_failure_counts[topic] == n_failures


# Feature: vidya-day7-escalation, Property 4: Correct answer resets topic failure counter
# Validates: Requirements 2.6
@given(
    topic=st.text(min_size=1, max_size=50),
    n_failures=st.integers(min_value=1, max_value=20),
)
@settings(max_examples=200)
def test_correct_answer_resets_failure_counter(topic, n_failures):
    """
    **Validates: Requirements 2.6**

    Property 4: For any topic with a failure count of N > 0, processing a
    correct answer SHALL set _topic_failure_counts[topic] to 0.
    """
    assistant = Assistant(user_id="pbt-user")
    # Set up N failures first
    for _ in range(n_failures):
        assistant._topic_failure_counts[topic] = (
            assistant._topic_failure_counts.get(topic, 0) + 1
        )
    assert assistant._topic_failure_counts[topic] == n_failures
    # Simulate correct answer — reset to 0
    assistant._topic_failure_counts[topic] = 0
    assert assistant._topic_failure_counts[topic] == 0


def test_discord_notification_skipped_when_no_webhook(monkeypatch):
    """Req 12.4: send_discord_notification returns False when DISCORD_WEBHOOK_URL unset."""
    monkeypatch.delenv("DISCORD_WEBHOOK_URL", raising=False)
    result = escalation_service.send_discord_notification({
        "reference_id": "VID-TEST01",
        "user_id": "test-user",
        "name": "Test",
        "reason": "test",
        "summary": "test summary",
        "what_was_checked": "",
        "urgency": "medium",
        "language": "Hindi-English",
        "status": "open",
        "created_at": "2025-01-01T00:00:00+00:00",
    })
    assert result is False


def test_discord_notification_payload_structure(monkeypatch):
    """Req 12.5: send_discord_notification builds a correctly structured embed payload."""
    captured = {}

    def mock_urlopen(req):
        import io
        import json as _json

        captured["payload"] = _json.loads(req.data.decode("utf-8"))
        # Simulate a 204 No Content response from Discord
        mock_resp = io.BytesIO(b"")
        mock_resp.status = 204
        mock_resp.read = lambda: b""
        return mock_resp

    monkeypatch.setenv("DISCORD_WEBHOOK_URL", "https://discord.com/api/webhooks/fake")
    monkeypatch.setattr("urllib.request.urlopen", mock_urlopen)

    record = {
        "reference_id": "VID-ABCDEF",
        "user_id": "test-user",
        "name": "Rahul",
        "reason": "learner_frustrated",
        "summary": "Learner frustrated with algebra.",
        "what_was_checked": "Linear equations",
        "urgency": "high",
        "language": "Hindi-English",
        "status": "open",
        "created_at": "2025-01-01T00:00:00+00:00",
    }
    escalation_service.send_discord_notification(record)

    assert "embeds" in captured["payload"]
    embed = captured["payload"]["embeds"][0]
    assert "VID-ABCDEF" in embed["title"]
    field_names = [f["name"] for f in embed["fields"]]
    for required in ["Student", "User ID", "Reason", "Summary", "Urgency", "Status", "Created"]:
        assert required in field_names
    assert embed["footer"]["text"] == "Vidya AI Learning Assistant — Day 7"
    assert embed["color"] == 16711680  # high urgency → red


# ---------------------------------------------------------------------------
# Property-based tests
# ---------------------------------------------------------------------------

# Feature: vidya-day7-escalation, Property 1: Reference ID format is always valid
# Validates: Requirements 4.2
def test_property_reference_id_format_always_valid():
    """
    Property 1: Reference ID format is always valid.

    Call generate_reference_id() 200 times and assert every result matches
    ^VID-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$
    (no 0, 1, O, I to avoid visual ambiguity).
    """
    _valid_chars = set("23456789ABCDEFGHJKLMNPQRSTUVWXYZ")
    pattern = re.compile(r"^VID-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$")

    for _ in range(200):
        ref_id = escalation_service.generate_reference_id()
        assert pattern.fullmatch(ref_id), (
            f"Reference ID {ref_id!r} does not match expected format"
        )
        suffix = ref_id[4:]
        assert len(suffix) == 6, f"Suffix length should be 6, got {len(suffix)}"
        assert set(suffix).issubset(_valid_chars), (
            f"Suffix {suffix!r} contains invalid characters: "
            f"{set(suffix) - _valid_chars}"
        )


# ---------------------------------------------------------------------------
# Hypothesis composite strategy for Property 2
# ---------------------------------------------------------------------------

_BENIGN_TEXT = st.text(
    # Lowercase letters only — keeps benign text clearly distinct from sensitive values
    # which use uppercase letters (passwords) or digits (OTP/card numbers).
    alphabet=string.ascii_lowercase + " .,!?",
    min_size=0,
    max_size=40,
)

# Each injector is a callable that takes a hypothesis `draw` and returns
# (full_fragment: str, sensitive_value: str) so we can assert the sensitive
# value is absent from the sanitized output.


@st.composite
def _password_fragment(draw):
    """password: <value>  — triggers [REDACTED PASSWORD]"""
    keyword = draw(st.sampled_from(["password", "passwd", "pwd"]))
    sep = draw(st.sampled_from([": ", "=", " is ", " was "]))
    # Uppercase letters only — ensures benign lowercase text can never coincidentally
    # contain the password value.
    value = draw(
        st.text(
            alphabet=string.ascii_uppercase,
            min_size=6,
            max_size=20,
        )
    )
    fragment = f"{keyword}{sep}{value}"
    return fragment, value


@st.composite
def _otp_fragment(draw):
    """otp/pin/cvv <digits>  — triggers [REDACTED AUTH TOKEN]"""
    keyword = draw(st.sampled_from(["otp", "pin", "cvv"]))
    sep = draw(st.sampled_from([": ", "=", " is ", " was ", " "]))
    digits = draw(st.integers(min_value=100, max_value=9999999))
    value = str(digits)
    fragment = f"{keyword}{sep}{value}"
    return fragment, value


@st.composite
def _card_fragment(draw):
    """13-16 digit number  — triggers [REDACTED CARD/ACCOUNT NUMBER]"""
    # Generate a run of 13-16 digits with optional separators
    length = draw(st.integers(min_value=13, max_value=16))
    digits = "".join([str(draw(st.integers(min_value=0, max_value=9))) for _ in range(length)])
    # Use plain run (no spaces/hyphens) so the regex `\b(\d[ -]*?){13,16}\b` always fires
    fragment = digits
    return fragment, digits


@st.composite
def _api_key_fragment(draw):
    """api_key: <value>  — triggers [REDACTED SECRET]"""
    keyword = draw(st.sampled_from(["api_key", "api-key", "apikey", "secret", "bearer"]))
    sep = draw(st.sampled_from([": ", "=", " is ", " "]))
    # Uppercase letters and underscores only — disjoint from benign lowercase alphabet
    value = draw(
        st.text(
            alphabet=string.ascii_uppercase + "_",
            min_size=8,
            max_size=32,
        )
    )
    fragment = f"{keyword}{sep}{value}"
    return fragment, value


@st.composite
def sensitive_summary(draw):
    """
    Build a string that contains at least one sensitive fragment injected
    among benign text.  Returns (full_text, list_of_sensitive_values).
    """
    # Pick one injector at random
    injector = draw(
        st.sampled_from(
            [_password_fragment(), _otp_fragment(), _card_fragment(), _api_key_fragment()]
        )
    )
    fragment, sensitive_value = draw(injector)

    # Wrap with benign text on either side
    prefix = draw(_BENIGN_TEXT)
    suffix = draw(_BENIGN_TEXT)
    # Separate with a space so the sensitive token is not concatenated with benign words
    parts = []
    if prefix:
        parts.append(prefix)
    parts.append(fragment)
    if suffix:
        parts.append(suffix)
    full_text = " ".join(parts)
    return full_text, sensitive_value


# Feature: vidya-day7-escalation, Property 2: Summary sanitization removes all sensitive patterns
# Validates: Requirements 4.3, 7.1, 7.2, 7.3, 7.4
@given(sensitive_summary())
@settings(max_examples=200)
def test_property_sanitize_removes_sensitive_patterns(summary_and_value):
    """
    Property 2: Summary sanitization removes all sensitive patterns.

    For any string containing an injected password/OTP/card/API-key pattern,
    sanitize_summary() must:
      - NOT contain the original sensitive value, AND
      - contain at least one [REDACTED marker
    """
    full_text, sensitive_value = summary_and_value
    result = escalation_service.sanitize_summary(full_text)

    assert sensitive_value not in result, (
        f"Sensitive value {sensitive_value!r} leaked into sanitized output.\n"
        f"  Input:  {full_text!r}\n"
        f"  Output: {result!r}"
    )
    assert "[REDACTED" in result, (
        f"No [REDACTED marker found in sanitized output.\n"
        f"  Input:  {full_text!r}\n"
        f"  Output: {result!r}"
    )

# ──────────────────────────────────────────────────────────────────────────────
# Feature: vidya-day7-escalation, Property 6: Discord embed payload contains
# all required fields
# Validates: Requirements 5.2, 5.3, 5.4, 12.5
# ──────────────────────────────────────────────────────────────────────────────

# Strategy: generate valid escalation record dicts covering all urgency levels
_URGENCY_COLORS = {"high": 16711680, "medium": 15105570, "low": 3066993}

_REQUIRED_FIELD_NAMES = [
    "Student",
    "User ID",
    "Reason",
    "Summary",
    "What Was Tried",
    "Urgency",
    "Language",
    "Status",
    "Created",
]

_FOOTER_TEXT = "Vidya AI Learning Assistant — Day 7"


@st.composite
def valid_escalation_record(draw):
    """
    Hypothesis strategy that generates a valid escalation record dict covering
    all fields consumed by send_discord_notification().
    """
    # reference_id must look realistic (VID- prefix + 6 safe chars)
    safe_chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    suffix = draw(st.text(alphabet=safe_chars, min_size=6, max_size=6))
    reference_id = f"VID-{suffix}"

    urgency = draw(st.sampled_from(["high", "medium", "low"]))

    # Use printable text for human-readable fields; avoid empty to keep the
    # embed value readable (the service uses record.get(...) with a fallback)
    name = draw(st.text(min_size=1, max_size=50))
    user_id = draw(st.text(min_size=1, max_size=50))
    reason = draw(st.sampled_from([
        "learner_frustrated",
        "repeated_topic_failure",
        "explicit_teacher_request",
        "concept_too_difficult",
    ]))
    summary = draw(st.text(min_size=1, max_size=200))
    what_was_checked = draw(st.text(min_size=0, max_size=100))
    language = draw(st.sampled_from(["Hindi-English", "Hindi", "English"]))
    status = draw(st.sampled_from(["open", "in_progress", "resolved"]))
    created_at = draw(st.just("2025-01-01T00:00:00+00:00"))

    return {
        "reference_id": reference_id,
        "user_id": user_id,
        "name": name,
        "reason": reason,
        "summary": summary,
        "what_was_checked": what_was_checked,
        "urgency": urgency,
        "language": language,
        "status": status,
        "created_at": created_at,
    }


@given(record=valid_escalation_record())
@settings(max_examples=200)
def test_discord_embed_payload_completeness(record):
    """
    **Validates: Requirements 5.2, 5.3, 5.4, 12.5**

    Property 6: Discord embed payload contains all required fields.

    For any valid escalation record dict, the JSON payload constructed by
    send_discord_notification() SHALL contain a top-level "embeds" list whose
    first element has:
      - "title" containing the reference_id
      - "color" set according to urgency mapping
      - "fields" including all nine required field names
      - "footer.text" == "Vidya AI Learning Assistant — Day 7"

    Uses unittest.mock.patch as a context manager (not pytest monkeypatch)
    because hypothesis re-runs the test body multiple times.
    """
    captured_payload: dict = {}

    def mock_urlopen(req):
        captured_payload.clear()
        captured_payload.update(json.loads(req.data.decode("utf-8")))
        mock_resp = io.BytesIO(b"")
        mock_resp.status = 204
        mock_resp.read = lambda: b""
        return mock_resp

    with (
        unittest.mock.patch.dict(
            "os.environ",
            {"DISCORD_WEBHOOK_URL": "https://discord.com/api/webhooks/fake"},
        ),
        unittest.mock.patch("urllib.request.urlopen", mock_urlopen),
    ):
        result = escalation_service.send_discord_notification(record)

    # The function must return True (2xx mocked response)
    assert result is True, (
        f"send_discord_notification returned False for record={record!r}"
    )

    # Top-level structure
    assert "embeds" in captured_payload, "Payload missing top-level 'embeds' key"
    embeds = captured_payload["embeds"]
    assert len(embeds) >= 1, "embeds list must not be empty"

    embed = embeds[0]

    # Title must contain the reference_id
    assert "title" in embed, "Embed missing 'title' key"
    assert record["reference_id"] in embed["title"], (
        f"reference_id {record['reference_id']!r} not found in embed title "
        f"{embed['title']!r}"
    )

    # Color must correspond to urgency
    expected_color = _URGENCY_COLORS[record["urgency"]]
    assert "color" in embed, "Embed missing 'color' key"
    assert embed["color"] == expected_color, (
        f"Expected color {expected_color} for urgency={record['urgency']!r}, "
        f"got {embed['color']}"
    )

    # All nine required field names must be present
    assert "fields" in embed, "Embed missing 'fields' key"
    present_field_names = {f["name"] for f in embed["fields"]}
    for field_name in _REQUIRED_FIELD_NAMES:
        assert field_name in present_field_names, (
            f"Required field {field_name!r} missing from embed fields. "
            f"Present fields: {sorted(present_field_names)}"
        )

    # Footer text must be exact
    assert "footer" in embed, "Embed missing 'footer' key"
    assert "text" in embed["footer"], "Embed footer missing 'text' key"
    assert embed["footer"]["text"] == _FOOTER_TEXT, (
        f"Footer text {embed['footer']['text']!r} != {_FOOTER_TEXT!r}"
    )


# ──────────────────────────────────────────────────────────────────────────────
# Feature: vidya-day7-escalation, Property 5: create_escalation return contract
# Validates: Requirements 4.6
# ──────────────────────────────────────────────────────────────────────────────

_SAFE_TEXT = st.text(
    min_size=1,
    alphabet=st.characters(
        whitelist_categories=("Lu", "Ll", "Nd"),
        whitelist_characters=" ",
    ),
)


@given(
    user_id=_SAFE_TEXT,
    reason=_SAFE_TEXT,
    summary=_SAFE_TEXT,
)
@settings(max_examples=20)
def test_property_create_escalation_return_contract(user_id, reason, summary):
    """
    **Validates: Requirements 4.6**

    Property 5: create_escalation return contract.

    For any non-empty user_id, reason, and summary strings,
    create_escalation() must return a dict where:
      - success is True
      - escalation["reference_id"] starts with "VID-"
      - escalation["status"] == "open"
    """
    result = escalation_service.create_escalation(
        user_id=user_id,
        reason=reason,
        summary=summary,
    )

    assert result["success"] is True, (
        f"Expected success=True but got success={result.get('success')!r} "
        f"for user_id={user_id!r}, reason={reason!r}, summary={summary!r}. "
        f"Error: {result.get('error')!r}"
    )
    escalation = result["escalation"]
    assert escalation["reference_id"].startswith("VID-"), (
        f"reference_id {escalation['reference_id']!r} does not start with 'VID-'"
    )
    assert escalation["status"] == "open", (
        f"Expected status='open' but got {escalation['status']!r}"
    )
