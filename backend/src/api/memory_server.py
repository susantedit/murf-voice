"""
Memory REST API server — Day 6 extended with call history and scheduling.

Endpoints:
  GET    /memory/{user_id}   — learner memory (includes Day 6 scheduling fields)
  DELETE /memory/{user_id}   — delete all learner data
  GET    /calls/{user_id}    — last 10 call records
  POST   /schedule           — save preferred_time + sip_uri

Start with:
    uv run python -m src.api.memory_server
"""

from __future__ import annotations

import json
import logging
import os
import re
from http.server import BaseHTTPRequestHandler, HTTPServer

from db.database import init_db
from services import escalation_service
from services.memory_service import forget_learner_memory, get_learner_memory

try:
    from api.call_server import (
        handle_get_calls,
        handle_post_schedule,
        parse_calls_user_id,
    )
    from db.exercise_repository import get_topic_stats
    from db.learner_repository import get_learner
except ImportError:
    from src.api.call_server import (  # type: ignore[no-redef]
        handle_get_calls,
        handle_post_schedule,
        parse_calls_user_id,
    )
    from src.db.exercise_repository import get_topic_stats  # type: ignore[no-redef]
    from src.db.learner_repository import get_learner  # type: ignore[no-redef]

try:
    from db.analytics_repository import get_dashboard_metrics
except ImportError:
    from src.db.analytics_repository import (
        get_dashboard_metrics,  # type: ignore[no-redef]
    )

logger = logging.getLogger(__name__)

_USER_ID_MAX_LEN = 200
_PATH_RE = re.compile(r"^/memory/(.+)$")

_CORS_HEADERS: list[tuple[str, str]] = [
    ("Access-Control-Allow-Origin", "*"),
    ("Access-Control-Allow-Methods", "GET, DELETE, POST, PATCH, OPTIONS"),
    ("Access-Control-Allow-Headers", "Content-Type"),
]


def _parse_user_id(path: str) -> str | None:
    m = _PATH_RE.match(path)
    if not m:
        return None
    user_id = m.group(1)
    if not user_id or len(user_id) > _USER_ID_MAX_LEN:
        return None
    return user_id


