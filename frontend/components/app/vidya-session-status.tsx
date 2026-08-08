'use client';

import { type AgentState } from '@livekit/components-react';
import { cn } from '@/lib/shadcn/utils';

interface VidyaSessionStatusProps {
  agentState: AgentState | undefined;
  className?: string;
}

/**
 * Shows a clear speaker-identification status bar.
 * Tells the user who is speaking and what state Vidya is in.
 */
export function VidyaSessionStatus({ agentState, className }: VidyaSessionStatusProps) {
  const status = getStatusInfo(agentState);

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={status.ariaLabel}
    >
      {/* Left: Vidya name + live badge */}
      <div className="flex items-center gap-2">
        <span className="text-foreground text-sm font-bold">Vidya</span>
        <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
          <span
            className={cn(
              'inline-block h-1.5 w-1.5 rounded-full',
              agentState === 'speaking' ? 'bg-green-500 animate-pulse' :
              agentState === 'listening' || agentState === 'pre-connect-buffering' ? 'bg-primary animate-pulse' :
              'bg-primary/50'
            )}
            aria-hidden="true"
          />
          LIVE
        </span>
      </div>

      {/* Right: current state */}
      <div className="flex items-center gap-1.5">
        <span className="text-lg" aria-hidden="true">{status.icon}</span>
        <span className="text-muted-foreground text-xs font-medium">{status.label}</span>
      </div>
    </div>
  );
}

function getStatusInfo(state: AgentState | undefined): {
  icon: string;
  label: string;
  ariaLabel: string;
} {
  switch (state) {
    case 'connecting':
    case 'initializing':
      return { icon: '⏳', label: 'Connecting...', ariaLabel: 'Connecting to Vidya' };
    case 'listening':
    case 'pre-connect-buffering':
      return { icon: '🎙️', label: 'Listening to you', ariaLabel: 'Vidya is now listening' };
    case 'thinking':
      return { icon: '💭', label: 'Thinking...', ariaLabel: 'Vidya is thinking' };
    case 'speaking':
      return { icon: '🔊', label: 'Vidya is speaking', ariaLabel: 'Vidya is now speaking' };
    case 'idle':
      return { icon: '✅', label: 'Ready to learn', ariaLabel: 'Vidya is ready' };
    default:
      return { icon: '🎙️', label: 'Listening to you', ariaLabel: 'Session active' };
  }
}
