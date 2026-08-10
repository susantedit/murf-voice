"""
Exercise service — fetch and score practice exercises from the local dataset.

Data source: backend/data/exercises/exercises.json (local curated dataset, not live API).
Set EXERCISE_SERVICE_DISABLED=1 to simulate service failure for testing.
"""

from __future__ import annotations

import json
import logging
import os
import random
import re
from difflib import SequenceMatcher
from pathlib import Path

from db.exercise_repository import get_recent_exercise_ids, record_attempt
from services import memory_service

logger = logging.getLogger(__name__)

_HERE = Path(__file__).resolve().parent
_BACKEND_DIR = _HERE.parent.parent
EXERCISES_PATH = _BACKEND_DIR / "data" / "exercises" / "exercises.json"

# Module-level cache — loaded once per worker process
_exercises_cache: list[dict] | None = None
_dataset_meta: dict | None = None


def _service_disabled() -> bool:
    return os.getenv("EXERCISE_SERVICE_DISABLED", "").lower() in ("1", "true", "yes")


def _load_dataset() -> tuple[list[dict], dict]:
    global _exercises_cache, _dataset_meta
    if _exercises_cache is not None and _dataset_meta is not None:
        return _exercises_cache, _dataset_meta

    if not EXERCISES_PATH.exists():
        logger.error("Exercise dataset not found at %s", EXERCISES_PATH)
        _exercises_cache = []
        _dataset_meta = {"source": "local_curated", "updated": "unknown"}
        return _exercises_cache, _dataset_meta

    with EXERCISES_PATH.open(encoding="utf-8") as f:
        data = json.load(f)

    _exercises_cache = data.get("exercises", [])
    _dataset_meta = {
        "source": data.get("source", "local_curated"),
        "updated": data.get("updated", "unknown"),
        "description": data.get("description", ""),
    }
    return _exercises_cache, _dataset_meta


def _normalize(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s]", "", text)
    return re.sub(r"\s+", " ", text)


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, _normalize(a), _normalize(b)).ratio()


def _parse_class_num(level: str | None) -> int | None:
    if not level:
        return None
    m = re.search(r"(\d{1,2})", level)
    return int(m.group(1)) if m else None


def _topic_matches(exercise_topic: str, query: str) -> bool:
    """Fuzzy topic match — 'algebra' matches 'algebra', 'math' matches 'arithmetic'."""
    et = _normalize(exercise_topic)
    q = _normalize(query)
    if not q:
        return True
    if et == q or et in q or q in et:
        return True
    aliases: dict[str, list[str]] = {
        "algebra": ["algebra", "math", "maths", "equation"],
        "fractions": ["fraction", "fractions"],
        "photosynthesis": ["photosynthesis", "plant", "biology", "science"],
        "biology": ["biology", "bio", "life science"],
        "geography": ["geography", "geo", "map", "capital"],
        "arithmetic": ["arithmetic", "math", "maths", "multiply", "addition"],
        "physics": ["physics", "force", "light"],
        "chemistry": ["chemistry", "chem", "chemical"],
        "history": ["history", "hist", "independence"],
        "water cycle": ["water cycle", "evaporation", "rain"],
        "hindi grammar": ["hindi", "grammar", "visheshan"],
    }
    for key, terms in aliases.items():
        if any(t in q for t in terms) and (key in et or et in key):
            return True
    return False


def _level_matches(exercise_level: str, learner_level: str | None) -> bool:
    if not learner_level:
        return True
    ex_num = _parse_class_num(exercise_level)
    ln_num = _parse_class_num(learner_level)
    if ex_num is None or ln_num is None:
        return True
    return abs(ex_num - ln_num) <= 2


def _pick_topic_from_memory(memory: dict) -> str:
    topics = memory.get("topics") or []
    if topics:
        return topics[-1]
    goal = memory.get("learning_goal") or ""
    if goal:
        return goal
    return ""


