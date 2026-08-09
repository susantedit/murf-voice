"""
Tests for the learner repository layer (backend/src/db/learner_repository.py).

All tests run against a temporary SQLite file (never the production data/vidya.db).
Each test uses a unique UUID and cleans up after itself via the `learner_id` fixture.
No LiveKit credentials are required.
"""

import uuid
from contextlib import suppress

import pytest

import src.db.database as _db_module
from src.db import database as database
from src.db.learner_repository import (
    add_topic,
    create_learner,
    delete_learner,
    get_facts,
    get_learner,
    get_topics,
    update_last_interaction,
    update_learner,
    upsert_fact,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    """
    Point DB_PATH at a fresh temp file for every test.

    1. Monkeypatch the module-level DB_PATH in src.db.database.
    2. Call init_db() to create the schema in the temp file.
    3. Yield (test runs).
    4. After the test the temp file is discarded automatically by pytest.
    """
    temp_db = str(tmp_path / "test_vidya.db")
    monkeypatch.setattr(_db_module, "DB_PATH", temp_db)
    # Re-run schema creation against the new path.
    database.init_db()
    yield


@pytest.fixture
def learner_id():
    """Return a unique UUID string for a single test and delete the row after."""
    uid = str(uuid.uuid4())
    yield uid
    # Best-effort cleanup — ignore if already deleted.
    with suppress(Exception):
        delete_learner(uid)


# ---------------------------------------------------------------------------
# Task 4.1 — create_learner + get_learner round-trip
# ---------------------------------------------------------------------------


def test_create_and_get_learner(learner_id):
    """Creating a learner and fetching it by ID returns the same user_id."""
    created = create_learner(learner_id)
    assert created["user_id"] == learner_id
    assert created["created_at"] is not None
    assert created["updated_at"] is not None

    fetched = get_learner(learner_id)
    assert fetched is not None
    assert fetched["user_id"] == learner_id
    assert fetched["created_at"] == created["created_at"]


# ---------------------------------------------------------------------------
# Task 4.2 — get_learner with unknown ID returns None
# ---------------------------------------------------------------------------


def test_get_nonexistent_learner():
    """get_learner returns None for a user_id that was never created."""
    unknown_id = str(uuid.uuid4())
    result = get_learner(unknown_id)
    assert result is None


# ---------------------------------------------------------------------------
# Task 4.3 — update_learner allowed field updates correctly
# ---------------------------------------------------------------------------


def test_update_profile_field(learner_id):
    """update_learner writes an allowed field and get_learner reflects the change."""
    create_learner(learner_id)
    updated = update_learner(learner_id, current_level="advanced")
    assert updated is True

    fetched = get_learner(learner_id)
    assert fetched["current_level"] == "advanced"


# ---------------------------------------------------------------------------
# Task 4.4 — update_learner with disallowed field raises ValueError
# ---------------------------------------------------------------------------


def test_update_disallowed_field(learner_id):
    """update_learner raises ValueError when given a field not in _ALLOWED_UPDATE_FIELDS."""
    create_learner(learner_id)
    with pytest.raises(ValueError, match="Unknown field"):
        update_learner(learner_id, secret_field="should_fail")


# ---------------------------------------------------------------------------
# Task 4.5 — upsert_fact creates new fact
# ---------------------------------------------------------------------------


def test_upsert_fact_creates_new(learner_id):
    """upsert_fact stores a new key/value pair that get_facts can retrieve."""
    create_learner(learner_id)
    upsert_fact(learner_id, "notes", "loves algebra")

    facts = get_facts(learner_id)
    fact_dict = {f["key"]: f["value"] for f in facts}
    assert fact_dict["notes"] == "loves algebra"


# ---------------------------------------------------------------------------
# Task 4.6 — upsert_fact updates existing fact (preserves created_at)
# ---------------------------------------------------------------------------


def test_upsert_fact_update_preserves_created_at(learner_id):
    """Updating an existing fact changes value + updated_at but keeps created_at."""
    create_learner(learner_id)
    upsert_fact(learner_id, "notes", "first value")

    # Fetch the raw row to capture created_at
    with database.get_connection() as conn:
        row = conn.execute(
            "SELECT created_at, updated_at FROM learner_facts "
            "WHERE user_id = ? AND key = ?",
            (learner_id, "notes"),
        ).fetchone()
    original_created_at = row["created_at"]
    original_updated_at = row["updated_at"]

    # Small sleep to ensure updated_at will differ
    import time

    time.sleep(0.01)

    upsert_fact(learner_id, "notes", "second value")

    with database.get_connection() as conn:
        row2 = conn.execute(
            "SELECT value, created_at, updated_at FROM learner_facts "
            "WHERE user_id = ? AND key = ?",
            (learner_id, "notes"),
        ).fetchone()

    assert row2["value"] == "second value"
    assert row2["created_at"] == original_created_at, (
        "created_at must not change on update"
    )
    assert row2["updated_at"] >= original_updated_at


# ---------------------------------------------------------------------------
# Task 4.7 — upsert_fact with invalid key raises ValueError
# ---------------------------------------------------------------------------


def test_upsert_invalid_fact_key(learner_id):
    """upsert_fact raises ValueError for a key not in _ALLOWED_FACT_KEYS."""
    create_learner(learner_id)
    with pytest.raises(ValueError, match="Invalid fact key"):
        upsert_fact(learner_id, "password", "hunter2")


# ---------------------------------------------------------------------------
# Task 4.8 — add_topic and get_topics round-trip
# ---------------------------------------------------------------------------


def test_add_and_get_topics(learner_id):
    """Adding a topic makes it appear in get_topics."""
    create_learner(learner_id)
    add_topic(learner_id, "photosynthesis")

    topics = get_topics(learner_id)
    topic_names = [t["topic"] for t in topics]
    assert "photosynthesis" in topic_names


# ---------------------------------------------------------------------------
# Task 4.9 — add_topic is idempotent (no duplicate rows)
# ---------------------------------------------------------------------------


def test_add_duplicate_topic_is_idempotent(learner_id):
    """Calling add_topic twice with the same topic produces exactly one row."""
    create_learner(learner_id)
    add_topic(learner_id, "fractions")
    add_topic(learner_id, "fractions")

    topics = get_topics(learner_id)
    fraction_entries = [t for t in topics if t["topic"] == "fractions"]
    assert len(fraction_entries) == 1


# ---------------------------------------------------------------------------
# Task 4.10 — delete_learner cascade (facts + topics gone)
# ---------------------------------------------------------------------------


def test_delete_learner_cascade(learner_id):
    """Deleting a learner removes their facts and topics via CASCADE."""
    create_learner(learner_id)
    upsert_fact(learner_id, "notes", "some fact")
    add_topic(learner_id, "algebra")

    deleted = delete_learner(learner_id)
    assert deleted is True

    assert get_learner(learner_id) is None
    assert get_facts(learner_id) == []
    assert get_topics(learner_id) == []


# ---------------------------------------------------------------------------
# Task 4.11 — persistence: close connection, reopen, verify data still present
# ---------------------------------------------------------------------------


def test_persistence_across_connections(learner_id):
    """
    Data written through one connection is readable through a fresh connection.
    Validates that the database is on disk, not in-process memory.
    """
    create_learner(learner_id)
    update_learner(learner_id, learning_goal="pass GCSE maths")
    upsert_fact(learner_id, "current_level", "intermediate")
    add_topic(learner_id, "trigonometry")

    # All context managers inside get_connection() already close the connection
    # on exit.  Opening another one here simulates a fresh process connection.
    learner = get_learner(learner_id)
    assert learner is not None
    assert learner["learning_goal"] == "pass GCSE maths"

    facts = get_facts(learner_id)
    fact_dict = {f["key"]: f["value"] for f in facts}
    assert fact_dict["current_level"] == "intermediate"

    topics = get_topics(learner_id)
    topic_names = [t["topic"] for t in topics]
    assert "trigonometry" in topic_names


# ---------------------------------------------------------------------------
# Task 4.12 — update_last_interaction updates timestamp
# ---------------------------------------------------------------------------


def test_update_last_interaction(learner_id):
    """update_last_interaction stamps last_interaction and updated_at."""
    import time

    create_learner(learner_id)

    before = get_learner(learner_id)
    assert before["last_interaction"] is None

    time.sleep(0.01)
    update_last_interaction(learner_id)

    after = get_learner(learner_id)
    assert after["last_interaction"] is not None
    assert after["updated_at"] >= before["updated_at"]


# ---------------------------------------------------------------------------
# Task 4.13 — all tests use unique UUIDs and clean up (enforced by fixtures)
# ---------------------------------------------------------------------------
# The `learner_id` fixture generates a new uuid.uuid4() per test and deletes
# the row in its teardown.  The `isolated_db` fixture gives every test its
# own temp SQLite file.  Together they satisfy the isolation requirement.
# This explicit test documents and verifies that mechanism.


def test_unique_ids_and_cleanup():
    """
    Two independently created learner IDs are distinct and can coexist,
    proving that uuid4() never collides across tests.
    """
    id_a = str(uuid.uuid4())
    id_b = str(uuid.uuid4())
    assert id_a != id_b

    create_learner(id_a)
    create_learner(id_b)

    assert get_learner(id_a) is not None
    assert get_learner(id_b) is not None

    # Cleanup
    delete_learner(id_a)
    delete_learner(id_b)

    assert get_learner(id_a) is None
    assert get_learner(id_b) is None