class MemoryHandler(BaseHTTPRequestHandler):
    """Request handler for the Memory + Call REST API."""

    def _send_json(self, status: int, body: dict) -> None:
        payload = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        for name, value in _CORS_HEADERS:
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(payload)

    def _send_cors_preflight(self) -> None:
        self.send_response(200)
        for name, value in _CORS_HEADERS:
            self.send_header(name, value)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, fmt: str, *args: object) -> None:
        logger.info(fmt, *args)

    def do_OPTIONS(self) -> None:
        self._send_cors_preflight()

    def do_GET(self) -> None:
        """GET /memory/{user_id}, GET /calls/{user_id}, or GET /escalations."""
        # Route /dashboard/metrics
        if self.path in ("/dashboard/metrics", "/dashboard/metrics/"):
            try:
                metrics = get_dashboard_metrics()
                self._send_json(200, metrics)
            except Exception:
                logger.exception("Error in GET /dashboard/metrics")
                self._send_json(500, {"error": "internal_error"})
            return

        # Route /escalations
        if self.path.startswith("/escalations"):
            path_parts = self.path.split("?")[0].strip("/").split("/")
            user_filter = None
            status_filter = None
            if len(path_parts) >= 2:
                if path_parts[1] == "user" and len(path_parts) >= 3:
                    user_filter = path_parts[2]
                elif path_parts[1] and path_parts[1] != "escalations":
                    user_filter = path_parts[1]

            if "?" in self.path:
                query_str = self.path.split("?", 1)[1]
                for param in query_str.split("&"):
                    if param.startswith("status="):
                        status_filter = param.split("=", 1)[1]

            try:
                escalations = escalation_service.get_escalations(
                    user_id=user_filter, status=status_filter
                )
                self._send_json(200, {"success": True, "escalations": escalations})
            except Exception:
                logger.exception("Error in GET /escalations")
                self._send_json(500, {"error": "internal_error"})
            return

        # Route /calls/{user_id}
        calls_user_id = parse_calls_user_id(self.path)
        if calls_user_id is not None:
            status, body = handle_get_calls(calls_user_id)
            self._send_json(status, body)
            return

        user_id = _parse_user_id(self.path)
        if user_id is None:
            self._send_json(400, {"error": "invalid_user_id"})
            return

        try:
            result = get_learner_memory(user_id)
        except Exception:
            logger.exception("Unexpected error in GET /memory/%s", user_id)
            self._send_json(500, {"error": "internal_error"})
            return

        if not isinstance(result, dict):
            self._send_json(500, {"error": "internal_error"})
            return

        # Augment with Day 6 scheduling fields
        try:
            learner_row = get_learner(user_id)
            if learner_row:
                result["preferred_time"] = learner_row.get("preferred_time")
                result["sip_uri"] = learner_row.get("sip_uri")
                result["call_opt_out"] = learner_row.get("call_opt_out", 0)
        except Exception:
            pass  # non-fatal

        # Augment with exercise_attempts for progress stats (task 14.4)
        try:
            topic_stats = get_topic_stats(user_id)
            attempts = []
            for row in topic_stats:
                topic = row["topic"]
                total_in_topic = row["attempts"]
                correct_in_topic = row["correct"]
                incorrect_in_topic = total_in_topic - correct_in_topic
                for _ in range(correct_in_topic):
                    attempts.append({"topic": topic, "result": "correct"})
                for _ in range(incorrect_in_topic):
                    attempts.append({"topic": topic, "result": "incorrect"})
            result["exercise_attempts"] = attempts
        except Exception:
            pass  # non-fatal

        # Augment with recent escalations summary
        try:
            user_escalations = escalation_service.get_escalations(user_id=user_id)
            result["escalations"] = user_escalations
        except Exception:
            pass

        self._send_json(200, result)

    def do_DELETE(self) -> None:
        """DELETE /memory/{user_id} — delete all learner data."""
        user_id = _parse_user_id(self.path)
        if user_id is None:
            self._send_json(400, {"error": "invalid_user_id"})
            return

        try:
            result = forget_learner_memory(user_id)
        except Exception:
            logger.exception("Unexpected error in DELETE /memory/%s", user_id)
            self._send_json(500, {"error": "internal_error"})
            return

        if not isinstance(result, dict):
            self._send_json(500, {"error": "internal_error"})
            return

        status = 200 if result.get("success") else 500
        self._send_json(status, result)

    def do_POST(self) -> None:
        """POST /schedule, POST /call/trigger, or POST /escalations."""
        if self.path.startswith("/escalations"):
            content_length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_length) if content_length > 0 else b""
            try:
                body = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
            except (ValueError, UnicodeDecodeError):
                self._send_json(400, {"error": "invalid_json"})
                return

            ref_id = body.get("reference_id")
            if not ref_id and self.path.count("/") >= 2:
                parts = self.path.strip("/").split("/")
                if len(parts) >= 2 and parts[1] != "escalations":
                    ref_id = parts[1]

            status = body.get("status")
            if ref_id and status:
                res = escalation_service.update_status(ref_id, status)
                http_code = 200 if res.get("success") else 400
                self._send_json(http_code, res)
                return

            user_id = body.get("user_id")
            reason = body.get("reason", "manual_request")
            summary = body.get("summary", "")
            if not user_id or not summary:
                self._send_json(400, {"error": "user_id and summary required"})
                return

            res = escalation_service.create_escalation(
                user_id=user_id,
                reason=reason,
                summary=summary,
                what_was_checked=body.get("what_was_checked", ""),
                urgency=body.get("urgency", "medium"),
                language=body.get("language", "Hindi-English"),
                follow_up_method=body.get("follow_up_method", "teacher_callback"),
                name=body.get("name"),
            )
            http_code = 200 if res.get("success") else 500
            self._send_json(http_code, res)
            return

        if self.path in ("/call/trigger", "/call/trigger/"):
            content_length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_length) if content_length > 0 else b""
            try:
                body = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
            except (ValueError, UnicodeDecodeError):
                self._send_json(400, {"error": "invalid_json"})
                return

            user_id = body.get("user_id", "").strip()
            sip_uri = body.get("sip_uri", "").strip()

            if not user_id or not sip_uri:
                self._send_json(400, {"error": "user_id and sip_uri required"})
                return

            try:
                import asyncio
                import json as _json
                from datetime import datetime as _dt

                from livekit import api as _lkapi
                from livekit.protocol.sip import CreateSIPParticipantRequest

                trunk_id = os.getenv("LIVEKIT_SIP_TRUNK_ID", "")
                if not trunk_id:
                    self._send_json(500, {"error": "no_sip_trunk"})
                    return

                sip_call_to = sip_uri.removeprefix("sip:").removeprefix("sips:")
                if "@" in sip_call_to:
                    sip_call_to = sip_call_to.split("@")[0]

                room_name = "outbound-{}-{}".format(
                    user_id, _dt.now().strftime("%Y%m%d-%H%M%S")
                )

                async def _trigger():
                    lk = _lkapi.LiveKitAPI(
                        url=os.getenv("LIVEKIT_URL", ""),
                        api_key=os.getenv("LIVEKIT_API_KEY", ""),
                        api_secret=os.getenv("LIVEKIT_API_SECRET", ""),
                    )
                    try:
                        await lk.agent_dispatch.create_dispatch(
                            _lkapi.CreateAgentDispatchRequest(
                                agent_name="my-agent",
                                room=room_name,
                                metadata=_json.dumps(
                                    {"outbound": True, "user_id": user_id}
                                ),
                            )
                        )
                        await lk.sip.create_sip_participant(
                            CreateSIPParticipantRequest(
                                sip_trunk_id=trunk_id,
                                sip_call_to=sip_call_to,
                                room_name=room_name,
                                participant_identity=f"sip-{user_id}",
                                participant_name="Vidya AI",
                                play_dialtone=True,
                                wait_until_answered=False,
                            )
                        )
                        return {"success": True, "room_name": room_name}
                    finally:
                        await lk.aclose()

                result = asyncio.run(_trigger())
                self._send_json(200, result)
            except Exception:
                logger.exception("POST /call/trigger failed")
                self._send_json(500, {"error": "sip_dispatch_failed"})
            return

        if self.path != "/schedule":
            self._send_json(404, {"error": "not_found"})
            return
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else b""
        status, response = handle_post_schedule(body)
        self._send_json(status, response)

    def do_PATCH(self) -> None:
        """PATCH /escalations/{reference_id} — update escalation status."""
        # Extract reference_id from URL path: /escalations/{reference_id}
        path = self.path.split("?")[0].strip("/")
        parts = path.split("/")
        # Expect: ["escalations", "<reference_id>"]
        if len(parts) != 2 or parts[0] != "escalations":
            self._send_json(404, {"error": "not_found"})
            return

        ref_id = parts[1]
        if not ref_id:
            self._send_json(400, {"error": "missing_reference_id"})
            return

        content_length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(content_length) if content_length > 0 else b""
        try:
            body = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
        except (ValueError, UnicodeDecodeError):
            self._send_json(400, {"error": "invalid_json"})
            return

        new_status = body.get("status")
        if not new_status:
            self._send_json(400, {"error": "status_required"})
            return

        # Check record exists first
        existing = escalation_service.get_escalation(ref_id)
        if existing is None:
            self._send_json(404, {"error": "not_found"})
            return

        res = escalation_service.update_status(ref_id, new_status)
        if res.get("success"):
            self._send_json(200, res)
        elif "invalid" in res.get("error", "").lower():
            self._send_json(400, {"error": "invalid_status"})
        else:
            self._send_json(500, {"error": res.get("error", "update_failed")})


def main() -> None:
    """Initialise the database and start the HTTP server."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    init_db()
    port = int(os.environ.get("MEMORY_API_PORT", 8888))
    server = HTTPServer(("", port), MemoryHandler)
    logger.info("Memory API listening on http://localhost:%d", port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down Memory API server.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
