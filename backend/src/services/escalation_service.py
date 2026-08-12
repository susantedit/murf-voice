"""
Escalation service — business logic for Day 7 human help / teacher support.

Provides:
- generate_reference_id(): creates unique VID-XXXXXX IDs
- sanitize_summary(): ensures sensitive information (PII/secrets) is never stored
- create_escalation(): creates, sanitizes, and persists escalation requests
- get_escalations(): retrieves escalation records
- update_escalation_status(): updates request status
- send_discord_notification(): sends a Discord embed notification via webhook
"""

from __future__ import annotations

import json
import logging
import os
import re
import secrets
import urllib.request
from datetime import datetime, timezone
from typing import Any

try:
    from db import escalation_repository, learner_repository
except ImportError:
    from src.db import (  # type: ignore[no-redef]
        escalation_repository,
        learner_repository,
    )

logger = logging.getLogger(__name__)

# Patterns for sensitive information redaction (Step 3 Privacy Rules)
_SENSITIVE_PATTERNS = [
    (
        r"\b(?:password|passwd|pwd)\b(?:\s+(?:was|is))?\s*[:=]?\s*\S+",
        "[REDACTED PASSWORD]",
    ),
    (r"\b(?:otp|pin|cvv)\b(?:\s+(?:was|is))?\s*[:=]?\s*\d+", "[REDACTED AUTH TOKEN]"),
    (r"\b(?:\d[ -]*?){13,16}\b", "[REDACTED CARD/ACCOUNT NUMBER]"),
    (
        r"\b(?:bearer|api[-_]?key|secret)\b(?:\s+(?:was|is))?\s*[:=]?\s*\S+",
        "[REDACTED SECRET]",
    ),
]


def generate_reference_id() -> str:
    """Generate a unique reference ID in the format VID-XXXXXX."""
    chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"  # exclude ambiguous 0,1,O,I
    suffix = "".join(secrets.choice(chars) for _ in range(6))
    return f"VID-{suffix}"


def sanitize_summary(summary: str) -> str:
    """
    Sanitize summary string to remove passwords, OTPs, PINs, and sensitive account info.

    Ensures no PII/secrets leak into human-visible teacher support logs.
    """
    clean_summary = summary
    for pattern, replacement in _SENSITIVE_PATTERNS:
        clean_summary = re.sub(pattern, replacement, clean_summary, flags=re.IGNORECASE)
    return clean_summary.strip()


# Discord urgency → color mapping (Req 5.2)
_URGENCY_COLORS: dict[str, int] = {
    "high": 16711680,    # red   #FF0000
    "medium": 15105570,  # orange #E67E22
    "low": 3066993,      # green  #2ECC71
}


def send_discord_notification(record: dict) -> bool:
    """
    Send a Discord embed notification for a new teacher support request.

    Args:
        record: The full escalation record dict as returned by
                escalation_repository.create_escalation_record().

    Returns:
        True if Discord accepted the request (2xx response).
        False if DISCORD_WEBHOOK_URL is unset, the HTTP call fails,
              or any exception is raised.

    Never raises. All failures are logged and swallowed.
    """
    webhook_url = os.getenv("DISCORD_WEBHOOK_URL", "")
    if not webhook_url:
        logger.warning("DISCORD_WEBHOOK_URL not set — skipping Discord notification")
        return False

    urgency = record.get("urgency", "medium")
    color = _URGENCY_COLORS.get(urgency, _URGENCY_COLORS["medium"])

    # Human-readable reason mapping
    _reason_labels: dict[str, str] = {
        "learner_frustrated": "Learner expressed frustration or distress",
        "repeated_topic_failure": "Repeated difficulty with a topic",
        "explicit_teacher_request": "Learner explicitly requested teacher help",
        "concept_too_difficult": "Concept too difficult — Vidya could not explain adequately",
    }
    reason_raw = record.get("reason", "")
    reason_label = _reason_labels.get(reason_raw, reason_raw.replace("_", " ").capitalize())

    urgency_label = urgency.capitalize()

    what_tried = record.get("what_was_checked") or ""
    what_tried_text = (
        what_tried if what_tried else "Vidya provided explanations and guided practice."
    )

    payload = {
        "embeds": [
            {
                "title": f"🆘 Teacher Support Request — {record.get('reference_id', 'Unknown')}",
                "description": (
                    "A new human-support request has been created by **Vidya AI Learning Assistant**."
                ),
                "color": color,
                "fields": [
                    {
                        "name": "Student",
                        "value": record.get("name") or "Unknown",
                        "inline": True,
                    },
                    {
                        "name": "Urgency",
                        "value": urgency_label,
                        "inline": True,
                    },
                    {
                        "name": "Status",
                        "value": record.get("status", "open").capitalize(),
                        "inline": True,
                    },
                    {
                        "name": "Reason",
                        "value": reason_label,
                        "inline": False,
                    },
                    {
                        "name": "Summary",
                        "value": record.get("summary", ""),
                        "inline": False,
                    },
                    {
                        "name": "What Vidya Already Tried",
                        "value": what_tried_text,
                        "inline": False,
                    },
                    {
                        "name": "Language",
                        "value": record.get("language", ""),
                        "inline": True,
                    },
                    {
                        "name": "Reference ID",
                        "value": record.get("reference_id", ""),
                        "inline": True,
                    },
                    {
                        "name": "Created",
                        "value": record.get("created_at", ""),
                        "inline": False,
                    },
                    {
                        "name": "Next Step",
                        "value": (
                            "Please review this request and follow up with the learner "
                            "through the configured support channel."
                        ),
                        "inline": False,
                    },
                ],
                "footer": {"text": "Vidya AI Learning Assistant | Day 7"},
            }
        ]
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            webhook_url,
            data=data,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "User-Agent": "DiscordBot (https://vidya.ai, 1) Python/3.11",
            },
        )
        response = urllib.request.urlopen(req)
        if not (200 <= response.status < 300):
            logger.error(
                "Discord webhook returned non-2xx status %d for reference_id=%r",
                response.status,
                record.get("reference_id"),
            )
            return False
        return True
    except Exception:
        logger.exception(
            "Failed to send Discord notification for reference_id=%r",
            record.get("reference_id"),
        )
        return False


