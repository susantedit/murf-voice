# Design — Vidya Day 6: Outbound SIP Learning Calls

## Overview

Day 6 adds a call scheduler, LiveKit SIP outbound dispatch, and opt-out tooling to the existing backend. The frontend gains a Call Schedule settings panel, call history view, and an enhanced outbound call dashboard. All Day 1–5 code is unchanged.

**Already done (do not reimplement):** `agent.py` tools, `exercise_service.py`, `memory_service.py`, Day 5 frontend cards/hook.

**New in Day 6:**
- `backend/src/db/database.py` — schema extensions (`call_history`, new `users` columns)
- `backend/src/db/call_repository.py` — call history CRUD
- `backend/src/services/call_service.py` — SIP dispatch wrapper
- `backend/src/scheduler/call_scheduler.py` — asyncio scheduling loop
- `backend/src/api/call_server.py` — REST endpoints for call history + schedule save
- `backend/src/agent.py` — outbound greeting branch + `set_call_opt_out` tool
- `frontend/` — Call Schedule panel, Practice History panel, UI redesign

---

## Architecture

```
[SQLite DB]
    │  preferred_time, sip_uri per user
    ▼
[call_scheduler.py]  ── asyncio loop (60 s tick)
    │  fires when time matches ±5 min
    ▼
[call_service.py]  ── LiveKit SIP SDK
    │  livekit.api.SIPClient.create_sip_participant()
    ▼
[LiveKit SIP Bridge]  ── outbound SIP trunk (sip.linphone.org)
    │
    ▼
[Linphone SIP Client]  ── student device (desktop/mobile)
    │  RTP audio
    ▼
[Vidya Agent (agent.py)]  ── joins as RTC participant in same room
    │  on_enter() detects _is_outbound=True → outbound greeting
    ▼
Murf Falcon TTS → student hears Vidya
Deepgram STT → Vidya hears student
```

---

## Data Models

### New DB table: `call_history`

```sql
CREATE TABLE IF NOT EXISTS call_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT    NOT NULL,
    started_at      TEXT    NOT NULL,
    ended_at        TEXT,
    duration_seconds INTEGER,
    topic           TEXT,
    performance     TEXT,
    status          TEXT    NOT NULL,  -- answered | missed | failed
    retry_of        INTEGER,           -- FK to call_history.id if this is a retry
    retry_attempted INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_callhist_user ON call_history(user_id);
```

### `users` table extensions (added via ALTER TABLE)

```sql
ALTER TABLE users ADD COLUMN preferred_time TEXT;
ALTER TABLE users ADD COLUMN call_opt_out   INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN sip_uri        TEXT;
```

### Python types

```python
# call_repository.py
@dataclass
class CallRecord:
    id: int | None
    user_id: str
    started_at: str          # UTC ISO 8601
    ended_at: str | None
    duration_seconds: int | None
    topic: str | None
    performance: str | None
    status: str              # "answered" | "missed" | "failed"
    retry_of: int | None
    retry_attempted: int
```

### Frontend TypeScript

```typescript
// types/call.ts
export interface CallRecord {
  id: number;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  topic?: string;
  performance?: string;
  status: "answered" | "missed" | "failed";
}

export interface ScheduleConfig {
  user_id: string;
  preferred_time: string;   // "HH:MM"
  sip_uri: string;          // "sip:username@domain"
}

export interface CallStatusEvent {
  type: "call_status";
  status: "READY" | "CONNECTING" | "CALLING" | "LISTENING" | "THINKING" | "SPEAKING" | "CALL ENDED";
}
```

---

## Backend: New Files

### `backend/src/db/call_repository.py`

```python
def insert_call(user_id, started_at, topic=None) -> int:
    """Insert a new call_history row; return its id."""

def update_call(call_id, *, ended_at=None, duration_seconds=None,
                topic=None, performance=None, status=None,
                retry_attempted=None) -> None:
    """Update fields on an existing call_history row."""

def get_calls(user_id, limit=10) -> list[dict]:
    """Return the last `limit` calls for a user, newest first."""

def call_exists_today(user_id) -> bool:
    """Return True if a call_history row with started_at on today's date exists."""

def get_missed_unretried(user_id) -> dict | None:
    """Return the most recent missed call with retry_attempted=0, or None."""
```

