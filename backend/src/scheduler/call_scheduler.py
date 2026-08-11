"""
Call scheduler — asyncio loop that fires outbound learning calls at scheduled times.

Wakes every TICK_INTERVAL seconds. For each schedulable user:
- If preferred_time is within ±DRIFT_WINDOW_MINUTES of now AND no call today → dispatch
- If there is an unretried missed call older than RETRY_DELAY_MINUTES → dispatch retry
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

TICK_INTERVAL = 60  # seconds between scheduler wakes
DRIFT_WINDOW_MINUTES = 5  # ±minutes window for preferred_time matching
RETRY_DELAY_MINUTES = 10  # minutes after missed call before retrying

# Module-level set to keep background task references alive (prevents GC).
_background_tasks: set[asyncio.Task] = set()


def _keep_task(task: asyncio.Task) -> None:
    """Add task to the module-level set and auto-remove when done."""
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


def _parse_hhmm(s: str) -> tuple[int, int]:
    """Parse 'HH:MM' string → (hour, minute). Raises ValueError on bad input."""
    parts = s.strip().split(":")
    if len(parts) != 2:
        raise ValueError(f"Invalid HH:MM string: {s!r}")
    return int(parts[0]), int(parts[1])


def _is_within_window(
    preferred_time: str,
    now: datetime,
    window_minutes: int = DRIFT_WINDOW_MINUTES,
) -> bool:
    """Return True if preferred_time (HH:MM) is within ±window_minutes of now."""
    try:
        hour, minute = _parse_hhmm(preferred_time)
    except ValueError:
        logger.warning("Could not parse preferred_time=%r", preferred_time)
        return False
    target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    delta = abs(now - target)
    # Handle midnight wraparound
    if delta > timedelta(hours=12):
        delta = timedelta(hours=24) - delta
    return delta <= timedelta(minutes=window_minutes)


async def _safe_dispatch(fn, user_id: str, sip_uri: str) -> None:
    """Wrap a dispatch call so one failure does not crash the scheduler loop."""
    try:
        result = await fn(user_id, sip_uri)
        if not result.get("success"):
            logger.warning(
                "Dispatch returned failure for user_id=%r: %s",
                user_id,
                result.get("error"),
            )
    except Exception:
        logger.exception("Unexpected error dispatching call for user_id=%r", user_id)


async def _process_tick() -> None:
    """One scheduler tick: check for due calls and due retries."""
    try:
        from services.call_service import dispatch_outbound_sip_call
    except ImportError:
        from src.services.call_service import (  # type: ignore[no-redef]
            dispatch_outbound_sip_call,
        )

    try:
        from db.call_repository import (
            call_exists_today,
            get_missed_unretried,
            get_schedulable_users,
            update_call,
        )
    except ImportError:
        from src.db.call_repository import (  # type: ignore[no-redef]
            call_exists_today,
            get_missed_unretried,
            get_schedulable_users,
            update_call,
        )

    now = datetime.now()
    users = get_schedulable_users()
    logger.info("Scheduler tick — checking %d schedulable users", len(users))

    for user in users:
        user_id: str = user["user_id"]
        sip_uri: str = user.get("sip_uri", "")
        preferred_time: str = user.get("preferred_time", "")

        # ── Scheduled call ──────────────────────────────────────────────────
        if (
            preferred_time
            and _is_within_window(preferred_time, now)
            and not call_exists_today(user_id)
        ):
            logger.info("Initiating outbound call for user_id=%r", user_id)
            _keep_task(
                asyncio.create_task(
                    _safe_dispatch(dispatch_outbound_sip_call, user_id, sip_uri)
                )
            )

        # ── Retry missed call ────────────────────────────────────────────────
        missed = get_missed_unretried(user_id)
        if missed:
            started_at = missed.get("started_at", "")
            try:
                started_dt = datetime.fromisoformat(started_at)
                age = now - started_dt.replace(tzinfo=None)
                if age >= timedelta(minutes=RETRY_DELAY_MINUTES):
                    logger.info("Retrying missed call for user_id=%r", user_id)
                    # Mark original as retried BEFORE dispatching to prevent double retry
                    update_call(missed["id"], retry_attempted=1)
                    _keep_task(
                        asyncio.create_task(
                            _safe_dispatch(dispatch_outbound_sip_call, user_id, sip_uri)
                        )
                    )
            except (ValueError, TypeError):
                logger.warning(
                    "Could not parse started_at=%r for user_id=%r",
                    started_at,
                    user_id,
                )


async def run_scheduler(tick_interval: int = TICK_INTERVAL) -> None:
    """
    Run the outbound call scheduler indefinitely.

    Wakes every `tick_interval` seconds and processes scheduled calls.
    Exceptions within a single tick are logged but do not stop the loop.
    """
    logger.info("Call scheduler started (tick_interval=%ds)", tick_interval)
    while True:
        await asyncio.sleep(tick_interval)
        try:
            await _process_tick()
        except Exception:
            logger.exception(
                "Scheduler tick raised an unexpected exception — continuing"
            )
