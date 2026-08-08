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
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { useDebugMode } from '@/hooks/useDebug';
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
  const [sessionEnded, setSessionEnded] = useState(false);

  const tokenSource = useMemo(() => {
    return typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string'
      ? getSandboxTokenSource(appConfig)
      : TokenSource.endpoint('/api/token');
  }, [appConfig]);

  const session = useSession(
    tokenSource,
    appConfig.agentName ? { agentName: appConfig.agentName } : undefined
  );

  const handleStartCall = useCallback(async () => {
    setMicError(null);
    setSessionEnded(false);
    try {
      await session.start();
    } catch (err) {
      setMicError(classifyMicError(err));
    }
  }, [session]);

  const handleEndCall = useCallback(async () => {
    await session.end();
    setSessionEnded(true);
  }, [session]);

  const handleRetryMic = useCallback(() => {
    setMicError(null);
  }, []);

  // Microphone error screen
  if (micError) {
    return <VidyaMicError errorType={micError} onRetry={handleRetryMic} />;
  }

  // Session ended screen
  if (sessionEnded && !session.isConnected) {
    return (
      <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="text-5xl" aria-hidden="true">🎓</div>
        <h2 className="text-foreground text-2xl font-bold">Session ended</h2>
        <p className="text-muted-foreground text-sm">Nice learning with you!</p>
        <div className="flex gap-3">
          <Button
            onClick={() => setSessionEnded(false)}
            className="rounded-full px-6"
            aria-label="Start a new learning session"
          >
            🔄 Start Again
          </Button>
          <Button
            variant="outline"
            onClick={() => setSessionEnded(false)}
            className="rounded-full px-6"
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
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
