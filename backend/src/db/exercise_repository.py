"""
Exercise repository — database operations for exercise attempt tracking.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

try:
    from src.db.database import get_connection
except ImportError:
    from db.database import get_connection  # type: ignore[no-redef]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def record_attempt(
    user_id: str,
    exercise_id: str,
    topic: str,
    result: str,
) -> None:
    """Record a single exercise attempt for progress tracking."""
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO exercise_attempts
                (user_id, exercise_id, topic, result, attempted_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, exercise_id, topic, result, _now()),
        )


def get_recent_exercise_ids(user_id: str, limit: int = 10) -> list[str]:
    """Return exercise IDs attempted most recently by this learner."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT exercise_id FROM exercise_attempts
            WHERE user_id = ?
            ORDER BY attempted_at DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
    return [row["exercise_id"] for row in rows]


def get_topic_stats(user_id: str) -> list[dict[str, Any]]:
    """Return attempt counts grouped by topic for the learner."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT topic,
                   COUNT(*) AS attempts,
                   SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) AS correct
            FROM exercise_attempts
            WHERE user_id = ?
            GROUP BY topic
            ORDER BY attempts DESC
            """,
            (user_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def has_attempt_in_window(user_id: str, started_at: str | None, ended_at: str) -> bool:
    """Return True if >= 1 exercise_attempts row for user_id falls within [started_at, ended_at]."""
    if started_at is None:
        return False
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT 1 FROM exercise_attempts
            WHERE user_id = ?
              AND attempted_at >= ?
              AND attempted_at <= ?
            LIMIT 1
            """,
            (user_id, started_at, ended_at),
        ).fetchone()
    return row is not None
