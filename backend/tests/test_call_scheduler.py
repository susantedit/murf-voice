"""
Tests for call_scheduler (backend/src/scheduler/call_scheduler.py).

Uses monkeypatching to replace dispatch_outbound_sip_call with a mock,
and an isolated SQLite DB. No real SIP calls are made.
"""

from __future__ import annotations

import asyncio
import uuid
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import pytest

import src.db.database as _db_module
from src.db import database as database
from src.db.call_repository import get_calls, insert_call, update_call
from src.db.learner_repository import create_learner, delete_learner
from src.scheduler.call_scheduler import _is_within_window, _process_tick


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


def _set_schedule(
    learner_id: str, preferred_time: str, sip_uri: str = "sip:t@sip.linphone.org"
) -> None:
    from src.db.database import get_connection

    with get_connection() as conn:
        conn.execute(
            "UPDATE users SET preferred_time = ?, sip_uri = ?, call_opt_out = 0 WHERE user_id = ?",
            (preferred_time, sip_uri, learner_id),
        )


def _hhmm_now(offset_minutes: int = 0) -> str:
    dt = datetime.now() + timedelta(minutes=offset_minutes)
    return dt.strftime("%H:%M")


def _now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Unit tests for _is_within_window
# ---------------------------------------------------------------------------


def test_is_within_window_exact():
    now = datetime(2024, 1, 15, 18, 0, 0)
    assert _is_within_window("18:00", now) is True


def test_is_within_window_4min_before():
    now = datetime(2024, 1, 15, 17, 56, 0)
    assert _is_within_window("18:00", now) is True


def test_is_within_window_outside():
    now = datetime(2024, 1, 15, 18, 10, 0)
    assert _is_within_window("18:00", now) is False


def test_is_within_window_bad_format():
    now = datetime(2024, 1, 15, 18, 0, 0)
    assert _is_within_window("not-a-time", now) is False


# ---------------------------------------------------------------------------
# Integration tests for _process_tick
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fires_within_window(learner_id, monkeypatch):
    """Scheduler dispatches a call when preferred_time is now."""
    _set_schedule(learner_id, _hhmm_now(0))

    mock_dispatch = AsyncMock(
        return_value={"success": True, "room_name": "r", "call_id": 1}
    )
    monkeypatch.setattr(
        "src.scheduler.call_scheduler._safe_dispatch",
        AsyncMock(side_effect=lambda fn, uid, uri: mock_dispatch(uid, uri)),
    )

    dispatched = []

    async def fake_dispatch(user_id, sip_uri):
        dispatched.append(user_id)
        return {"success": True}

    import src.scheduler.call_scheduler as sched_mod

    monkeypatch.setattr(
        sched_mod,
        "_safe_dispatch",
        AsyncMock(side_effect=lambda fn, uid, uri: dispatched.append(uid)),
    )

    await _process_tick()
    # Give tasks a chance to run
    await asyncio.sleep(0.05)
    assert learner_id in dispatched


@pytest.mark.asyncio
async def test_skips_outside_window(learner_id, monkeypatch):
    """Scheduler does NOT dispatch when preferred_time is far in the future."""
    _set_schedule(learner_id, _hhmm_now(+30))

    dispatched = []
    import src.scheduler.call_scheduler as sched_mod

    monkeypatch.setattr(
        sched_mod,
        "_safe_dispatch",
        AsyncMock(side_effect=lambda fn, uid, uri: dispatched.append(uid)),
    )

    await _process_tick()
    await asyncio.sleep(0.05)
    assert learner_id not in dispatched


@pytest.mark.asyncio
async def test_skips_existing_call_today(learner_id, monkeypatch):
    """Scheduler does NOT dispatch if a call already exists today."""
    _set_schedule(learner_id, _hhmm_now(0))
    insert_call(learner_id, _now_utc())  # already called today

    dispatched = []
    import src.scheduler.call_scheduler as sched_mod

    monkeypatch.setattr(
        sched_mod,
        "_safe_dispatch",
        AsyncMock(side_effect=lambda fn, uid, uri: dispatched.append(uid)),
    )

    await _process_tick()
    await asyncio.sleep(0.05)
    assert learner_id not in dispatched


@pytest.mark.asyncio
async def test_skips_opted_out(learner_id, monkeypatch):
    """Scheduler does NOT dispatch when call_opt_out=1."""
    _set_schedule(learner_id, _hhmm_now(0))

    from src.db.database import get_connection

    with get_connection() as conn:
        conn.execute(
            "UPDATE users SET call_opt_out = 1 WHERE user_id = ?", (learner_id,)
        )

    dispatched = []
    import src.scheduler.call_scheduler as sched_mod

    monkeypatch.setattr(
        sched_mod,
        "_safe_dispatch",
        AsyncMock(side_effect=lambda fn, uid, uri: dispatched.append(uid)),
    )

    await _process_tick()
    await asyncio.sleep(0.05)
    assert learner_id not in dispatched


@pytest.mark.asyncio
async def test_retry_logic(learner_id, monkeypatch):
    """Scheduler dispatches a retry for a missed call > 10 min ago."""
    _set_schedule(learner_id, _hhmm_now(+60))  # no scheduled call due now

    # Insert a missed call from 15 min ago with retry_attempted=0
    old_time = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
    call_id = insert_call(learner_id, old_time)
    update_call(call_id, status="missed", retry_attempted=0)

    dispatched = []
    import src.scheduler.call_scheduler as sched_mod

    monkeypatch.setattr(
        sched_mod,
        "_safe_dispatch",
        AsyncMock(side_effect=lambda fn, uid, uri: dispatched.append(uid)),
    )

    await _process_tick()
    await asyncio.sleep(0.05)
    assert learner_id in dispatched

    # Verify retry_attempted was set to 1 on original call
    records = get_calls(learner_id)
    assert records[0]["retry_attempted"] == 1


@pytest.mark.asyncio
async def test_no_double_retry(learner_id, monkeypatch):
    """Scheduler does NOT retry a call that already has retry_attempted=1."""
    _set_schedule(learner_id, _hhmm_now(+60))

    old_time = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
    call_id = insert_call(learner_id, old_time)
    update_call(call_id, status="missed", retry_attempted=1)

    dispatched = []
    import src.scheduler.call_scheduler as sched_mod

    monkeypatch.setattr(
        sched_mod,
        "_safe_dispatch",
        AsyncMock(side_effect=lambda fn, uid, uri: dispatched.append(uid)),
    )

    await _process_tick()
    await asyncio.sleep(0.05)
    assert learner_id not in dispatched
