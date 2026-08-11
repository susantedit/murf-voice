"""
Tests for call_service (backend/src/services/call_service.py).

Tests the no-SIP-trunk and simulation failure paths without requiring
real LiveKit or SIP credentials.
"""

from __future__ import annotations

import uuid
from contextlib import suppress

import pytest

import src.db.database as _db_module
from src.db import database as database
from src.db.call_repository import get_schedulable_users
from src.db.learner_repository import create_learner, delete_learner
from src.services.call_service import dispatch_outbound_sip_call, set_call_opt_out


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    temp_db = str(tmp_path / "test_vidya.db")
    monkeypatch.setattr(_db_module, "DB_PATH", temp_db)
    database.init_db()
    yield


@pytest.fixture
def learner_id():
    uid = str(uuid.uuid4())
    create_learner(uid)
    yield uid
    with suppress(Exception):
        delete_learner(uid)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_dispatch_no_trunk(monkeypatch, learner_id):
    """When LIVEKIT_SIP_TRUNK_ID is not set, dispatch returns no_sip_trunk."""
    monkeypatch.delenv("LIVEKIT_SIP_TRUNK_ID", raising=False)
    monkeypatch.delenv("LINPHONE_UNAVAILABLE_SIMULATION", raising=False)

    result = await dispatch_outbound_sip_call(learner_id, "sip:test@sip.linphone.org")
    assert result["success"] is False
    assert result["error"] == "no_sip_trunk"


@pytest.mark.asyncio
async def test_dispatch_simulated_unavailable(monkeypatch, learner_id):
    """When LINPHONE_UNAVAILABLE_SIMULATION=1, dispatch returns simulated failure."""
    monkeypatch.setenv("LINPHONE_UNAVAILABLE_SIMULATION", "1")

    result = await dispatch_outbound_sip_call(learner_id, "sip:test@sip.linphone.org")
    assert result["success"] is False
    assert result["error"] == "simulated_unavailable"


@pytest.mark.asyncio
async def test_dispatch_empty_sip_uri(monkeypatch, learner_id):
    """When sip_uri is empty, dispatch returns no_sip_uri error."""
    monkeypatch.delenv("LINPHONE_UNAVAILABLE_SIMULATION", raising=False)
    monkeypatch.setenv("LIVEKIT_SIP_TRUNK_ID", "trunk-test-123")

    result = await dispatch_outbound_sip_call(learner_id, "")
    assert result["success"] is False
    assert result["error"] == "no_sip_uri"


@pytest.mark.asyncio
async def test_set_opt_out(learner_id):
    """set_call_opt_out sets call_opt_out=1 in the DB."""
    from src.db.database import get_connection

    # Set sip_uri and preferred_time so user is schedulable
    with get_connection() as conn:
        conn.execute(
            "UPDATE users SET sip_uri = ?, preferred_time = ? WHERE user_id = ?",
            ("sip:test@sip.linphone.org", "18:00", learner_id),
        )

    # Confirm user is schedulable before opt-out
    users = get_schedulable_users()
    assert any(u["user_id"] == learner_id for u in users)

    # Opt out
    result = await set_call_opt_out(learner_id, opt_out=True)
    assert result["success"] is True

    # Query DB directly and assert call_opt_out = 1
    with get_connection() as conn:
        row = conn.execute(
            "SELECT call_opt_out FROM users WHERE user_id = ?", (learner_id,)
        ).fetchone()
    assert row is not None
    assert row["call_opt_out"] == 1

    # Also confirm user is no longer returned by scheduler query
    users = get_schedulable_users()
    assert not any(u["user_id"] == learner_id for u in users)


@pytest.mark.asyncio
async def test_set_opt_in_after_opt_out(learner_id):
    """set_call_opt_out(opt_out=False) re-enables calls."""
    await set_call_opt_out(learner_id, opt_out=True)
    result = await set_call_opt_out(learner_id, opt_out=False)
    assert result["success"] is True

    from src.db.database import get_connection

    with get_connection() as conn:
        row = conn.execute(
            "SELECT call_opt_out FROM users WHERE user_id = ?", (learner_id,)
        ).fetchone()
    assert row["call_opt_out"] == 0
