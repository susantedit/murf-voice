'use client';

import { useCallback, useMemo, useState } from 'react';
import { TokenSource } from 'livekit-client';
import { useSession } from '@livekit/components-react';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';
import type { AppConfig } from '@/app-config';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { StartAudioButton } from '@/components/agents-ui/start-audio-button';
import { VidyaMicError } from '@/components/app/vidya-mic-error';
import { ViewController } from '@/components/app/view-controller';
import { Toaster } from '@/components/ui/sonner';
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { useDebugMode } from '@/hooks/useDebug';
import { getUserId } from '@/lib/user-identity';
import { getSandboxTokenSource } from '@/lib/utils';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();
  return null;
}

/** Classify raw DOMException names into user-friendly error types */
function classifyMicError(err: unknown): 'denied' | 'notfound' | 'unknown' {
  if (err instanceof Error) {
    const name = err.name;
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'denied';
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'notfound';
  }
  return 'unknown';
}

interface AppProps {
  appConfig: AppConfig;
}

export function App({ appConfig }: AppProps) {
  const [micError, setMicError] = useState<'denied' | 'notfound' | 'unknown' | null>(null);

  const tokenSource = useMemo(() => {
    if (typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string') {
      return getSandboxTokenSource(appConfig);
    }

    // Custom token source that sends the stable userId so the backend agent
    // can look up persistent learner memory via participantIdentity.
    return TokenSource.custom(async () => {
      const userId = getUserId();
      const body: Record<string, unknown> = { userId };

      if (appConfig.agentName) {
        body.room_config = { agents: [{ agent_name: appConfig.agentName }] };
      }

      const res = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Token request failed: ${res.status}`);
      }
      return await res.json();
    });
  }, [appConfig]);

  const session = useSession(
    tokenSource,
    appConfig.agentName ? { agentName: appConfig.agentName } : undefined
  );

  const handleStartCall = useCallback(async () => {
    setMicError(null);
    try {
      await session.start();
    } catch (err) {
      setMicError(classifyMicError(err));
    }
  }, [session]);

  const handleEndCall = useCallback(async () => {
    await session.end();
  }, [session]);

  const handleRetryMic = useCallback(() => {
    setMicError(null);
  }, []);

  // Microphone error screen
  if (micError) {
    return <VidyaMicError errorType={micError} onRetry={handleRetryMic} />;
  }

  return (
    <AgentSessionProvider session={session}>
      <AppSetup />
      <main className="grid h-svh grid-cols-1 place-content-center">
        <ViewController
          appConfig={appConfig}
          onStartCall={handleStartCall}
          onEndCall={handleEndCall}
        />
      </main>
      <StartAudioButton label="Start Audio" />
      <Toaster
        icons={{ warning: <WarningIcon weight="bold" /> }}
        position="top-center"
        className="toaster group"
        style={
          {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
          } as React.CSSProperties
        }
      />
    </AgentSessionProvider>
  );
}