---

## Components and Interfaces

### `backend/src/services/call_service.py`

```python
async def dispatch_outbound_sip_call(user_id: str, sip_uri: str) -> dict:
    """
    Create a LiveKit room + dispatch a SIP participant to sip_uri.
    Returns {"success": True, "room_name": str, "call_id": int}
    or {"success": False, "error": str}.
    """

async def set_call_opt_out(user_id: str, opt_out: bool = True) -> dict:
    """Set call_opt_out flag on the users row. Returns {"success": bool}."""
```

**SIP dispatch implementation:**

```python
from livekit import api as lkapi

async def dispatch_outbound_sip_call(user_id, sip_uri):
    trunk_id = os.getenv("LIVEKIT_SIP_TRUNK_ID")
    if not trunk_id:
        logger.warning("LIVEKIT_SIP_TRUNK_ID not set — SIP calling disabled")
        return {"success": False, "error": "no_sip_trunk"}

    room_name = f"outbound-{user_id}-{datetime.utcnow().strftime('%Y%m%d-%H%M')}"
    lk = lkapi.LiveKitAPI()
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
        await lk.sip.create_sip_participant(
            lkapi.CreateSIPParticipantRequest(
                sip_trunk_id=trunk_id,
                sip_call_to=sip_uri,
                room_name=room_name,
                participant_identity=f"sip-{user_id}",
            )
        )
        call_id = call_repository.insert_call(
            user_id, datetime.utcnow().isoformat(), topic=None
        )
        return {"success": True, "room_name": room_name, "call_id": call_id}
    except Exception as exc:
        logger.exception("SIP dispatch failed for user_id=%r", user_id)
        return {"success": False, "error": "sip_dispatch_failed"}
    finally:
        await lk.aclose()
```

### `backend/src/scheduler/call_scheduler.py`

```python
async def run_scheduler():
    """
    Asyncio loop — wakes every 60 s.
    Queries users with preferred_time set and opt_out=0.
    For each user whose preferred_time is within ±5 min of now
    and no call exists today, dispatches an outbound call.
    Also checks for unretried missed calls older than 10 min.
    """
```

**Key logic:**

```python
import asyncio
from datetime import datetime, timedelta

TICK_INTERVAL = 60          # seconds between checks
DRIFT_WINDOW  = timedelta(minutes=5)
RETRY_DELAY   = timedelta(minutes=10)

async def run_scheduler():
    while True:
        await asyncio.sleep(TICK_INTERVAL)
        try:
            _process_scheduled_calls()
        except Exception:
            logger.exception("Scheduler tick failed — continuing")

def _process_scheduled_calls():
    now = datetime.now()
    users = _get_schedulable_users()     # preferred_time NOT NULL, opt_out=0
    for u in users:
        preferred = _parse_hhmm(u["preferred_time"])
        delta = abs((now.replace(hour=preferred.hour, minute=preferred.minute,
                                 second=0, microsecond=0) - now))
        if delta <= DRIFT_WINDOW and not call_exists_today(u["user_id"]):
            asyncio.create_task(
                dispatch_outbound_sip_call(u["user_id"], u["sip_uri"])
            )
```

### `backend/src/agent.py` — changes

**Outbound mode detection:** When `my_agent()` is triggered by an `AgentDispatch` with metadata `{"outbound": True}`, set `_is_outbound=True` on the `Assistant` instance.

```python
# In my_agent():
metadata = json.loads(ctx.job.metadata or "{}")
is_outbound = metadata.get("outbound", False)
outbound_user_id = metadata.get("user_id", "")

# Pass to Assistant:
agent=Assistant(
    user_id=outbound_user_id or user_id,
    memory_task=memory_task,
    room=ctx.room,
    is_outbound=is_outbound,
)
```

**`on_enter` outbound branch:**

