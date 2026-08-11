"""
Tests for call_repository (backend/src/db/call_repository.py).

All tests use an isolated SQLite temp file — never the production DB.
"""

from __future__ import annotations

import uuid
from contextlib import suppress
from datetime import datetime, timedelta, timezone

import pytest

import src.db.database as _db_module
from src.db import database as database
from src.db.call_repository import (
    call_exists_today,
    get_calls,
    get_missed_unretried,
    insert_call,
    update_call,
)
from src.db.learner_repository import create_learner, delete_learner


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


def _now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def _past_utc(minutes: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_insert_and_get_call(learner_id):
    call_id = insert_call(learner_id, _now_utc(), topic="algebra")
    assert isinstance(call_id, int)
    assert call_id > 0

    records = get_calls(learner_id)
    assert len(records) == 1
    r = records[0]
    assert r["user_id"] == learner_id
    assert r["topic"] == "algebra"
    assert r["status"] == "answered"
    assert r["retry_attempted"] == 0


def test_call_exists_today_true(learner_id):
    insert_call(learner_id, _now_utc())
    assert call_exists_today(learner_id) is True


def test_call_exists_today_false(learner_id):
    assert call_exists_today(learner_id) is False


def test_call_exists_today_yesterday(learner_id):
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%dT12:00:00")
    insert_call(learner_id, yesterday)
    # Yesterday's call should NOT count as today
    assert call_exists_today(learner_id) is False


def test_update_call_status(learner_id):
    call_id = insert_call(learner_id, _now_utc())
    update_call(call_id, status="missed")

    records = get_calls(learner_id)
    assert records[0]["status"] == "missed"


def test_update_call_noop_when_no_kwargs(learner_id):
    call_id = insert_call(learner_id, _now_utc())
    # Should not raise
    update_call(call_id)
    records = get_calls(learner_id)
    assert records[0]["status"] == "answered"


def test_get_missed_unretried_returned(learner_id):
    call_id = insert_call(learner_id, _now_utc())
    update_call(call_id, status="missed", retry_attempted=0)

    result = get_missed_unretried(learner_id)
    assert result is not None
    assert result["id"] == call_id
    assert result["status"] == "missed"


def test_get_missed_unretried_none_when_retried(learner_id):
    call_id = insert_call(learner_id, _now_utc())
    update_call(call_id, status="missed", retry_attempted=1)

    result = get_missed_unretried(learner_id)
    assert result is None


def test_get_missed_unretried_none_when_no_calls(learner_id):
    result = get_missed_unretried(learner_id)
    assert result is None


def test_get_calls_limit(learner_id):
    for _ in range(15):
        insert_call(learner_id, _now_utc())
    records = get_calls(learner_id, limit=10)
    assert len(records) == 10


def test_get_calls_ordering(learner_id):
    insert_call(learner_id, _past_utc(10), topic="first")
    insert_call(learner_id, _past_utc(5), topic="second")
    insert_call(learner_id, _past_utc(1), topic="third")
    records = get_calls(learner_id)
    topics = [r["topic"] for r in records]
    assert topics[0] == "third"  # newest first


def test_get_missed_unretried(learner_id):
    # Insert a call and mark it missed with retry_attempted=0
    call_id = insert_call(learner_id, _now_utc())
    update_call(call_id, status="missed")  # retry_attempted stays 0

    # Should be returned when retry_attempted=0
    result = get_missed_unretried(learner_id)
    assert result is not None
    assert result["id"] == call_id
    assert result["status"] == "missed"
    assert result["retry_attempted"] == 0

    # Now mark retry_attempted=1
    update_call(call_id, retry_attempted=1)

    # Should return None now that retry has been attempted
    result = get_missed_unretried(learner_id)
    assert result is None
