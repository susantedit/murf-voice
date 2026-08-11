"""
Call service — SIP outbound dispatch and opt-out management for Day 6.

Provides:
- dispatch_outbound_sip_call: create a LiveKit room + SIP participant
- set_call_opt_out: toggle call_opt_out flag for a learner
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv(".env.local", override=False)

logger = logging.getLogger(__name__)

try:
    from src.db import call_repository
except ImportError:
    from db import call_repository  # type: ignore[no-redef]


def _now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


async def dispatch_outbound_sip_call(user_id: str, sip_uri: str) -> dict:
    """
    Create a LiveKit room and dispatch a SIP participant to sip_uri.

    Returns {"success": True, "room_name": str, "call_id": int}
    or {"success": False, "error": str}.
    """
    # Simulation mode for testing without real SIP infrastructure
    if os.getenv("LINPHONE_UNAVAILABLE_SIMULATION") == "1":
        logger.info("LINPHONE_UNAVAILABLE_SIMULATION active — skipping real SIP call")
        return {"success": False, "error": "simulated_unavailable"}

    trunk_id = os.getenv("LIVEKIT_SIP_TRUNK_ID")
    if not trunk_id:
        logger.warning(
            "LIVEKIT_SIP_TRUNK_ID not set — SIP calling disabled for user_id=%r",
            user_id,
        )
        return {"success": False, "error": "no_sip_trunk"}

    if not sip_uri:
        logger.warning("sip_uri is empty for user_id=%r — skipping call", user_id)
        return {"success": False, "error": "no_sip_uri"}

    room_name = f"outbound-{user_id}-{datetime.utcnow().strftime('%Y%m%d-%H%M')}"

    try:
        from livekit import api as lkapi

        lk = lkapi.LiveKitAPI(
            url=os.getenv("LIVEKIT_URL", ""),
            api_key=os.getenv("LIVEKIT_API_KEY", ""),
            api_secret=os.getenv("LIVEKIT_API_SECRET", ""),
        )
        try:
            # 1. Dispatch the agent worker to the room
            await lk.agent_dispatch.create_dispatch(
                lkapi.CreateAgentDispatchRequest(
                    agent_name="my-agent",
                    room=room_name,
                    metadata=json.dumps({"outbound": True, "user_id": user_id}),
                )
            )
            # 2. Create the SIP participant (Linphone rings)
            # The trunk has address=sip.linphone.org — sip_call_to is just the username
            # Strip "sip:" prefix and "@domain" if present; trunk handles routing
            sip_call_to = sip_uri.removeprefix("sip:").removeprefix("sips:")
            if "@" in sip_call_to:
                sip_call_to = sip_call_to.split("@")[0]  # keep only "username"
            await lk.sip.create_sip_participant(
                lkapi.CreateSIPParticipantRequest(
                    sip_trunk_id=trunk_id,
                    sip_call_to=sip_call_to,
                    room_name=room_name,
                    participant_identity=f"sip-{user_id}",
                    participant_name="Vidya AI",
                    play_dialtone=True,
                    wait_until_answered=False,
                )
            )
        finally:
            await lk.aclose()

        call_id = call_repository.insert_call(user_id, _now_utc(), topic=None)
        logger.info(
            "Outbound SIP call dispatched for user_id=%r room=%r call_id=%d",
            user_id,
            room_name,
            call_id,
        )
        return {"success": True, "room_name": room_name, "call_id": call_id}

    except Exception:
        logger.exception("SIP dispatch failed for user_id=%r", user_id)
        return {"success": False, "error": "sip_dispatch_failed"}


async def set_call_opt_out(user_id: str, opt_out: bool = True) -> dict:
    """
    Set the call_opt_out flag for a learner.

    Returns {"success": True} or {"success": False, "error": str}.
    """
    try:
        call_repository.set_opt_out(user_id, 1 if opt_out else 0)
        logger.info("set_call_opt_out user_id=%r opt_out=%r", user_id, opt_out)
        return {"success": True}
    except Exception:
        logger.exception("set_call_opt_out failed for user_id=%r", user_id)
        return {"success": False, "error": "opt_out_failed"}