```python
async def on_enter(self) -> None:
    memory = ...  # same prefetch as before
    if self._is_outbound:
        await self._outbound_greeting(memory)
    else:
        await self._inbound_greeting(memory)

async def _outbound_greeting(self, memory: dict) -> None:
    name = memory.get("name") if memory.get("found") else None
    topics = memory.get("topics") or []
    last_topic = topics[-1] if topics else None
    lang = memory.get("language_preference", "hindi")

    if name:
        intro = (
            f"नमस्ते {name}, मैं Vidya AI Learning Assistant हूँ। "
            "मैं आपके daily learning practice session के लिए call कर रही हूँ। "
            "अगर आप future calls बंद करना चाहते हैं तो मुझे बता सकते हैं।"
        )
        if last_topic:
            intro += (
                f" पिछली बार हम {last_topic} practice कर रहे थे। "
                "आज उसी topic को continue करें?"
            )
    else:
        intro = (
            "नमस्ते! मैं Vidya AI Learning Assistant हूँ। "
            "मैं आपके daily learning practice के लिए call कर रही हूँ। "
            "अगर आप future calls बंद करना चाहते हैं तो मुझे बता सकते हैं।"
        )
    await self.session.say(intro)
```

**New `@function_tool`: `set_call_opt_out`**

```python
@function_tool
async def set_call_opt_out(self, placeholder: str = "") -> str:
    """
    Opt the current student out of future scheduled calls.
    Call this ONLY when the student explicitly says they want
    no more calls (e.g. "stop calls", "बंद करो", "unsubscribe").
    Returns {"success": true} on success.
    """
    result = await call_service.set_call_opt_out(self._user_id)
    return json.dumps(result)
```

**Updated SYSTEM_PROMPT additions (Day 6 section):**

```
OUTBOUND CALL RULES (Day 6):
- You may be in an OUTBOUND session — the student did not initiate this call.
- Your on_enter greeting already covered identity and opt-out. Do NOT repeat the full opt-out script mid-conversation.
- If the student says "stop calls", "बंद करो", "no more calls", "unsubscribe" → call set_call_opt_out, then confirm: "ठीक है, मैं आगे से call नहीं करूँगी।"
- After confirming opt-out, end the session gracefully.
```

### `backend/src/api/call_server.py` — REST API (FastAPI or aiohttp)

```
GET  /api/calls/{user_id}              → list[CallRecord] (last 10)
POST /api/memory/schedule              → save preferred_time + sip_uri
GET  /api/memory/{user_id}             → existing memory + new fields
```

The existing `memory_server.py` already handles `GET /api/memory/{user_id}` — extend its response to include `preferred_time`, `sip_uri`, `call_opt_out`.

### Frontend: New Components

**`frontend/components/app/call-schedule-panel.tsx`**
- Time picker (HH:MM, 24h)
- SIP URI input (`sip:username@domain`)
- Save button (disabled when sip_uri empty)
- Confirmation message on save
- Shows current schedule from `GET /api/memory/{user_id}`

**`frontend/components/app/practice-history-panel.tsx`**
- Fetches `GET /api/calls/{user_id}`
- Lists up to 10 records: date, duration, topic, status badge
- Learning progress stats: total attempts, accuracy %, top topic

**`frontend/components/app/outbound-call-dashboard.tsx`**
- Animated AI orb (reuse existing orb component)
- Status label: READY / CONNECTING / CALLING / LISTENING / THINKING / SPEAKING / CALL ENDED
- SVG status icons (no emojis)
- Subscribes to `call_status` events via `useToolEvents` hook (same data channel, different event type)

**`frontend/components/app/student-dashboard.tsx`**
- Shows: name, level, current topic, memory status (Active / New), practice count
- Read from `GET /api/memory/{user_id}`

**`frontend/app/page.tsx` — Hero redesign**

```tsx
// Hero content
<h1>VIDYA</h1>
<p>Your Personal AI Learning Companion</p>
<p>Learn • Practice • Improve</p>
<p>Voice-based learning in Hindi and English</p>
<Button>Start Learning</Button>
```

