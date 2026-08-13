"""
Call repository — database operations for call_history and Day 6 users extensions.

Provides CRUD for call_history table and scheduler helpers.
All timestamps are UTC ISO 8601 strings. Results returned as plain dicts.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

try:
    from src.db.database import get_connection
except ImportError:
    from db.database import get_connection  # type: ignore[no-redef]


def _row_to_dict(row: Any) -> dict[str, Any]:
    return dict(row) if row is not None else {}


def insert_call(
    user_id: str,
    started_at: str,
    topic: str | None = None,
    channel: str = "browser",
) -> int:
    """Insert a new call_history row with status='answered'. Return its id."""
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO call_history
                (user_id, started_at, topic, status, retry_attempted, channel)
            VALUES (?, ?, ?, 'answered', 0, ?)
            """,
            (user_id, started_at, topic, channel),
        )
    return cursor.lastrowid  # type: ignore[return-value]


def update_call(
    call_id: int,
    *,
    ended_at: str | None = None,
    duration_seconds: int | None = None,
    topic: str | None = None,
    performance: str | None = None,
    status: str | None = None,
    retry_attempted: int | None = None,
    outcome: str | None = None,
    failure_reason: str | None = None,
    channel: str | None = None,
    latency_ms: int | None = None,
    exercises_completed: int | None = None,
) -> None:
    """Update non-None fields on an existing call_history row."""
    fields = {
        "ended_at": ended_at,
        "duration_seconds": duration_seconds,
        "topic": topic,
        "performance": performance,
        "status": status,
        "retry_attempted": retry_attempted,
        "outcome": outcome,
        "failure_reason": failure_reason,
        "channel": channel,
        "latency_ms": latency_ms,
        "exercises_completed": exercises_completed,
    }
    updates = {k: v for k, v in fields.items() if v is not None}
    if not updates:
        return
    set_clause = ", ".join(f"{col} = ?" for col in updates)
    values = list(updates.values())
    values.append(call_id)
    with get_connection() as conn:
        conn.execute(
            f"UPDATE call_history SET {set_clause} WHERE id = ?",
            values,
        )


def get_calls(user_id: str, limit: int = 10) -> list[dict[str, Any]]:
    """Return the last `limit` calls for a user, newest first."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT * FROM call_history
            WHERE user_id = ?
            ORDER BY started_at DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
    return [dict(row) for row in rows]


def call_exists_today(user_id: str) -> bool:
    """Return True if a call_history row exists for this user today (UTC date)."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id FROM call_history WHERE user_id = ? AND started_at LIKE ? LIMIT 1",
            (user_id, f"{today}%"),
        ).fetchone()
    return row is not None


def get_missed_unretried(user_id: str) -> dict[str, Any] | None:
    """Return the most recent missed call with retry_attempted=0, or None."""
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT * FROM call_history
            WHERE user_id = ? AND status = 'missed' AND retry_attempted = 0
            ORDER BY started_at DESC
            LIMIT 1
            """,
            (user_id,),
        ).fetchone()
    return _row_to_dict(row) if row is not None else None


def get_schedulable_users() -> list[dict[str, Any]]:
    """Return users who have a preferred_time, sip_uri, and have not opted out."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT user_id, preferred_time, sip_uri
            FROM users
            WHERE preferred_time IS NOT NULL
              AND call_opt_out = 0
              AND sip_uri IS NOT NULL
            """
        ).fetchall()
    return [dict(row) for row in rows]


def set_opt_out(user_id: str, value: int) -> None:
    """Set call_opt_out flag for a user. value=1 to opt out, 0 to re-enable."""
    with get_connection() as conn:
        conn.execute(
            "UPDATE users SET call_opt_out = ? WHERE user_id = ?",
            (value, user_id),
        )
