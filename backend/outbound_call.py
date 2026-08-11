r"""
Standalone outbound SIP call script.

Order:
  1. Dispatch Vidya agent to room (agent waits up to 60s for SIP participant)
  2. Ring Linphone — non-blocking, returns immediately
  3. Agent detects SIP participant joining and greets you

Usage:
    cd f:/murf-voice/backend
    uv run python outbound_call.py
"""

import asyncio
import json
import os
import sys
from datetime import datetime

from dotenv import load_dotenv

load_dotenv(".env.local", override=False)

LIVEKIT_URL    = os.getenv("LIVEKIT_URL", "")
LIVEKIT_KEY    = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_SECRET = os.getenv("LIVEKIT_API_SECRET", "")
SIP_TRUNK_ID   = os.getenv("LIVEKIT_SIP_TRUNK_ID", "")

SIP_CALL_TO = "susant123333"   # username only — trunk knows sip.linphone.org
ROOM_NAME   = "outbound-{}".format(datetime.now().strftime("%Y%m%d-%H%M%S"))
USER_ID     = "susant123333"


async def main():
    print("=" * 55)
    print("Vidya Outbound Call")
    print("=" * 55)
    print("  SIP_TRUNK_ID =", SIP_TRUNK_ID)
    print("  SIP_CALL_TO  =", SIP_CALL_TO)
    print("  ROOM         =", ROOM_NAME)
    print()

    if not SIP_TRUNK_ID:
        print("ERROR: LIVEKIT_SIP_TRUNK_ID not set in .env.local")
        sys.exit(1)

    sys.path.insert(0, "src")
    from livekit import api
    from livekit.protocol.sip import CreateSIPParticipantRequest

    lkapi = api.LiveKitAPI(
        url=LIVEKIT_URL,
        api_key=LIVEKIT_KEY,
        api_secret=LIVEKIT_SECRET,
    )

    try:
        # Step 1: Dispatch agent — it will wait up to 60s for SIP participant
        print("Step 1: Dispatching Vidya agent to room...")
        dispatch = await lkapi.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                agent_name="my-agent",
                room=ROOM_NAME,
                metadata=json.dumps({"outbound": True, "user_id": USER_ID}),
            )
        )
        print("  Agent dispatched id={}".format(dispatch.id))

        # Step 2: Ring Linphone — non-blocking, returns immediately
        print()
        print("Step 2: Ringing your Linphone... pick up when it rings!")
        sip_req = CreateSIPParticipantRequest(
            sip_trunk_id=SIP_TRUNK_ID,
            sip_call_to=SIP_CALL_TO,
            room_name=ROOM_NAME,
            participant_identity="sip-{}".format(USER_ID),
            participant_name="Vidya AI",
            play_dialtone=True,
            wait_until_answered=False,   # non-blocking
        )
        sip_info = await lkapi.sip.create_sip_participant(sip_req)
        print("  Call initiated: sip_call_id={}".format(sip_info.sip_call_id))
        print()
        print("Your Linphone is ringing. Answer it — Vidya will greet you.")

    except Exception as exc:
        print("\nERROR:", exc)
        import traceback
        traceback.print_exc()
    finally:
        await lkapi.aclose()


if __name__ == "__main__":
    asyncio.run(main())
