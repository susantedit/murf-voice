"""
Call history REST API — Day 6 endpoints.

GET  /calls/{user_id}       — return last 10 call records
POST /schedule              — save preferred_time + sip_uri for a user

These endpoints are served by the same HTTP server as memory_server.py.
To integrate, import handle_call_request and call it from MemoryHandler.
"""

from __future__ import annotations

import json
import logging
import re

logger = logging.getLogger(__name__)

_CALLS_PATH_RE = re.compile(r"^/calls/(.+)$")
_SCHEDULE_PATH = "/schedule"

try:
    from src.db import call_repository
    from src.db.learner_repository import create_learner, get_learner
except ImportError:
    from db import call_repository  # type: ignore[no-redef]
    from db.learner_repository import (  # type: ignore[no-redef]
        create_learner,
        get_learner,
    )


def handle_get_calls(user_id: str) -> tuple[int, dict]:
    """Return last 10 call records for user_id."""
    if not user_id or len(user_id) > 200:
        return 400, {"error": "invalid_user_id"}
    try:
        records = call_repository.get_calls(user_id, limit=10)
        return 200, {"calls": records}
    except Exception:
        logger.exception("handle_get_calls failed for user_id=%r", user_id)
        return 500, {"error": "internal_error"}


def handle_post_schedule(body_bytes: bytes) -> tuple[int, dict]:
    """Save preferred_time and sip_uri for a user."""
    try:
        body = json.loads(body_bytes.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return 400, {"error": "invalid_json"}

    user_id = body.get("user_id", "").strip()
    preferred_time = body.get("preferred_time", "").strip()
    sip_uri = body.get("sip_uri", "").strip()

    if not user_id:
        return 400, {"error": "user_id_required"}

    # Validate HH:MM format
    if preferred_time:
        parts = preferred_time.split(":")
        if len(parts) != 2 or not all(p.isdigit() for p in parts):
            return 400, {"error": "invalid_preferred_time_format"}
        try:
            h, m = int(parts[0]), int(parts[1])
            if not (0 <= h <= 23 and 0 <= m <= 59):
                return 400, {"error": "invalid_preferred_time_value"}
        except ValueError:
            return 400, {"error": "invalid_preferred_time_value"}

    try:
        # Create learner row if absent
        if get_learner(user_id) is None:
            create_learner(user_id)

        from db.database import get_connection  # type: ignore[import]

        with get_connection() as conn:
            conn.execute(
                "UPDATE users SET preferred_time = ?, sip_uri = ? WHERE user_id = ?",
                (preferred_time or None, sip_uri or None, user_id),
            )
        return 200, {"success": True}
    except Exception:
        logger.exception("handle_post_schedule failed for user_id=%r", user_id)
        return 500, {"error": "internal_error"}


def parse_calls_user_id(path: str) -> str | None:
    """Extract user_id from /calls/{user_id} path."""
    m = _CALLS_PATH_RE.match(path)
    if not m:
        return None
    uid = m.group(1)
    return uid if uid and len(uid) <= 200 else None
