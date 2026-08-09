"""
Learner repository — all database operations for persistent learner memory.

Provides CRUD operations for users, learner_facts, and learning_topics tables.
All timestamps are UTC ISO 8601 strings. All results are returned as plain dicts.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

try:
    from src.db.database import get_connection
except ImportError:
    from db.database import get_connection  # type: ignore[no-redef]

# Fields that may be updated on the users table via update_learner()
_ALLOWED_UPDATE_FIELDS = frozenset(
    {"name", "language_preference", "current_level", "learning_goal"}
)

# Keys that are valid for the learner_facts table
_ALLOWED_FACT_KEYS = frozenset(
    {
        "name",
        "language_preference",
        "current_level",
        "learning_goal",
        "learning_style",
        "notes",
    }
)


def _now() -> str:
    """Return current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


def _row_to_dict(row: Any) -> dict[str, Any]:
    """Convert a sqlite3.Row (or None) to a plain dict."""
    return dict(row) if row is not None else {}


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


def get_learner(user_id: str) -> dict[str, Any] | None:
    """Return learner row as dict, or None if not found."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    if row is None:
        return None
    return _row_to_dict(row)


def create_learner(user_id: str) -> dict[str, Any]:
    """Insert a new learner row with default values and return it."""
    now = _now()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO users (user_id, created_at, updated_at)
            VALUES (?, ?, ?)
            """,
            (user_id, now, now),
        )
        row = conn.execute(
            "SELECT * FROM users WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    return _row_to_dict(row)


def update_learner(user_id: str, **kwargs: str) -> bool:
    """Update allowed profile fields on the users row.

    Only the fields in _ALLOWED_UPDATE_FIELDS are accepted.
    Raises ValueError for any unrecognised field name.
    Returns True if a row was updated, False if the user does not exist.
    """
    if not kwargs:
        return False

    unknown = set(kwargs) - _ALLOWED_UPDATE_FIELDS
    if unknown:
        raise ValueError(f"Unknown field(s) for update_learner: {unknown}")

    set_clauses = ", ".join(f"{col} = ?" for col in kwargs)
    values = list(kwargs.values())
    values.append(_now())  # updated_at
    values.append(user_id)

    with get_connection() as conn:
        cursor = conn.execute(
            f"UPDATE users SET {set_clauses}, updated_at = ? WHERE user_id = ?",
            values,
        )
    return cursor.rowcount > 0


def update_last_interaction(user_id: str) -> None:
    """Stamp last_interaction and updated_at with the current UTC time."""
    now = _now()
    with get_connection() as conn:
        conn.execute(
            "UPDATE users SET last_interaction = ?, updated_at = ? WHERE user_id = ?",
            (now, now, user_id),
        )


def delete_learner(user_id: str) -> bool:
    """Delete a learner and all associated data via CASCADE.

    Returns True if the learner existed and was deleted.
    """
    with get_connection() as conn:
        cursor = conn.execute(
            "DELETE FROM users WHERE user_id = ?",
            (user_id,),
        )
    return cursor.rowcount > 0


# ---------------------------------------------------------------------------
# Facts
# ---------------------------------------------------------------------------


def get_facts(user_id: str) -> list[dict[str, str]]:
    """Return a list of {key, value} dicts for the given user."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT key, value FROM learner_facts WHERE user_id = ?",
            (user_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def upsert_fact(user_id: str, key: str, value: str) -> None:
    """Insert or replace a single fact for the user.

    Raises ValueError if *key* is not in _ALLOWED_FACT_KEYS.
    """
    if key not in _ALLOWED_FACT_KEYS:
        raise ValueError(
            f"Invalid fact key {key!r}. Allowed keys: {sorted(_ALLOWED_FACT_KEYS)}"
        )
    now = _now()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO learner_facts
                (user_id, key, value, created_at, updated_at)
            VALUES (?, ?, ?, COALESCE(
                (SELECT created_at FROM learner_facts
                 WHERE user_id = ? AND key = ?),
                ?
            ), ?)
            """,
            (user_id, key, value, user_id, key, now, now),
        )


# ---------------------------------------------------------------------------
# Topics
# ---------------------------------------------------------------------------


def get_topics(user_id: str) -> list[dict[str, Any]]:
    """Return a list of {topic, status, last_discussed} dicts for the user."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT topic, status, last_discussed FROM learning_topics WHERE user_id = ?",
            (user_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def add_topic(user_id: str, topic: str, status: str = "studying") -> None:
    """Add a topic (or update status and last_discussed if it already exists).

    Uses INSERT OR IGNORE to avoid duplicate rows, then always updates
    status and last_discussed so repeated calls stay idempotent.
    """
    now = _now()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO learning_topics (user_id, topic, status, last_discussed)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, topic, status, now),
        )
        conn.execute(
            """
            UPDATE learning_topics
            SET status = ?, last_discussed = ?
            WHERE user_id = ? AND topic = ?
            """,
            (status, now, user_id, topic),
        )
