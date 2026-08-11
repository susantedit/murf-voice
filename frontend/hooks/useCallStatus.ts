'use client';

import { useEffect, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import type { CallStatusEvent } from '@/types/call';

/**
 * Subscribe to `call_status` events on the `vidya-tools` LiveKit data channel.
 *
 * Returns the most recent call status published by the backend agent, or null
 * when no status has been received yet or the session has ended.
 *
 * Must be called inside a LiveKit <RoomContext> provider.
 */
export function useCallStatus(): { status: CallStatusEvent['status'] | null } {
  const room = useRoomContext();
  const [status, setStatus] = useState<CallStatusEvent['status'] | null>(null);

  // Listen for call_status events on the vidya-tools data channel
  useEffect(() => {
    if (!room) return;

    const handler = (
      payload: Uint8Array,
      _participant: unknown,
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic !== 'vidya-tools') return;
      try {
        const raw = JSON.parse(new TextDecoder().decode(payload)) as Record<string, unknown>;
        if (raw.type !== 'call_status') return;
        const event = raw as unknown as CallStatusEvent;
        setStatus(event.status);
      } catch {
        // Silently ignore malformed payloads — never crash on bad data
      }
    };

    room.on('dataReceived', handler);
    return () => {
      room.off('dataReceived', handler);
    };
  }, [room]);

  // Reset to null when the session ends (room disconnects)
  useEffect(() => {
    if (!room) return;

    const handleConnectionStateChange = (state: ConnectionState) => {
      if (state === ConnectionState.Disconnected) {
        setStatus(null);
      }
    };

    room.on('connectionStateChanged', handleConnectionStateChange);
    return () => {
      room.off('connectionStateChanged', handleConnectionStateChange);
    };
  }, [room]);

  return { status };
}
