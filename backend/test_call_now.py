"""
Quick test script -- run this to immediately trigger an outbound SIP call.

Usage:
    cd f:/murf-voice/backend
    uv run python test_call_now.py

Also sets preferred_time=18:08 so the scheduler fires at 6:08 PM daily.
"""

import asyncio
import logging
import os
import sys

from dotenv import load_dotenv

load_dotenv(".env.local", override=False)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)

USER_ID = "susant123333"
SIP_URI = "sip:susant123333@sip.linphone.org"
PREFERRED_TIME = "18:08"  # 6:08 PM local time


def setup_db():
    """Ensure the user row exists with the correct SIP URI and preferred_time."""
    sys.path.insert(0, "src")
    from db.database import get_connection, init_db
    from db.learner_repository import create_learner, get_learner

    init_db()

    if get_learner(USER_ID) is None:
        create_learner(USER_ID)
        print(f"Created learner row for {USER_ID}")
    else:
        print(f"Learner row already exists for {USER_ID}")

    with get_connection() as conn:
        conn.execute(
            "UPDATE users SET sip_uri = ?, preferred_time = ?, call_opt_out = 0 WHERE user_id = ?",
            (SIP_URI, PREFERRED_TIME, USER_ID),
        )
    print(f"Set sip_uri={SIP_URI!r} preferred_time={PREFERRED_TIME!r} call_opt_out=0")


async def trigger_call():
    """Dispatch the outbound SIP call right now."""
    from services.call_service import dispatch_outbound_sip_call

    print(f"\nDispatching call to {SIP_URI} ...")
    print(f"  LIVEKIT_URL       = {os.getenv('LIVEKIT_URL')}")
    print(f"  LIVEKIT_API_KEY   = {os.getenv('LIVEKIT_API_KEY')}")
    print(f"  SIP_TRUNK_ID      = {os.getenv('LIVEKIT_SIP_TRUNK_ID')}")
    print(f"  SIP_SIMULATION    = {os.getenv('LINPHONE_UNAVAILABLE_SIMULATION')}")
    print()

    result = await dispatch_outbound_sip_call(USER_ID, SIP_URI)
    print(f"Result: {result}")

    if result.get("success"):
        print("\n✅ Call dispatched! Linphone should ring now.")
        print("   Answer the call and Vidya will greet you in Hindi.")
    else:
        error = result.get("error")
        print(f"\n❌ Call failed: {error}")
        if error == "no_sip_trunk":
            print("   LIVEKIT_SIP_TRUNK_ID is not set or not found in .env.local")
        elif error == "simulated_unavailable":
            print("   LINPHONE_UNAVAILABLE_SIMULATION=1 is set — set it to 0")
        elif error == "sip_dispatch_failed":
            print("   LiveKit API call failed — check logs above for the exception")


if __name__ == "__main__":
    setup_db()
    asyncio.run(trigger_call())
