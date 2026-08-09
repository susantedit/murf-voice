"""
Memory REST API server.

Exposes a minimal HTTP server on port 8888 (or MEMORY_API_PORT) with three
endpoints for reading and deleting learner memory.  Uses only the Python
standard library — no new dependencies.

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
from services.memory_service import forget_learner_memory, get_learner_memory

logger = logging.getLogger(__name__)

# user_id validation limits
_USER_ID_MAX_LEN = 200
# Match /memory/<user_id>  (user_id must be non-empty)
_PATH_RE = re.compile(r"^/memory/(.+)$")

# CORS headers added to every response
_CORS_HEADERS: list[tuple[str, str]] = [
    ("Access-Control-Allow-Origin", "*"),
    ("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS"),
    ("Access-Control-Allow-Headers", "Content-Type"),
]


def _parse_user_id(path: str) -> str | None:
    """Extract and validate the user_id from the URL path.

    Returns the user_id string if valid, or None if the path does not match
    or the user_id fails validation.
    """
    m = _PATH_RE.match(path)
    if not m:
        return None
    user_id = m.group(1)
    if not user_id or len(user_id) > _USER_ID_MAX_LEN:
        return None
    return user_id


class MemoryHandler(BaseHTTPRequestHandler):
    """Request handler for the Memory REST API."""

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # Route handlers
    # ------------------------------------------------------------------

    def do_OPTIONS(self) -> None:
        """Handle CORS preflight requests."""
        user_id = _parse_user_id(self.path)
        if user_id is None:
            self._send_json(400, {"error": "invalid_user_id"})
            return
        self._send_cors_preflight()

    def do_GET(self) -> None:
        """GET /memory/{user_id} — return learner memory JSON."""
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

        # get_learner_memory never raises; a non-dict result would be a bug
        if not isinstance(result, dict):
            self._send_json(500, {"error": "internal_error"})
            return

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

        # forget_learner_memory returns {"success": True} or {"success": False}
        status = 200 if result.get("success") else 500
        self._send_json(status, result)


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
