'use client';

import { useEffect, useState } from 'react';
import { Track } from 'livekit-client';
import { useSessionContext, useTrackToggle } from '@livekit/components-react';

export type MicStatus =
  | 'requesting'
  | 'ready'
  | 'listening'
  | 'muted'
  | 'error'
  | 'unavailable';

export interface MicStatusResult {
  status: MicStatus;
  errorMessage?: string;
  isMuted: boolean;
  toggleMute: () => void;
}

/**
 * Reports the current microphone state for display in the UI.
 *
 * Status transitions:
 *  requesting  → Browser permission not yet granted
 *  ready       → Track exists, not yet streaming audio
 *  listening   → Active and capturing audio (unmuted)
 *  muted       → User muted the mic
 *  error       → Permission denied or device error
 *  unavailable → No microphone device / not in a session
 */
export function useMicStatus(): MicStatusResult {
  const {
    local: { microphoneTrack },
    isConnected,
  } = useSessionContext();

  const { enabled: micEnabled, toggle } = useTrackToggle({
    source: Track.Source.Microphone,
  });

  const [status, setStatus] = useState<MicStatus>('requesting');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isConnected) {
      setStatus('unavailable');
      return;
    }

    if (!microphoneTrack) {
      setStatus('requesting');
      return;
    }

    const track = microphoneTrack.publication?.track;

    if (!track) {
      setStatus('requesting');
      return;
    }

    if (microphoneTrack.publication?.isMuted || !micEnabled) {
      setStatus('muted');
      return;
    }

    setStatus('listening');
    setErrorMessage(undefined);
  }, [microphoneTrack, isConnected, micEnabled]);

  // Listen for device errors on the window (LiveKit emits these)
  useEffect(() => {
    function handleError(e: ErrorEvent) {
      const msg = e.message?.toLowerCase() ?? '';
      if (
        msg.includes('notallowederror') ||
        msg.includes('permission') ||
        msg.includes('microphone')
      ) {
        setStatus('error');
        setErrorMessage('Microphone access denied. Please enable it in browser settings.');
      }
    }
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return {
    status,
    errorMessage,
    isMuted: status === 'muted',
    toggleMute: toggle,
  };
}
