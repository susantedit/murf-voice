"""
Escalation repository — database persistence for Day 7 human help / teacher support requests.

Provides functions to store, retrieve, and update human escalation requests in SQLite.
"""

from __future__ import annotations

import logging
from typing import Any

try:
    from db.database import get_connection
except ImportError:
    from src.db.database import get_connection  # type: ignore[no-redef]

logger = logging.getLogger(__name__)


def create_escalation_record(data: dict[str, Any]) -> dict[str, Any]:
    """
    Insert a new escalation record into the database.

    Required keys in data:
      - reference_id
      - user_id
      - reason
      - summary
      - created_at
    Optional keys:
      - name, what_was_checked, urgency, language, follow_up_method, status
    """
    ref_id = data["reference_id"]
    user_id = data["user_id"]
    name = data.get("name")
    reason = data["reason"]
    summary = data["summary"]
    what_was_checked = data.get("what_was_checked", "")
    urgency = data.get("urgency", "medium")
    language = data.get("language", "Hindi-English")
    follow_up_method = data.get("follow_up_method", "teacher_callback")
    status = data.get("status", "open")
    created_at = data["created_at"]

    with get_connection() as conn:
        # Ensure user exists in users table to satisfy foreign key constraint if enabled
        conn.execute(
            """
            INSERT OR IGNORE INTO users (user_id, created_at, updated_at)
            VALUES (?, ?, ?)
            """,
            (user_id, created_at, created_at),
        )

        conn.execute(
            """
            INSERT INTO escalations (
                reference_id, user_id, name, reason, summary,
                what_was_checked, urgency, language, follow_up_method, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                ref_id,
                user_id,
                name,
                reason,
                summary,
                what_was_checked,
                urgency,
                language,
                follow_up_method,
                status,
                created_at,
            ),
        )

    logger.info("Created escalation record reference_id=%r user_id=%r", ref_id, user_id)
    return {
        "reference_id": ref_id,
        "user_id": user_id,
        "name": name,
        "reason": reason,
        "summary": summary,
        "what_was_checked": what_was_checked,
        "urgency": urgency,
        "language": language,
        "follow_up_method": follow_up_method,
        "status": status,
        "created_at": created_at,
    }


def get_escalation_by_id(reference_id: str) -> dict[str, Any] | None:
    """Fetch an escalation record by reference_id."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM escalations WHERE reference_id = ?", (reference_id,)
        ).fetchone()
        if row:
            return dict(row)
    return None


def get_escalations_for_user(user_id: str) -> list[dict[str, Any]]:
    """Fetch all escalation records for a specific user, newest first."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM escalations WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def get_all_escalations(status: str | None = None) -> list[dict[str, Any]]:
    """Fetch all escalation records across all users, optionally filtered by status."""
    with get_connection() as conn:
        if status:
            rows = conn.execute(
                "SELECT * FROM escalations WHERE status = ? ORDER BY created_at DESC",
                (status,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM escalations ORDER BY created_at DESC"
            ).fetchall()
        return [dict(r) for r in rows]


def update_escalation_status(reference_id: str, status: str) -> bool:
    """Update status of an escalation record (e.g. open -> in_progress -> resolved)."""
    valid_statuses = {"open", "in_progress", "resolved"}
    if status not in valid_statuses:
        raise ValueError(f"Invalid status: {status}. Must be one of {valid_statuses}")

    with get_connection() as conn:
        cursor = conn.execute(
            "UPDATE escalations SET status = ? WHERE reference_id = ?",
            (status, reference_id),
        )
        updated = cursor.rowcount > 0

    if updated:
        logger.info(
            "Updated escalation reference_id=%r status=%r", reference_id, status
        )
    return updated
