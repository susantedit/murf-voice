'use client';

import { useEffect, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';

export interface ToolEvent {
  type:
    | 'tool_start'
    | 'exercise_ready'
    | 'answer_scored'
    | 'tool_error'
    | 'escalation_detected'
    | 'escalation_consent_requested'
    | 'escalation_created'
    | 'escalation_denied'
    | 'escalation_failed'
    | 'agent_handoff'
    | 'agent_active';
  tool?: string;
  label?: string;
  topic?: string;
  difficulty?: string;
  level?: string;
  question?: string;
  exercise_id?: string;
  result?: string;
  score_label?: string;
  data_source?: string;
  reference_id?: string;
  reason?: string;
  summary?: string;
  urgency?: string;
  language?: string;
  status?: string;
  error?: string;
  from?: string;
  to?: string;
  agent_name?: string;
  role?: string;
  voice?: string;
  user_question?: string;
  receivedAt: Date;
}

/**
 * Subscribe to the `vidya-tools` LiveKit data channel topic.
 * Returns a live list of tool events published by the backend agent.
 *
 * Events are appended oldest-first. Components can reverse if needed.
 * Only call this inside a LiveKit <RoomContext> provider (i.e., within an active session).
 */
export function useToolEvents(): ToolEvent[] {
  const room = useRoomContext();
  const [events, setEvents] = useState<ToolEvent[]>([]);

  useEffect(() => {
    if (!room) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (
      payload: Uint8Array,
      _participant: unknown,
      _kind: unknown,
      topic?: string
    ) => {
      if (topic !== 'vidya-tools') return;
      try {
        const raw = JSON.parse(new TextDecoder().decode(payload)) as Omit<ToolEvent, 'receivedAt'>;
        const event: ToolEvent = { ...raw, receivedAt: new Date() };
        setEvents((prev) => [...prev, event]);
      } catch {
        // Silently ignore malformed payloads — never crash on bad data
      }
    };

    room.on('dataReceived', handler);
    return () => {
      room.off('dataReceived', handler);
    };
  }, [room]);

  return events;
}
