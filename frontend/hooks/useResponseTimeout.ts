'use client';

import { useEffect, useRef, useState } from 'react';
import type { AgentState } from '@livekit/components-react';

export type StuckState = 'none' | 'thinking_timeout' | 'speaking_timeout';

interface UseResponseTimeoutOptions {
  /** How many ms in "thinking" before firing (default 30 000) */
  thinkingTimeoutMs?: number;
  /** How many ms in "speaking" before firing (default 60 000) */
  speakingTimeoutMs?: number;
}

/**
 * Watches the agent state and fires a `stuckState` flag if the agent gets
 * stuck in "thinking" or "speaking" longer than expected.
 *
 * - THINKING timeout (default 30s): LLM / tool call is taking too long.
 * - SPEAKING timeout (default 60s): TTS hung or audio stream stalled.
 *
 * Resets automatically when the agent leaves the stuck state.
 */
export function useResponseTimeout(
  agentState: AgentState | undefined,
  { thinkingTimeoutMs = 30_000, speakingTimeoutMs = 60_000 }: UseResponseTimeoutOptions = {}
): { stuckState: StuckState; clearStuck: () => void } {
  const [stuckState, setStuckState] = useState<StuckState>('none');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStateRef = useRef<AgentState | undefined>(undefined);

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function clearStuck() {
    setStuckState('none');
    clearTimer();
  }

  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = agentState;

    // Leaving a stuck state → clear immediately
    if (prev === 'thinking' && agentState !== 'thinking') {
      if (stuckState === 'thinking_timeout') setStuckState('none');
      clearTimer();
      return;
    }
    if (prev === 'speaking' && agentState !== 'speaking') {
      if (stuckState === 'speaking_timeout') setStuckState('none');
      clearTimer();
      return;
    }

    // Entering thinking
    if (agentState === 'thinking' && prev !== 'thinking') {
      clearTimer();
      timerRef.current = setTimeout(() => {
        setStuckState('thinking_timeout');
      }, thinkingTimeoutMs);
      return;
    }

    // Entering speaking
    if (agentState === 'speaking' && prev !== 'speaking') {
      clearTimer();
      timerRef.current = setTimeout(() => {
        setStuckState('speaking_timeout');
      }, speakingTimeoutMs);
      return;
    }
  }, [agentState, thinkingTimeoutMs, speakingTimeoutMs, stuckState]);

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), []);

  return { stuckState, clearStuck };
}