def get_next_exercise(
    user_id: str,
    topic: str = "",
    difficulty: str = "",
    level: str = "",
) -> dict:
    """Select the next practice exercise for a learner.

    Uses Day 4 memory (level, topics, goal) when topic/level are not provided.
    Returns structured dict with success flag and exercise fields.
    """
    if _service_disabled():
        logger.warning("Exercise service disabled via EXERCISE_SERVICE_DISABLED")
        return {
            "success": False,
            "error": "service_unavailable",
            "message": (
                "Exercise service is temporarily unavailable. "
                "Continue with the last topic or ask for an explanation."
            ),
        }

    exercises, meta = _load_dataset()
    if not exercises:
        return {
            "success": False,
            "error": "no_dataset",
            "message": "No exercises are loaded right now.",
        }

    memory = memory_service.get_learner_memory(user_id)
    if memory.get("found"):
        if not level:
            level = memory.get("current_level") or ""
        if not topic:
            topic = _pick_topic_from_memory(memory)

    recent_ids = set(get_recent_exercise_ids(user_id, limit=8))

    candidates = [
        ex
        for ex in exercises
        if ex["id"] not in recent_ids
        and _topic_matches(ex.get("topic", ""), topic)
        and _level_matches(ex.get("level", ""), level)
        and (not difficulty or ex.get("difficulty", "") == difficulty.lower())
    ]

    if not candidates and topic:
        candidates = [
            ex
            for ex in exercises
            if ex["id"] not in recent_ids and _topic_matches(ex.get("topic", ""), topic)
        ]

    if not candidates:
        candidates = [ex for ex in exercises if ex["id"] not in recent_ids]

    if not candidates:
        candidates = list(exercises)

    chosen = random.choice(candidates)

    return {
        "success": True,
        "exercise_id": chosen["id"],
        "topic": chosen.get("topic", ""),
        "level": chosen.get("level", ""),
        "difficulty": chosen.get("difficulty", ""),
        "question": chosen.get("question", ""),
        "question_hi": chosen.get("question_hi", ""),
        "hint": chosen.get("hint", ""),
        "hint_hi": chosen.get("hint_hi", ""),
        "data_source": meta.get("source", "local_curated"),
        "dataset_updated": meta.get("updated", "unknown"),
        "matched_from_memory": bool(memory.get("found") and topic),
        "memory_topic_used": topic or None,
        "memory_level_used": level or None,
        # Internal — not for speaking aloud
        "_answer": chosen.get("answer", ""),
        "_acceptable_answers": chosen.get("acceptable_answers", []),
        "_explanation": chosen.get("explanation", ""),
    }


def score_answer(
    user_id: str,
    exercise_id: str,
    user_answer: str,
    exercise_data: dict | None = None,
) -> dict:
    """Score a learner's answer against the exercise.

    Returns correct/incorrect/partially_correct with explanation and next step.
    """
    if _service_disabled():
        return {
            "success": False,
            "error": "service_unavailable",
            "message": "Cannot check your answer right now. Let's try again in a moment.",
        }

    exercises, meta = _load_dataset()
    exercise = None
    if exercise_data and exercise_data.get("exercise_id") == exercise_id:
        exercise = exercise_data
    else:
        exercise = next((ex for ex in exercises if ex["id"] == exercise_id), None)

    if exercise is None:
        return {
            "success": False,
            "error": "exercise_not_found",
            "message": "I couldn't find that exercise. Let's start a new practice question.",
        }

    correct = exercise.get("answer", "") or exercise.get("_answer", "")
    acceptable = exercise.get("acceptable_answers", []) or exercise.get(
        "_acceptable_answers", []
    )
    all_valid = [correct, *acceptable]

    norm_answer = _normalize(user_answer)
    if not norm_answer:
        return {
            "success": True,
            "result": "incorrect",
            "explanation": "I didn't catch an answer. Could you try again?",
            "hint": exercise.get("hint", ""),
            "hint_hi": exercise.get("hint_hi", ""),
            "next_step": "Try answering the question again.",
            "correct_answer": correct,
            "data_source": meta.get("source", "local_curated"),
        }

    best_score = 0.0
    for valid in all_valid:
        if _normalize(valid) == norm_answer:
            best_score = 1.0
            break
        sim = _similarity(user_answer, valid)
        best_score = max(best_score, sim)

    if best_score >= 0.95:
        result = "correct"
        explanation = exercise.get("explanation", f"Yes! The answer is {correct}.")
        hint = ""
        next_step = "Great job! Ready for another question?"
    elif best_score >= 0.65:
        result = "partially_correct"
        explanation = (
            f"You're close! The complete answer is {correct}. "
            + exercise.get("explanation", "")
        )
        hint = exercise.get("hint", "")
        next_step = "Try a similar question to reinforce this."
    else:
        result = "incorrect"
        explanation = exercise.get("explanation", f"The answer is {correct}.")
        hint = exercise.get("hint", "")
        next_step = "No worries — let's review the concept and try again."

    record_attempt(user_id, exercise_id, exercise.get("topic", ""), result)

    return {
        "success": True,
        "result": result,
        "explanation": explanation.strip(),
        "hint": hint,
        "hint_hi": exercise.get("hint_hi", ""),
        "next_step": next_step,
        "correct_answer": correct,
        "topic": exercise.get("topic", ""),
        "data_source": meta.get("source", "local_curated"),
    }


def get_exercise_by_id(exercise_id: str) -> dict | None:
    """Return full exercise record by ID (for agent internal use)."""
    exercises, _ = _load_dataset()
    return next((ex for ex in exercises if ex["id"] == exercise_id), None)


def reset_cache() -> None:
    """Clear the in-memory exercise cache (for tests)."""
    global _exercises_cache, _dataset_meta
    _exercises_cache = None
    _dataset_meta = None
