'use client';

import {
  CheckCircle,
  CircleNotch,
  Ear,
  PhoneCall,
  PhoneDisconnect,
  PhoneOutgoing,
  SpeakerHigh,
} from '@phosphor-icons/react';
import { useCallStatus } from '@/hooks/useCallStatus';
import { cn } from '@/lib/shadcn/utils';
import type { CallStatusEvent } from '@/types/call';

/* ── Types ── */
type CallStatus = CallStatusEvent['status'];

/* ── Orb animation state derived from call status ── */
type OrbVariant =
  | 'ready'
  | 'connecting'
  | 'calling'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'ended';

function statusToOrbVariant(status: CallStatus): OrbVariant {
  switch (status) {
    case 'READY':
      return 'ready';
    case 'CONNECTING':
      return 'connecting';
    case 'CALLING':
      return 'calling';
    case 'LISTENING':
      return 'listening';
    case 'THINKING':
      return 'thinking';
    case 'SPEAKING':
      return 'speaking';
    case 'CALL ENDED':
      return 'ended';
  }
}

/* ── Animated AI orb — adapted from VoiceOrb in welcome-view.tsx ── */
function OutboundOrb({ variant }: { variant: OrbVariant }) {
  const isConnecting = variant === 'connecting';
  const isCalling = variant === 'calling';
  const isListening = variant === 'listening';
  const isThinking = variant === 'thinking';
  const isSpeaking = variant === 'speaking';
  const isEnded = variant === 'ended';

  return (
    <div className="relative flex items-center justify-center" aria-hidden="true">
      {/* Glow layer */}
      <div
        className={cn('absolute rounded-full transition-all duration-1000', {
          // READY — soft idle pulse
          'bg-primary/10 h-52 w-52 blur-[50px] [animation-duration:3s] motion-safe:animate-pulse':
            variant === 'ready',
          // CONNECTING — faint static glow
          'bg-primary/8 h-52 w-52 blur-[50px]': isConnecting,
          // CALLING — amber ring glow
          'h-52 w-52 bg-amber-400/15 blur-[50px] [animation-duration:1.5s] motion-safe:animate-pulse':
            isCalling,
          // LISTENING — cyan waveform glow
          'h-52 w-52 bg-cyan-400/15 blur-[50px] [animation-duration:0.8s] motion-safe:animate-pulse':
            isListening,
          // THINKING — violet slow glow
          'h-52 w-52 bg-violet-400/12 blur-[50px] [animation-duration:2s] motion-safe:animate-pulse':
            isThinking,
          // SPEAKING — violet bright fast glow
          'h-52 w-52 bg-violet-500/20 blur-[50px] [animation-duration:1s] motion-safe:animate-pulse':
            isSpeaking,
          // CALL ENDED — faded
          'bg-primary/5 h-52 w-52 blur-[50px]': isEnded,
        })}
      />

      {/* Outer ring animations */}
      {variant === 'ready' && (
        <span className="border-primary/15 absolute h-36 w-36 rounded-full border [animation-duration:3s] motion-safe:animate-ping" />
      )}
      {isConnecting && (
        /* Spinning ring for CONNECTING */
        <span className="border-t-primary/60 absolute h-36 w-36 rounded-full border-2 border-transparent [animation-duration:1.2s] motion-safe:animate-spin" />
      )}
      {isCalling && (
        /* Pulsing double-ring for CALLING */
        <>
          <span className="absolute h-36 w-36 rounded-full border border-amber-400/30 [animation-duration:1.5s] motion-safe:animate-ping" />
          <span className="absolute h-44 w-44 rounded-full border border-amber-400/15 [animation-duration:2s] motion-safe:animate-ping" />
        </>
      )}
      {isListening && (
        /* Waveform-style animation for LISTENING — three rings at different scales/delays */
        <>
          <span className="absolute h-28 w-28 rounded-full border border-cyan-400/40 [animation-delay:0ms] [animation-duration:1.2s] motion-safe:animate-ping" />
          <span className="absolute h-36 w-36 rounded-full border border-cyan-400/25 [animation-delay:300ms] [animation-duration:1.2s] motion-safe:animate-ping" />
          <span className="absolute h-44 w-44 rounded-full border border-cyan-400/15 [animation-delay:600ms] [animation-duration:1.2s] motion-safe:animate-ping" />
        </>
      )}
      {isThinking && (
        /* Slow clockwise spin for THINKING */
        <span className="absolute h-36 w-36 rounded-full border-2 border-transparent border-t-violet-400/50 [animation-duration:2s] motion-safe:animate-spin" />
      )}
      {isSpeaking && (
        /* Waveform-style animation for SPEAKING — three rings at different scales/delays, faster */
        <>
          <span className="absolute h-28 w-28 rounded-full border border-violet-500/40 [animation-delay:0ms] [animation-duration:0.9s] motion-safe:animate-ping" />
          <span className="absolute h-36 w-36 rounded-full border border-violet-500/25 [animation-delay:200ms] [animation-duration:0.9s] motion-safe:animate-ping" />
          <span className="absolute h-44 w-44 rounded-full border border-violet-500/15 [animation-delay:400ms] [animation-duration:0.9s] motion-safe:animate-ping" />
        </>
      )}

      {/* Middle ring */}
      <span
        className={cn('absolute h-24 w-24 rounded-full border', {
          'border-primary/10 [animation-duration:4s] motion-safe:animate-pulse':
            variant === 'ready',
          'border-primary/20 [animation-duration:2s] motion-safe:animate-spin': isConnecting,
          'border-amber-400/25 [animation-duration:1.5s] motion-safe:animate-pulse': isCalling,
          'border-cyan-400/20 [animation-duration:0.8s] motion-safe:animate-pulse': isListening,
          'border-violet-400/20 [animation-duration:2s] motion-safe:animate-spin': isThinking,
          'border-violet-500/20 [animation-duration:1s] motion-safe:animate-pulse': isSpeaking,
          'border-primary/5': isEnded,
        })}
      />

      {/* Orb body — 104px */}
      <div
        className={cn(
          'relative flex h-[104px] w-[104px] items-center justify-center rounded-full shadow-2xl transition-all duration-500',
          {
            'shadow-primary/20': variant === 'ready' || isConnecting,
            'shadow-amber-400/20': isCalling,
            'shadow-cyan-400/20': isListening,
            'shadow-violet-400/15': isThinking,
            'shadow-violet-500/25': isSpeaking,
            'shadow-primary/10': isEnded,
          }
        )}
        style={{
          background:
            'radial-gradient(circle at 35% 35%, oklch(0.70 0.22 264), oklch(0.42 0.25 280))',
          border: '1px solid oklch(1 0 0 / 15%)',
          opacity: isEnded ? 0.6 : 1,
        }}
      >
        {/* Inner pulse overlay */}
        <div
          className={cn('absolute inset-0 rounded-full transition-all duration-500', {
            'bg-primary/15 [animation-duration:2s] motion-safe:animate-pulse': variant === 'ready',
            'bg-primary/10': isConnecting,
            'bg-amber-400/10 [animation-duration:1.5s] motion-safe:animate-pulse': isCalling,
            'bg-cyan-400/10 [animation-duration:0.8s] motion-safe:animate-pulse': isListening,
            'bg-violet-400/8 [animation-duration:2s] motion-safe:animate-pulse': isThinking,
            'bg-violet-500/15 [animation-duration:1s] motion-safe:animate-pulse': isSpeaking,
            'bg-primary/5': isEnded,
          })}
        />
        {/* Book SVG icon (same as VoiceOrb) */}
        <svg width="36" height="36" viewBox="0 0 48 48" fill="none" className="relative z-10">
          <path
            d="M24 11C24 11 15 9 7 13V38C15 34 24 36 24 36V11Z"
            fill="white"
            fillOpacity="0.25"
            stroke="white"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M24 11C24 11 33 9 41 13V38C33 34 24 36 24 36V11Z"
            fill="white"
            fillOpacity="0.12"
            stroke="white"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

/* ── Status icon + label per call status ── */
function StatusIndicator({ status }: { status: CallStatus }) {
  const iconSize = 18;
  const iconWeight = 'duotone' as const;

  const iconEl = (() => {
    switch (status) {
      case 'READY':
        return (
          <CheckCircle
            size={iconSize}
            weight={iconWeight}
            className="text-primary/80"
            aria-hidden="true"
          />
        );
      case 'CONNECTING':
        return (
          <PhoneOutgoing
            size={iconSize}
            weight={iconWeight}
            className="text-primary/80 motion-safe:animate-pulse"
            aria-hidden="true"
          />
        );
      case 'CALLING':
        return (
          <PhoneCall
            size={iconSize}
            weight={iconWeight}
            className="text-amber-400/90 motion-safe:animate-pulse"
            aria-hidden="true"
          />
        );
      case 'LISTENING':
        return (
          <Ear
            size={iconSize}
            weight={iconWeight}
            className="text-cyan-400/90"
            aria-hidden="true"
          />
        );
      case 'THINKING':
        return (
          <CircleNotch
            size={iconSize}
            weight="bold"
            className="text-violet-400/90 motion-safe:animate-spin"
            aria-hidden="true"
          />
        );
      case 'SPEAKING':
        return (
          <SpeakerHigh
            size={iconSize}
            weight={iconWeight}
            className="text-violet-400/90 motion-safe:animate-pulse"
            aria-hidden="true"
          />
        );
      case 'CALL ENDED':
        return (
          <PhoneDisconnect
            size={iconSize}
            weight={iconWeight}
            className="text-muted-foreground/60"
            aria-hidden="true"
          />
        );
    }
  })();

  const labelColorClass = (() => {
    switch (status) {
      case 'READY':
      case 'CONNECTING':
        return 'text-primary/70';
      case 'CALLING':
        return 'text-amber-400/80';
      case 'LISTENING':
        return 'text-cyan-400/80';
      case 'THINKING':
      case 'SPEAKING':
        return 'text-violet-400/80';
      case 'CALL ENDED':
        return 'text-muted-foreground/60';
    }
  })();

  return (
    <div
      className="flex items-center gap-2"
      role="status"
      aria-live="polite"
      aria-label={`Call status: ${status}`}
    >
      {iconEl}
      <span
        className={cn(
          'text-[11px] font-semibold tracking-widest uppercase transition-colors duration-300',
          labelColorClass
        )}
      >
        {status}
      </span>
    </div>
  );
}

/* ── Outbound Call Dashboard ── */
export function OutboundCallDashboard() {
  // 15.1 — import and read current call status
  const { status } = useCallStatus();

  // 15.5 — return null when no outbound call is active
  if (status === null) return null;

  const orbVariant = statusToOrbVariant(status);

  return (
    <div
      className={cn(
        'border-foreground/8 bg-background/80 flex flex-col items-center gap-6 rounded-3xl border p-8 backdrop-blur-sm transition-all duration-500',
        {
          'opacity-60': status === 'CALL ENDED',
        }
      )}
      aria-label="Outbound call status"
    >
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
        aria-hidden="true"
      >
        <div
          className={cn(
            'absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-[80px] transition-all duration-1000',
            {
              'bg-primary/8': status === 'READY' || status === 'CONNECTING',
              'bg-amber-400/10': status === 'CALLING',
              'bg-cyan-400/10': status === 'LISTENING',
              'bg-violet-400/10': status === 'THINKING' || status === 'SPEAKING',
              'bg-primary/4': status === 'CALL ENDED',
            }
          )}
        />
      </div>

      {/* 15.2 — animated AI orb */}
      <div className="relative">
        <OutboundOrb variant={orbVariant} />
      </div>

      {/* 15.3 + 15.4 — SVG status icon + text label */}
      <StatusIndicator status={status} />
    </div>
  );
}