def create_escalation(
    user_id: str,
    reason: str,
    summary: str,
    what_was_checked: str = "",
    urgency: str = "medium",
    language: str = "Hindi-English",
    follow_up_method: str = "teacher_callback",
    name: str | None = None,
) -> dict[str, Any]:
    """
    Create a new human escalation request.

    Generates a unique reference ID, fetches student name if omitted, sanitizes the summary,
    and persists to SQLite via escalation_repository.
    """
    try:
        # If student name is not explicitly passed, try looking it up in memory DB
        if not name:
            learner = learner_repository.get_learner(user_id)
            if learner:
                name = learner.get("name")

        # Generate unique reference ID
        reference_id = generate_reference_id()

        # Sanitize summary for privacy safety
        clean_summary = sanitize_summary(summary)
        clean_checked = sanitize_summary(what_was_checked) if what_was_checked else ""

        # Validate urgency
        valid_urgencies = {"low", "medium", "high"}
        if urgency.lower() not in valid_urgencies:
            urgency = "medium"
        else:
            urgency = urgency.lower()

        created_at = datetime.now(timezone.utc).isoformat()

        record = {
            "reference_id": reference_id,
            "user_id": user_id,
            "name": name or "Student",
            "reason": reason,
            "summary": clean_summary,
            "what_was_checked": clean_checked,
            "urgency": urgency,
            "language": language,
            "follow_up_method": follow_up_method,
            "status": "open",
            "created_at": created_at,
        }

        created_record = escalation_repository.create_escalation_record(record)
        # Discord notification is best-effort: failure does not affect the response
        send_discord_notification(created_record)
        return {"success": True, "escalation": created_record}
    except Exception as e:
        logger.exception("Failed to create escalation for user_id=%r", user_id)
        return {"success": False, "error": str(e)}


def get_escalation(reference_id: str) -> dict[str, Any] | None:
    """Fetch an escalation by its reference ID."""
    return escalation_repository.get_escalation_by_id(reference_id)


def get_escalations(
    user_id: str | None = None, status: str | None = None
) -> list[dict[str, Any]]:
    """Fetch escalation records, optionally filtered by user_id or status."""
    if user_id:
        return escalation_repository.get_escalations_for_user(user_id)
    return escalation_repository.get_all_escalations(status)


def update_status(reference_id: str, status: str) -> dict[str, Any]:
    """Update the status of an escalation request."""
    try:
        updated = escalation_repository.update_escalation_status(reference_id, status)
        if updated:
            return {"success": True, "reference_id": reference_id, "status": status}
        return {"success": False, "error": "record_not_found"}
    except ValueError as ve:
        return {"success": False, "error": str(ve)}
    except Exception as e:
        logger.exception("Failed to update status for reference_id=%r", reference_id)
        return {"success": False, "error": str(e)}
