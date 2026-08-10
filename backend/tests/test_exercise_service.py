"""
Tests for the exercise service (backend/src/services/exercise_service.py).

Uses isolated SQLite (same pattern as test_memory.py).
Does NOT require LiveKit credentials.
"""

from __future__ import annotations

import uuid
from contextlib import suppress

import pytest

import src.db.database as _db_module
import src.services.exercise_service as exercise_service_module
from src.db import database as database
from src.db.learner_repository import create_learner, delete_learner
from src.services.exercise_service import (
    get_next_exercise,
    reset_cache,
    score_answer,
)
from src.services.memory_service import save_learner_memory

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    """
    Point DB_PATH at a fresh temp file and reset exercise cache for every test.
    Uses the same isolation pattern as test_memory.py.
    """
    temp_db = str(tmp_path / "test_vidya.db")
    monkeypatch.setattr(_db_module, "DB_PATH", temp_db)
    database.init_db()
    reset_cache()
    yield
    reset_cache()


@pytest.fixture
def learner_id():
    """Return a unique UUID and clean up after the test."""
    uid = str(uuid.uuid4())
    yield uid
    with suppress(Exception):
        delete_learner(uid)


# ---------------------------------------------------------------------------
# get_next_exercise — happy path
# ---------------------------------------------------------------------------


def test_get_next_exercise_returns_exercise(learner_id):
    """Basic call returns success=True with all required fields."""
    result = get_next_exercise(learner_id)
    assert result["success"] is True
    for field in (
        "exercise_id",
        "topic",
        "level",
        "difficulty",
        "question",
        "hint",
        "data_source",
    ):
        assert field in result, f"Missing required field: {field}"
    assert result["question"] != ""
    assert result["data_source"] == "local_curated"


def test_get_next_exercise_uses_memory_topic(learner_id):
    """When learner has a saved topic in memory, exercise should match it."""
    create_learner(learner_id)
    save_learner_memory(learner_id, "topic", "algebra")

    result = get_next_exercise(learner_id)
    assert result["success"] is True
    # Either the topic matches or matched_from_memory is True
    assert result["topic"] == "algebra" or result.get("matched_from_memory") is True


def test_get_next_exercise_excludes_recent(learner_id):
    """
    After answering an exercise, the next call should prefer a different one.
    We score the first result to register it as 'recent' in exercise_attempts,
    then verify the second call returns a different exercise (when multiple exist).
    There are 3 algebra exercises in the dataset, so exclusion should kick in.
    If only one algebra exercise existed, the same ID would be acceptable (fallback).
    """
    create_learner(learner_id)

    result1 = get_next_exercise(learner_id, topic="algebra")
    assert result1["success"] is True
    assert result1["exercise_id"] != ""

    # Record the first exercise as attempted so the service treats it as recent.
    # get_next_exercise excludes IDs found in exercise_attempts (via get_recent_exercise_ids).
    score_answer(learner_id, result1["exercise_id"], result1["_answer"], result1)

    result2 = get_next_exercise(learner_id, topic="algebra")
    assert result2["success"] is True
    assert result2["exercise_id"] != ""

    # With 3 algebra exercises in the dataset the second pick must differ.
    # Guard: if somehow only 1 exercise existed, same ID is acceptable (fallback).
    algebra_exercises = [
        ex
        for ex in (exercise_service_module._exercises_cache or [])
        if ex.get("topic") == "algebra"
    ]
    if len(algebra_exercises) > 1:
        assert result2["exercise_id"] != result1["exercise_id"], (
            f"Expected a different exercise on the second call, "
            f"but got '{result2['exercise_id']}' both times"
        )
    else:
        # Only one algebra exercise — fallback to same is acceptable
        assert result2["success"] is True


# ---------------------------------------------------------------------------
# get_next_exercise — failure paths
# ---------------------------------------------------------------------------


def test_get_next_exercise_service_disabled(monkeypatch, learner_id):
    """When EXERCISE_SERVICE_DISABLED=1, returns success=False."""
    monkeypatch.setenv("EXERCISE_SERVICE_DISABLED", "1")
    result = get_next_exercise(learner_id)
    assert result["success"] is False
    assert result["error"] == "service_unavailable"


def test_get_next_exercise_empty_dataset(monkeypatch, learner_id):
    """When the exercise cache is empty, returns success=False."""
    monkeypatch.setattr(exercise_service_module, "_exercises_cache", [])
    monkeypatch.setattr(
        exercise_service_module,
        "_dataset_meta",
        {"source": "local_curated", "updated": "unknown"},
    )
    result = get_next_exercise(learner_id)
    assert result["success"] is False
    assert result["error"] == "no_dataset"


# ---------------------------------------------------------------------------
# score_answer — happy path
# ---------------------------------------------------------------------------


def test_score_answer_correct(learner_id):
    """Exact correct answer returns result='correct'."""
    create_learner(learner_id)
    exercise = get_next_exercise(learner_id, topic="algebra")
    assert exercise["success"] is True

    correct_answer = exercise["_answer"]
    score = score_answer(learner_id, exercise["exercise_id"], correct_answer, exercise)
    assert score["success"] is True
    assert score["result"] == "correct"


def test_score_answer_incorrect(learner_id):
    """Clearly wrong answer returns result='incorrect'."""
    create_learner(learner_id)
    exercise = get_next_exercise(learner_id, topic="algebra")
    assert exercise["success"] is True

    score = score_answer(
        learner_id,
        exercise["exercise_id"],
        "xyzzy_wrong_answer_42_nonsense",
        exercise,
    )
    assert score["success"] is True
    assert score["result"] == "incorrect"


def test_score_answer_partial(learner_id):
    """A correct answer should be graded as correct or partially_correct."""
    create_learner(learner_id)
    exercise = get_next_exercise(learner_id, topic="geography")
    assert exercise["success"] is True

    correct_answer = exercise["_answer"]
    score = score_answer(learner_id, exercise["exercise_id"], correct_answer, exercise)
    assert score["success"] is True
    assert score["result"] in ("correct", "partially_correct")


# ---------------------------------------------------------------------------
# score_answer — failure paths
# ---------------------------------------------------------------------------


def test_score_answer_service_disabled(monkeypatch, learner_id):
    """When EXERCISE_SERVICE_DISABLED=1, score_answer returns success=False."""
    monkeypatch.setenv("EXERCISE_SERVICE_DISABLED", "1")
    result = score_answer(learner_id, "alg-001", "7", None)
    assert result["success"] is False
    assert result["error"] == "service_unavailable"


def test_score_answer_records_attempt(learner_id):
    """After scoring, exercise_attempts table has a row for the learner."""
    create_learner(learner_id)
    exercise = get_next_exercise(learner_id, topic="algebra")
    assert exercise["success"] is True

    score_answer(
        learner_id,
        exercise["exercise_id"],
        exercise["_answer"],
        exercise,
    )

    with database.get_connection() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS cnt FROM exercise_attempts WHERE user_id = ?",
            (learner_id,),
        ).fetchone()
    assert row["cnt"] >= 1