Navbar links: Home, Features, How it Works, Privacy, About (scroll anchors, no new routes needed).

Feature cards (SVG icons, no emojis):
- Personalized Learning — BrainIcon
- AI Memory — DatabaseIcon
- Hindi + English Support — LanguagesIcon
- Voice Conversations — MicrophoneIcon
- Privacy First — ShieldIcon

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| `LIVEKIT_SIP_TRUNK_ID` not set | `dispatch_outbound_sip_call` returns `{"success": False, "error": "no_sip_trunk"}`; backend starts normally for inbound sessions |
| SIP URI null/empty for a user | Scheduler skips that user; logs a warning |
| SIP call not answered (30 s) | `call_history` row updated to `status="missed"`; retry scheduled after 10 min |
| SIP connection error mid-call | `call_history` updated to `status="failed"`; agent logs error; session ends cleanly |
| LiveKit API error during dispatch | Exception caught; returns `{"success": False, "error": "sip_dispatch_failed"}`; scheduler loop continues |
| `LINPHONE_UNAVAILABLE_SIMULATION=1` | `dispatch_outbound_sip_call` returns immediately with simulated failure; no SIP call made |
| Scheduler loop raises unexpected exception | Error logged; loop continues to next tick (does not crash) |
| `call_status` event JSON malformed | Silently ignored (same guard as `vidya-tools` events) |
| Frontend `GET /api/calls/{user_id}` fails | Shows empty history panel with "No calls yet." fallback |
| `set_call_opt_out` called with no learner row | Creates learner row first, then sets `call_opt_out=1` |

---

## Testing Strategy

### Automated

**`backend/tests/test_call_scheduler.py`**

| Test | Scenario |
|---|---|
| `test_scheduler_fires_within_window` | User preferred_time = now ±4 min → dispatch called |
| `test_scheduler_skips_outside_window` | User preferred_time = now +10 min → dispatch NOT called |
| `test_scheduler_skips_existing_call_today` | call_exists_today returns True → dispatch NOT called |
| `test_scheduler_skips_opted_out` | call_opt_out=1 → dispatch NOT called |
| `test_scheduler_retry_logic` | missed call 15 min ago, retry_attempted=0 → retry dispatched |
| `test_scheduler_no_double_retry` | retry_attempted=1 → no second retry |

**`backend/tests/test_call_service.py`**

| Test | Scenario |
|---|---|
| `test_dispatch_no_trunk` | LIVEKIT_SIP_TRUNK_ID not set → returns `no_sip_trunk` |
| `test_dispatch_simulated_unavailable` | LINPHONE_UNAVAILABLE_SIMULATION=1 → simulated failure |
| `test_set_call_opt_out` | Sets flag correctly; subsequent scheduler check skips user |

**`backend/tests/test_call_repository.py`**

| Test | Scenario |
|---|---|
| `test_insert_and_get_call` | Insert a call, retrieve it |
| `test_call_exists_today` | Insert with today's date → True; yesterday → False |
| `test_update_call_status` | Insert → update status to missed → verify |
| `test_get_missed_unretried` | Insert missed call, retry_attempted=0 → returned |

### Manual (demo checklist)

1. Install Linphone desktop; register with `sip.linphone.org` free account.
2. Set `LIVEKIT_SIP_TRUNK_ID` in `.env.local`.
3. Open the frontend, set your SIP URI and a time 2 minutes from now.
4. Wait — Linphone rings; answer.
5. Verify: Vidya's first spoken sentence identifies herself, the reason, and opt-out.
6. Verify: if your name and topic were in memory, Vidya mentions them.
7. Ask a practice question; confirm Exercise Card appears in the browser tab.
8. Say "stop calls"; confirm Vidya confirms and the opt-out flag is set.
9. Check Practice History panel shows the call record.

---

## Correctness Properties

### Property 1: Scheduler fires exactly once per student per day
For any given `user_id`, there is at most one call dispatch per calendar day. The predicate `call_exists_today(user_id)` is checked before every dispatch and acts as the guard.
**Validates: Requirements 2.5**

