"""
Analytics Repository — aggregate queries for the Call Analytics Dashboard.

Provides:
  get_dashboard_metrics() -> dict  — returns total, successful, and failed call counts.
"""

from __future__ import annotations

try:
    from src.db.database import get_connection
except ImportError:
    from db.database import get_connection  # type: ignore[no-redef]


def get_dashboard_metrics() -> dict:
    """
    Return aggregate call metrics for the dashboard.

    Returns:
        {
            "total_calls": int,
            "successful_calls": int,
            "failed_calls": int,
            "success_rate": float,
            "avg_latency_ms": int,
            "failure_categories": dict[str, int],
            "track_outcomes": dict[str, int],
            "recent_calls": list[dict],
        }

    Invariant: successful_calls + failed_calls == total_calls
    """
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT
                COUNT(*)                                                   AS total_calls,
                SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END)      AS successful_calls,
                SUM(CASE WHEN outcome = 'failure'
                          OR outcome IS NULL  THEN 1 ELSE 0 END)           AS failed_calls,
                AVG(COALESCE(latency_ms, 800))                             AS avg_latency
            FROM call_history
            WHERE status = 'answered'
            """
        ).fetchone()

        # Failure categories breakdown
        cat_rows = conn.execute(
            """
            SELECT COALESCE(failure_reason, 'incomplete_task') AS reason, COUNT(*) AS cnt
            FROM call_history
            WHERE status = 'answered' AND (outcome = 'failure' OR outcome IS NULL)
            GROUP BY reason
            """
        ).fetchall()
        failure_categories = {
            "user_declined": 0,
            "incomplete_task": 0,
            "tool_failure": 0,
            "api_error": 0,
            "no_response": 0,
            "user_hangup": 0,
        }
        for r in cat_rows:
            reason = r["reason"]
            if reason in failure_categories:
                failure_categories[reason] = int(r["cnt"] or 0)
            else:
                failure_categories["incomplete_task"] += int(r["cnt"] or 0)

        # Track outcomes
        ex_row = conn.execute(
            "SELECT COUNT(*) AS total FROM exercise_attempts"
        ).fetchone()
        esc_row = conn.execute(
            "SELECT COUNT(*) AS total FROM escalations"
        ).fetchone()
        opt_row = conn.execute(
            "SELECT COUNT(*) AS total FROM users WHERE call_opt_out = 1"
        ).fetchone()

        track_outcomes = {
            "exercises_completed": int(ex_row["total"] or 0) if ex_row else 0,
            "escalations_created": int(esc_row["total"] or 0) if esc_row else 0,
            "opt_outs": int(opt_row["total"] or 0) if opt_row else 0,
        }

        # Recent calls list
        recent_rows = conn.execute(
            """
            SELECT id, user_id, started_at, COALESCE(duration_seconds, 0) AS duration_seconds,
                   COALESCE(channel, 'browser') AS channel, COALESCE(outcome, 'failure') AS outcome,
                   failure_reason, COALESCE(latency_ms, 800) AS latency_ms
            FROM call_history
            WHERE status = 'answered'
            ORDER BY id DESC
            LIMIT 10
            """
        ).fetchall()
        recent_calls = [
            {
                "id": int(r["id"]),
                "started_at": str(r["started_at"]),
                "duration_seconds": int(r["duration_seconds"]),
                "channel": str(r["channel"]),
                "outcome": str(r["outcome"]),
                "failure_reason": r["failure_reason"],
                "latency_ms": int(r["latency_ms"]),
            }
            for r in recent_rows
        ]

    total_calls = int(row["total_calls"] or 0)
    successful_calls = int(row["successful_calls"] or 0)
    failed_calls = int(row["failed_calls"] or 0)
    success_rate = (
        round((successful_calls / total_calls) * 100, 1) if total_calls > 0 else 0.0
    )
    avg_latency_ms = round(row["avg_latency"] or 800)

    return {
        "total_calls": total_calls,
        "successful_calls": successful_calls,
        "failed_calls": failed_calls,
        "success_rate": success_rate,
        "avg_latency_ms": avg_latency_ms,
        "failure_categories": failure_categories,
        "track_outcomes": track_outcomes,
        "recent_calls": recent_calls,
    }
