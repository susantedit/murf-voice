"""
Memory service — safe wrappers around the learner repository.

Provides get_learner_memory, save_learner_memory, and forget_learner_memory
for use by agent tools and the memory REST API. All functions catch database
exceptions and return structured error responses rather than propagating
exceptions to callers.
"""

from __future__ import annotations

import logging

from db.learner_repository import (
    add_topic,
    create_learner,
    delete_learner,
    get_learner,
    get_topics,
    update_learner,
)

logger = logging.getLogger(__name__)

# Profile fields handled by update_learner (users table)
_PROFILE_FIELDS = frozenset(
    {"name", "language_preference", "current_level", "learning_goal"}
)


def get_learner_memory(user_id: str) -> dict:
    """Return a learner's memory summary.

    Returns:
        dict with ``found=True`` and memory fields if the learner exists,
        ``{"found": False}`` if not found, or
        ``{"found": False, "error": "memory_unavailable"}`` on exception.
    """
    try:
        learner = get_learner(user_id)
        if learner is None:
            return {"found": False}

        topics = get_topics(user_id)
        return {
            "found": True,
            "name": learner.get("name"),
            "language_preference": learner.get("language_preference"),
            "current_level": learner.get("current_level"),
            "learning_goal": learner.get("learning_goal"),
            "topics": [t["topic"] for t in topics],
            "last_interaction": learner.get("last_interaction"),
        }
    except Exception:
        logger.exception("get_learner_memory failed for user_id=%r", user_id)
        return {"found": False, "error": "memory_unavailable"}


def save_learner_memory(user_id: str, field: str, value: str) -> dict:
    """Persist a single piece of learner information.

    For profile fields (name, language_preference, current_level, learning_goal)
    the value is written to the users table. For ``field="topic"`` the value is
    appended to learning_topics. The learner row is created first if absent.

    Returns:
        ``{"success": True}`` or ``{"success": False, "error": "..."}``.
    """
    try:
        # Ensure the learner row exists before any write
        if get_learner(user_id) is None:
            create_learner(user_id)

        if field in _PROFILE_FIELDS:
            update_learner(user_id, **{field: value})
        elif field == "topic":
            add_topic(user_id, value)
        else:
            return {
                "success": False,
                "error": f"unknown_field:{field}",
            }

        return {"success": True}
    except ValueError as exc:
        logger.warning(
            "save_learner_memory validation error for user_id=%r field=%r: %s",
            user_id,
            field,
            exc,
        )
        return {"success": False, "error": str(exc)}
    except Exception:
        logger.exception(
            "save_learner_memory failed for user_id=%r field=%r", user_id, field
        )
        return {"success": False, "error": "save_unavailable"}


def forget_learner_memory(user_id: str) -> dict:
    """Delete all data for the given learner (cascades to facts and topics).

    Returns:
        ``{"success": True}`` or ``{"success": False}``.
    """
    try:
        delete_learner(user_id)
        return {"success": True}
    except Exception:
        logger.exception("forget_learner_memory failed for user_id=%r", user_id)
        return {"success": False}