### Property 2: Drift tolerance
A call scheduled for time T fires if and only if `|now - T| ≤ 5 minutes` AND no call exists today. Calls outside the window are never dispatched late — they are simply skipped until the next day.
**Validates: Requirements 2.3, 2.4**

### Property 3: Opt-out is terminal
Once `call_opt_out = 1` is set, the scheduler never dispatches a call for that user until the flag is explicitly cleared. The `set_call_opt_out` tool sets it; the scheduler checks it. No call can slip through between the two.
**Validates: Requirements 2.8, 4.6, 4.7**

### Property 4: Outbound greeting always contains identity + opt-out
Every outbound `on_enter` path (with name, without name, with topic, without topic) must include the caller identity ("Vidya AI Learning Assistant") and the opt-out instruction before any other content. This is enforced by constructing `intro` with these sentences first, unconditionally.
**Validates: Requirements 4.1, 4.2**

### Property 5: Hindi always in Devanagari
All Hindi strings in the outbound greeting and `SYSTEM_PROMPT` additions are written in Devanagari. No romanized Hindi appears in any code path. This is a code-level invariant — all literal Hindi strings pass visual inspection for Devanagari characters only.
**Validates: Requirements 4.8**

### Property 6: SIP failure does not crash the scheduler
Any exception raised inside `dispatch_outbound_sip_call` is caught and returns `{"success": False, ...}`. The scheduler wraps each dispatch in its own `asyncio.create_task` with an exception handler so a failed call does not propagate to the main loop.
**Validates: Requirements 6.3, 6.4**

### Property 7: Maximum one retry per missed call
The `retry_attempted` column on the original `call_history` row is set to `1` when a retry is dispatched. The scheduler checks `retry_attempted = 0` before scheduling a retry, making retry dispatch idempotent.
**Validates: Requirements 7.4, 7.5**

---

## File Change Summary

| File | Type | Change |
|---|---|---|
| `backend/src/db/database.py` | Update | Add `call_history` table; ALTER `users` for new columns |
| `backend/src/db/call_repository.py` | New | Call history CRUD |
| `backend/src/services/call_service.py` | New | SIP dispatch + opt-out wrapper |
| `backend/src/scheduler/__init__.py` | New | Package init |
| `backend/src/scheduler/call_scheduler.py` | New | Asyncio scheduling loop |
| `backend/src/api/call_server.py` | New | REST: GET /api/calls, POST /api/memory/schedule |
| `backend/src/api/memory_server.py` | Update | Include preferred_time, sip_uri, call_opt_out in GET /api/memory |
| `backend/src/agent.py` | Update | Outbound mode detection, outbound greeting, set_call_opt_out tool, SYSTEM_PROMPT Day 6 section |
| `backend/.env.example` | Update | Document LIVEKIT_SIP_TRUNK_ID, SCHEDULER_ENABLED, LINPHONE_UNAVAILABLE_SIMULATION |
| `backend/pyproject.toml` | Update | Add `livekit-api` if not already present |
| `backend/tests/test_call_scheduler.py` | New | Scheduler timing + opt-out tests |
| `backend/tests/test_call_service.py` | New | SIP dispatch + simulation tests |
| `backend/tests/test_call_repository.py` | New | Call history CRUD tests |
| `frontend/types/call.ts` | New | TypeScript interfaces for call records and events |
| `frontend/hooks/useCallStatus.ts` | New | Subscribe to call_status events from vidya-tools channel |
| `frontend/components/app/call-schedule-panel.tsx` | New | Schedule setup UI |
| `frontend/components/app/practice-history-panel.tsx` | New | Call history + progress UI |
| `frontend/components/app/outbound-call-dashboard.tsx` | New | Animated status dashboard |
| `frontend/components/app/student-dashboard.tsx` | New | Student profile card |
| `frontend/app/page.tsx` | Update | Hero redesign + navbar + feature cards |
| `README.md` | Update | Day 6 section: SIP setup, Linphone, architecture, limitations |
| `day6/linkedin.md` | New | LinkedIn caption |
