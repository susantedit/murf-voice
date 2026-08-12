'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAgent, useSessionContext, useSessionMessages } from '@livekit/components-react';
import type { AgentState, ReceivedMessage } from '@livekit/components-react';
import {
  ArrowCounterClockwise,
  Atom,
  BookOpen,
  Brain,
  ChatTeardrop,
  CheckCircle,
  CircleNotch,
  Globe,
  MathOperations,
  Microphone,
  MicrophoneSlash,
  Question,
  Timer,
  Warning,
  Waveform,
  X,
} from '@phosphor-icons/react';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { AgentControlBar } from '@/components/agents-ui/agent-control-bar';
import { AIActivityPanel } from '@/components/app/ai-activity-panel';
import { EscalationCard } from '@/components/app/escalation-card';
import type { EscalationCardProps } from '@/components/app/escalation-card';
import { ExerciseCard } from '@/components/app/exercise-card';
import type { ExerciseCardProps } from '@/components/app/exercise-card';
import { FeedbackCard } from '@/components/app/feedback-card';
import type { FeedbackCardProps } from '@/components/app/feedback-card';
import { LearningContextPanel } from '@/components/app/learning-context-panel';
import { VidyaLogo } from '@/components/app/vidya-logo';
import { useToolEvents } from '@/hooks/useToolEvents';
import { useMicStatus } from '@/hooks/useMicStatus';
import type { MicStatus } from '@/hooks/useMicStatus';
import { useResponseTimeout } from '@/hooks/useResponseTimeout';
import { cn } from '@/lib/shadcn/utils';
import { getUserId } from '@/lib/user-identity';

// ── Orb state ──────────────────────────────────────────────────────────────

type OrbState = 'connecting' | 'listening' | 'thinking' | 'speaking' | 'idle';

function agentStateToOrb(s: AgentState | undefined): OrbState {
  switch (s) {
    case 'connecting':
    case 'initializing':
      return 'connecting';
    case 'thinking':
      return 'thinking';
    case 'speaking':
      return 'speaking';
    case 'listening':
    case 'pre-connect-buffering':
      return 'listening';
    default:
      return 'idle';
  }
}

const STATE_CONFIG: Record<
  OrbState,
  { IconComponent: PhosphorIcon; label: string; sublabel: string; color: string; dot: string }
> = {
  connecting: {
    IconComponent: Timer,
    label: 'CONNECTING',
    sublabel: 'Connecting to Vidya...',
    color: 'text-primary/70',
    dot: 'bg-primary/60 motion-safe:animate-pulse',
  },
  listening: {
    IconComponent: Microphone,
    label: 'LISTENING',
    sublabel: 'Listening to you...',
    color: 'text-cyan-400',
    dot: 'bg-cyan-400 motion-safe:animate-ping',
  },
  thinking: {
    IconComponent: Brain,
    label: 'THINKING',
    sublabel: 'Vidya is thinking...',
    color: 'text-violet-400',
    dot: 'bg-violet-400 motion-safe:animate-spin',
  },
  speaking: {
    IconComponent: Waveform,
    label: 'SPEAKING',
    sublabel: 'Vidya is speaking...',
    color: 'text-emerald-400',
    dot: 'bg-emerald-400 motion-safe:animate-pulse',
  },
  idle: {
    IconComponent: CheckCircle,
    label: 'READY',
    sublabel: 'Vidya is ready',
    color: 'text-primary/60',
    dot: 'bg-primary/40 motion-safe:animate-pulse',
  },
};

// ── Vidya Orb ──────────────────────────────────────────────────────────────

function VidyaOrb({ state }: { state: OrbState }) {
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isThinking = state === 'thinking';
  const isConnecting = state === 'connecting';

  return (
    <div className="relative flex items-center justify-center" aria-hidden="true">
      {/* Ambient glow */}
      <div
        className={cn('absolute rounded-full blur-[90px] transition-all duration-1000', {
          'bg-primary/8 h-72 w-72': state === 'idle' || isConnecting,
          'h-72 w-72 bg-cyan-400/12 [animation-duration:0.8s] motion-safe:animate-pulse':
            isListening,
          'h-72 w-72 bg-violet-400/15 [animation-duration:1.2s] motion-safe:animate-pulse':
            isThinking,
          'h-72 w-72 bg-emerald-400/15 [animation-duration:0.6s] motion-safe:animate-pulse':
            isSpeaking,
        })}
      />
      {/* Outer ring */}
      {isListening && (
        <span className="absolute h-60 w-60 rounded-full border border-cyan-400/25 [animation-duration:1s] motion-safe:animate-ping" />
      )}
      {isSpeaking && (
        <span className="absolute h-60 w-60 rounded-full border border-emerald-400/20 [animation-duration:0.7s] motion-safe:animate-ping" />
      )}
      {isConnecting && (
        <span className="border-t-primary/50 absolute h-60 w-60 rounded-full border-2 border-transparent [animation-duration:1.4s] motion-safe:animate-spin" />
      )}
      {state === 'idle' && (
        <span className="border-primary/12 absolute h-60 w-60 rounded-full border [animation-duration:3s] motion-safe:animate-ping" />
      )}
      {/* Mid ring */}
      <span
        className={cn('absolute h-44 w-44 rounded-full border transition-all duration-700', {
          'border-primary/10 [animation-duration:3s] motion-safe:animate-pulse':
            state === 'idle' || isConnecting,
          'border-cyan-400/20 [animation-duration:0.8s] motion-safe:animate-pulse': isListening,
          'border-violet-400/25 [animation-duration:3s] motion-safe:animate-spin': isThinking,
          'border-emerald-400/20 [animation-duration:0.6s] motion-safe:animate-pulse': isSpeaking,
        })}
      />
      {/* Orb body */}
      <div
        className={cn(
          'relative z-10 flex h-36 w-36 items-center justify-center rounded-full shadow-2xl transition-all duration-700 md:h-44 md:w-44',
          {
            'shadow-primary/20': state === 'idle' || isConnecting,
            'shadow-cyan-400/25': isListening,
            'shadow-violet-400/30': isThinking,
            'shadow-emerald-400/30': isSpeaking,
          }
        )}
        style={{
          background:
            'radial-gradient(circle at 35% 35%, oklch(0.70 0.22 264), oklch(0.42 0.25 280))',
          border: '1px solid oklch(1 0 0 / 15%)',
        }}
      >
        <div
          className={cn('absolute inset-0 rounded-full transition-all duration-700', {
            'bg-primary/10': state === 'idle' || isConnecting,
            'bg-cyan-400/10 [animation-duration:0.8s] motion-safe:animate-pulse': isListening,
            'bg-violet-400/12 [animation-duration:1.2s] motion-safe:animate-pulse': isThinking,
            'bg-emerald-400/12 [animation-duration:0.6s] motion-safe:animate-pulse': isSpeaking,
          })}
        />
        {/* Book SVG */}
        <svg width="52" height="52" viewBox="0 0 48 48" fill="none" className="relative z-10">
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
          <line x1="11" y1="18" x2="21" y2="16.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.7" />
          <line x1="11" y1="23" x2="21" y2="21.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.7" />
          <line x1="11" y1="28" x2="21" y2="26.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.7" />
          <line x1="27" y1="16.5" x2="37" y2="18" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.5" />
          <line x1="27" y1="21.5" x2="37" y2="23" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.5" />
          <line x1="27" y1="26.5" x2="37" y2="28" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.5" />
          <circle cx="39" cy="10" r="2.5" fill="white" fillOpacity="0.6" />
          <line x1="39" y1="5" x2="39" y2="8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
          <line x1="39" y1="12" x2="39" y2="15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
          <line x1="34" y1="10" x2="37" y2="10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
          <line x1="41" y1="10" x2="44" y2="10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
        </svg>
      </div>

      {/* Waveform bars — 7 bars when speaking */}
      {isSpeaking && (
        <div className="absolute flex items-end gap-1" style={{ bottom: -24 }}>
          {[4, 8, 14, 20, 14, 8, 4].map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-emerald-400"
              style={{
                height: `${h * 1.5}px`,
                animationDelay: `${i * 0.08}s`,
                animation: 'vidya-waveform-bounce 0.5s ease-in-out infinite alternate',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── State Badge ────────────────────────────────────────────────────────────

function StateBadge({ orbState }: { orbState: OrbState }) {
  const config = STATE_CONFIG[orbState];
  const IconComp = config.IconComponent;

  return (
    <div
      className="mt-8 flex flex-col items-center gap-2"
      role="status"
      aria-live="polite"
      aria-label={config.sublabel}
    >
      <span
        className={cn(
          'inline-flex items-center gap-3 rounded-full border px-6 py-2.5 text-sm font-bold tracking-widest uppercase backdrop-blur-sm',
          {
            'border-cyan-400/40 bg-cyan-400/10 text-cyan-400': orbState === 'listening',
            'border-violet-400/40 bg-violet-400/10 text-violet-400': orbState === 'thinking',
            'border-emerald-400/40 bg-emerald-400/10 text-emerald-400': orbState === 'speaking',
            'border-primary/40 bg-primary/10 text-primary': orbState === 'connecting',
            'text-muted-foreground border-white/12 bg-white/5': orbState === 'idle',
          }
        )}
      >
        {orbState === 'listening' && (
          <Microphone size={16} weight="bold" className="motion-safe:animate-pulse" aria-hidden="true" />
        )}
        {orbState === 'thinking' && (
          <Brain size={16} weight="bold" className="[animation-duration:1.5s] motion-safe:animate-spin" aria-hidden="true" />
        )}
        {orbState === 'speaking' && (
          <Waveform size={16} weight="bold" className="[animation-duration:0.6s] motion-safe:animate-pulse" aria-hidden="true" />
        )}
        {orbState === 'connecting' && (
          <CircleNotch size={16} weight="bold" className="motion-safe:animate-spin" aria-hidden="true" />
        )}
        {orbState === 'idle' && <CheckCircle size={16} weight="bold" aria-hidden="true" />}
        <span>
          {orbState === 'idle' && 'VIDYA IS READY'}
          {orbState === 'connecting' && 'CONNECTING'}
          {orbState === 'listening' && 'VIDYA IS LISTENING'}
          {orbState === 'thinking' && 'VIDYA IS THINKING'}
          {orbState === 'speaking' && 'VIDYA IS SPEAKING'}
        </span>
        <IconComp size={16} weight="bold" aria-hidden="true" className="opacity-60" />
      </span>
      <p className="text-muted-foreground text-sm font-medium">{config.sublabel}</p>
    </div>
  );
}

// ── Mic Status Badge ───────────────────────────────────────────────────────

import type { MicStatus } from '@/hooks/useMicStatus';

function MicStatusBadge({ status, errorMessage }: { status: MicStatus; errorMessage?: string }) {
  if (status === 'listening' || status === 'unavailable') return null; // nominal — don't clutter

  const configs: Record<string, { label: string; color: string; Icon: PhosphorIcon; bg: string }> = {
    requesting: {
      label: 'MIC REQUESTING',
      color: 'text-amber-400',
      bg: 'border-amber-400/30 bg-amber-400/10',
      Icon: CircleNotch,
    },
    ready: {
      label: 'MIC READY',
      color: 'text-emerald-400',
      bg: 'border-emerald-400/30 bg-emerald-400/10',
      Icon: Microphone,
    },
    muted: {
      label: 'MIC MUTED',
      color: 'text-red-400',
      bg: 'border-red-400/30 bg-red-400/10',
      Icon: MicrophoneSlash,
    },
    error: {
      label: 'MIC ERROR',
      color: 'text-red-400',
      bg: 'border-red-400/30 bg-red-400/10',
      Icon: Warning,
    },
  };

  const c = configs[status];
  if (!c) return null;

  return (
    <div className="mt-2 flex flex-col items-center gap-1">
      <span
        className={cn(
          'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold tracking-wider uppercase',
          c.bg,
          c.color
        )}
      >
        <c.Icon size={12} weight="bold" aria-hidden="true"
          className={status === 'requesting' ? 'motion-safe:animate-spin' : ''} />
        {c.label}
      </span>
      {status === 'error' && errorMessage && (
        <p className="text-muted-foreground mt-1 max-w-[260px] text-center text-[11px]">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

// ── Response Error Card ────────────────────────────────────────────────────

function ResponseErrorCard({
  type,
  onRetry,
}: {
  type: 'thinking_timeout' | 'speaking_timeout';
  onRetry: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 backdrop-blur-sm"
      role="alert"
    >
      <div className="mb-2 flex items-center gap-2">
        <Warning size={16} weight="duotone" className="shrink-0 text-red-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-red-400">
          {type === 'thinking_timeout'
            ? "Sorry, I didn't get a response. Please try again."
            : 'Speaking timed out. Please try again.'}
        </span>
      </div>
      <p className="text-muted-foreground mb-3 text-xs">
        {type === 'thinking_timeout'
          ? 'Vidya was thinking too long. This can happen with slow connections or LLM delays.'
          : 'Audio output may have stalled. Reconnect or try again.'}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-400 transition-colors hover:bg-red-500/20"
      >
        <ArrowCounterClockwise size={11} weight="bold" aria-hidden="true" /> Retry
      </button>
    </motion.div>
  );
}

// ── Inspiration chip ───────────────────────────────────────────────────────

interface InspirationChipProps {
  icon: React.ReactNode;
  text: string;
}

function InspirationChip({ icon, text }: InspirationChipProps) {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-xs font-medium">
      <span aria-hidden="true" className="shrink-0">
        {icon}
      </span>
      {text}
    </span>
  );
}

// ── Exercise Error Card ────────────────────────────────────────────────────

function ExerciseErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 backdrop-blur-sm"
      role="alert"
    >
      <div className="mb-2 flex items-center gap-2">
        <Warning size={16} weight="duotone" className="shrink-0 text-amber-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-amber-400">Unable to fetch practice question</span>
      </div>
      <p className="text-muted-foreground mb-3 text-xs">Checking connection...</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
      >
        <ArrowCounterClockwise size={11} weight="bold" aria-hidden="true" /> Retry
      </button>
    </motion.div>
  );
}

// ── Custom Transcript (chat bubbles) ───────────────────────────────────────

interface CustomTranscriptProps {
  messages: ReceivedMessage[];
  agentState?: AgentState;
}

function CustomTranscript({ messages, agentState }: CustomTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, agentState]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <ChatTeardrop size={32} weight="regular" className="text-muted-foreground/30" aria-hidden="true" />
        <p className="text-muted-foreground text-xs font-semibold">Your conversation will appear here...</p>
        <p className="text-muted-foreground/60 text-[10px]">Hindi → देवनागरी · English → Latin</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      {messages.map((msg) => {
        const isUser =
          msg.from?.isLocal === true ||
          (msg as any).type === 'userTranscript' ||
          (msg as any).type === 'user';
        const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
        const time = new Date(msg.timestamp).toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div
            key={msg.id}
            className={cn('flex items-end gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}
          >
            {/* Avatar */}
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold shadow-sm',
                isUser
                  ? 'border-primary/40 bg-primary/25 text-primary border'
                  : 'border-violet-400/30 bg-violet-500/20 text-violet-300 border'
              )}
              aria-hidden="true"
            >
              {isUser ? 'YOU' : 'V'}
            </div>
            {/* Bubble */}
            <div className={cn('flex max-w-[85%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
              <div
                className={cn(
                  'devanagari rounded-2xl px-4 py-2.5 text-xs leading-relaxed sm:text-sm',
                  isUser
                    ? 'border-primary/30 bg-primary/20 text-foreground rounded-br-xs border shadow-sm'
                    : 'bg-secondary/50 border-white/10 text-foreground rounded-bl-xs border shadow-sm'
                )}
              >
                {msg.message}
              </div>
              <span className="text-muted-foreground/60 px-1 text-[10px] tabular-nums">{time}</span>
            </div>
          </div>
        );
      })}
      {/* Thinking indicator */}
      {agentState === 'thinking' && (
        <div className="flex items-end gap-2.5">
          <div
            className="border-violet-400/30 bg-violet-500/20 text-violet-300 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[9px] font-extrabold shadow-sm"
            aria-hidden="true"
          >
            V
          </div>
          <div className="rounded-2xl rounded-bl-xs border border-white/10 bg-white/5 px-4 py-2.5">
            <span className="flex items-center gap-1.5">
              <span className="bg-primary/80 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
              <span className="bg-primary/80 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
              <span className="bg-primary/80 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
            </span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────

interface VidyaLearningRoomProps {
  audioVisualizerType?: 'bar' | 'wave' | 'grid' | 'radial' | 'aura';
  audioVisualizerColor?: `#${string}`;
  audioVisualizerColorShift?: number;
  audioVisualizerBarCount?: number;
  audioVisualizerGridRowCount?: number;
  audioVisualizerGridColumnCount?: number;
  audioVisualizerRadialBarCount?: number;
  audioVisualizerRadialRadius?: number;
  audioVisualizerWaveLineWidth?: number;
  onDisconnect?: () => void;
  className?: string;
}

// ── VidyaLearningRoom ──────────────────────────────────────────────────────

export function VidyaLearningRoom({ onDisconnect, className }: VidyaLearningRoomProps) {
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);
  const { state: agentState } = useAgent();

  const [chatInputOpen, setChatInputOpen] = useState(false);
  const [mobileTranscriptOpen, setMobileTranscriptOpen] = useState(false);
  const [transcriptCollapsed, setTranscriptCollapsed] = useState(false);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);

  // Mic status
  const { status: micStatus, errorMessage: micError } = useMicStatus();

  // Response timeout
  const { stuckState, clearStuck } = useResponseTimeout(agentState);

  // Auto-open mobile transcript on new message
  const prevMessageCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      setMobileTranscriptOpen(true);
      prevMessageCount.current = messages.length;
    }
  }, [messages.length]);

  // Tool events → exercise / feedback / error / escalation state
  const toolEvents = useToolEvents();
  const [activeExercise, setActiveExercise] = useState<Omit<ExerciseCardProps, 'className'> | null>(null);
  const [activeFeedback, setActiveFeedback] = useState<Omit<FeedbackCardProps, 'className'> | null>(null);
  const [activeEscalation, setActiveEscalation] = useState<Omit<EscalationCardProps, 'className'> | null>(null);
  const [exerciseError, setExerciseError] = useState(false);
  const prevToolEventCount = useRef(0);

  useEffect(() => {
    const currentCount = toolEvents.length;
    if (currentCount <= prevToolEventCount.current) return;
    const newEvents = toolEvents.slice(prevToolEventCount.current);
    prevToolEventCount.current = currentCount;

    for (const event of newEvents) {
      if (event.type === 'exercise_ready') {
        setActiveExercise({
          topic: event.topic ?? 'Practice',
          level: event.level,
          difficulty: event.difficulty ?? 'medium',
          question: event.question ?? '',
          dataSource: event.data_source,
        });
        setActiveFeedback(null);
        setExerciseError(false);
      } else if (event.type === 'answer_scored') {
        const resultMap: Record<string, string> = {
          correct: 'Well done! You got it right.',
          partially_correct: "You're close! Almost there.",
          incorrect: "Let's review this concept together.",
        };
        setActiveFeedback({
          result: (event.result ?? 'incorrect') as FeedbackCardProps['result'],
          explanation: resultMap[event.result ?? 'incorrect'] ?? 'Answer evaluated.',
          topic: event.topic,
        });
        setActiveExercise(null);
        setExerciseError(false);
      } else if (event.type === 'tool_error' && event.tool === 'get_next_exercise') {
        setActiveExercise(null);
        setExerciseError(true);
      } else if (event.type === 'tool_start' && event.tool === 'create_escalation') {
        setActiveEscalation({ status: 'preparing' });
      } else if (event.type === 'escalation_created') {
        setActiveEscalation({
          status: 'created',
          referenceId: event.reference_id,
          reason: event.reason,
          summary: event.summary,
          urgency: event.urgency,
          language: event.language,
        });
      } else if (event.type === 'escalation_failed') {
        setActiveEscalation({
          status: 'failed',
          error: event.error ?? 'Support request could not be created.',
        });
      }
    }
  }, [toolEvents]);

  // Clear cards when session ends
  useEffect(() => {
    if (!session.isConnected) {
      setActiveExercise(null);
      setActiveFeedback(null);
      setActiveEscalation(null);
      setExerciseError(false);
    }
  }, [session.isConnected]);

  const userId = getUserId();
  const orbState = agentStateToOrb(agentState);
  const handleDisconnect = onDisconnect ?? session.end;

  const hasActiveCard = !!(activeExercise || activeFeedback || activeEscalation || exerciseError);

  return (
    <section
      className={cn(
        'bg-background fixed inset-0 z-10 flex h-full w-full flex-col overflow-hidden pt-[60px]',
        className
      )}
      aria-label="Vidya Learning Room"
    >
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="bg-primary/6 absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -left-32 h-[300px] w-[300px] rounded-full bg-violet-400/5 blur-[100px]" />
        <div className="absolute top-1/4 -right-32 h-[300px] w-[300px] rounded-full bg-cyan-400/4 blur-[100px]" />
      </div>

      {/* ── Top navbar ── */}
      <div className="bg-background/80 relative z-20 flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-3">
          <VidyaLogo size={28} className="text-primary" />
          <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
            Learning Room
          </span>
          <span className="border-emerald-400/30 bg-emerald-500/10 text-emerald-400 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold">
            <span className="bg-emerald-400 h-1.5 w-1.5 animate-pulse rounded-full" />
            CONNECTED
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Memory indicator */}
          <span className="border-primary/20 bg-primary/5 text-primary hidden items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold sm:flex">
            <Brain size={12} weight="duotone" aria-hidden="true" /> Memory: Active
          </span>
          {/* Language badge */}
          <span className="text-muted-foreground hidden items-center gap-1.5 rounded-full border border-white/8 px-3 py-1 text-[10px] sm:flex">
            <Globe size={12} weight="regular" aria-hidden="true" /> हिंदी · English
          </span>
          {/* Left sidebar toggle (desktop) */}
          <button
            type="button"
            onClick={() => setLeftSidebarCollapsed((v) => !v)}
            className="text-muted-foreground hover:text-foreground hidden rounded-lg border border-white/8 px-2 py-1 text-[10px] font-medium transition-colors md:flex"
            aria-label={leftSidebarCollapsed ? 'Show AI Activity sidebar' : 'Hide AI Activity sidebar'}
          >
            {leftSidebarCollapsed ? 'Show Activity' : 'Hide Activity'}
          </button>
        </div>
      </div>

      {/* ── Body: 3-column layout ── */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">

        {/* ══ LEFT SIDEBAR — AI Activity + Learning Context (22% desktop) ══ */}
        <aside
          className={cn(
            'hidden shrink-0 flex-col overflow-hidden border-r border-white/8 transition-all duration-300 md:flex',
            leftSidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-[22%] min-w-[220px] max-w-[280px]'
          )}
          aria-label="AI Activity and Learning Context"
        >
          <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4 gap-4">
            {/* AI Activity */}
            <div>
              <p className="text-muted-foreground mb-2 font-mono text-[10px] font-bold tracking-widest uppercase px-1">
                AI Activity
              </p>
              <AIActivityPanel />
            </div>

            {/* Learning Context */}
            <div>
              <LearningContextPanel userId={userId} />
            </div>

            {/* Human Support status — shown only when escalation is active */}
            {activeEscalation && (
              <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 px-3 py-3">
                <p className="text-muted-foreground mb-1.5 font-mono text-[10px] font-bold tracking-widest uppercase">
                  Teacher Support
                </p>
                {activeEscalation.status === 'preparing' && (
                  <span className="flex items-center gap-2 text-xs text-violet-400">
                    <CircleNotch size={12} className="motion-safe:animate-spin" /> Creating request...
                  </span>
                )}
                {activeEscalation.status === 'created' && (
                  <span className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle size={12} weight="duotone" /> Request open
                    {activeEscalation.referenceId && (
                      <span className="ml-1 font-mono text-[10px] opacity-70">{activeEscalation.referenceId}</span>
                    )}
                  </span>
                )}
                {activeEscalation.status === 'failed' && (
                  <span className="flex items-center gap-2 text-xs text-red-400">
                    <Warning size={12} /> Request failed
                  </span>
                )}
              </div>
            )}
            {!activeEscalation && (
              <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-3">
                <p className="text-muted-foreground mb-1 font-mono text-[10px] font-bold tracking-widest uppercase">
                  Teacher Support
                </p>
                <span className="text-muted-foreground/60 text-xs">None active</span>
              </div>
            )}
          </div>
        </aside>

        {/* ══ CENTER — Orb + State + Cards + Controls (56% desktop) ══ */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Orb + state badge section */}
          <div className="flex flex-col items-center px-4 pt-6 pb-4 md:pt-10">
            <VidyaOrb state={orbState} />
            <StateBadge orbState={orbState} />

            {/* Mic status badge — shown only when non-nominal */}
            <MicStatusBadge status={micStatus} errorMessage={micError} />
          </div>

          {/* ── Exercise Card / Feedback Card / Escalation Card / Error / Timeout Error ── */}
          <div className="mx-auto w-full max-w-md px-4 pt-4 pb-2">
            <AnimatePresence mode="wait">
              {stuckState !== 'none' && (
                <ResponseErrorCard
                  key="response-error"
                  type={stuckState}
                  onRetry={clearStuck}
                />
              )}
              {activeEscalation && stuckState === 'none' && (
                <EscalationCard key="escalation" {...activeEscalation} />
              )}
              {activeExercise && !activeEscalation && stuckState === 'none' && (
                <ExerciseCard key="exercise" {...activeExercise} />
              )}
              {activeFeedback && !activeEscalation && stuckState === 'none' && (
                <FeedbackCard key="feedback" {...activeFeedback} />
              )}
              {exerciseError && !activeExercise && !activeFeedback && !activeEscalation && stuckState === 'none' && (
                <ExerciseErrorCard key="exercise-error" onRetry={handleDisconnect} />
              )}
            </AnimatePresence>
          </div>

          {/* Inspiration chips — hidden when a card is active */}
          {!hasActiveCard && stuckState === 'none' && (
            <div className="flex flex-col items-center gap-3 px-4 py-4">
              <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                Need inspiration? Try asking:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <InspirationChip icon={<MathOperations size={12} weight="bold" />} text="Explain Algebra" />
                <InspirationChip icon={<Atom size={12} weight="bold" />} text="Explain Biology" />
                <InspirationChip icon={<MathOperations size={12} weight="regular" />} text="Practice Fractions" />
                <InspirationChip icon={<Question size={12} weight="bold" />} text="Quiz Me" />
                <InspirationChip icon={<ArrowCounterClockwise size={12} weight="bold" />} text="Revise Yesterday's Topic" />
                <InspirationChip icon={<BookOpen size={12} weight="bold" />} text="हिंदी में समझाओ" />
              </div>
            </div>
          )}

          {/* ── Mobile: Activity panel accordion ── */}
          <div className="px-4 pb-2 md:hidden">
            <details className="border-border/40 rounded-xl border backdrop-blur-sm">
              <summary className="text-muted-foreground flex cursor-pointer items-center gap-1.5 px-4 py-2 font-mono text-[10px] font-bold tracking-widest uppercase select-none">
                AI Activity
              </summary>
              <div className="px-4 pb-3">
                <AIActivityPanel />
              </div>
            </details>
          </div>

          {/* ── Mobile: transcript collapsible at bottom ── */}
          <div className="px-4 pb-2 md:hidden">
            <details
              className="border-border/40 rounded-xl border backdrop-blur-sm"
              open={mobileTranscriptOpen}
            >
              <summary
                className="text-muted-foreground flex cursor-pointer items-center gap-1.5 px-4 py-2 font-mono text-[10px] font-bold tracking-widest uppercase select-none"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileTranscriptOpen((v) => !v);
                }}
              >
                <ChatTeardrop size={11} weight="regular" aria-hidden="true" />
                Live Transcript {messages.length > 0 && `(${messages.length})`}
              </summary>
              <div className="max-h-64 overflow-y-auto px-2 pb-3">
                <CustomTranscript messages={messages} agentState={agentState} />
              </div>
            </details>
          </div>

          {/* Mobile: Learning Context inline */}
          <div className="md:hidden px-4 pb-4">
            <LearningContextPanel userId={userId} />
          </div>

          {/* Generous bottom spacer so cards never clip behind bottom composer */}
          <div className="shrink-0 pb-44 md:pb-40" />
        </div>

        {/* ══ RIGHT SIDEBAR — LIVE TRANSCRIPT ONLY (22% desktop) ══ */}
        <aside
          className={cn(
            'hidden shrink-0 flex-col overflow-hidden border-l border-white/8 transition-all duration-300 md:flex',
            transcriptCollapsed
              ? 'w-[52px]'
              : 'w-[22%] min-w-[240px] max-w-[320px]'
          )}
          aria-label="Live Transcript"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-3 py-3">
            {!transcriptCollapsed && (
              <div className="flex items-center gap-2">
                <ChatTeardrop size={14} weight="bold" className="text-primary" aria-hidden="true" />
                <h3 className="text-foreground font-mono text-xs font-bold tracking-widest uppercase">
                  LIVE TRANSCRIPT
                </h3>
                {messages.length > 0 && (
                  <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                    {messages.length}
                  </span>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => setTranscriptCollapsed((v) => !v)}
              className="text-muted-foreground hover:text-foreground ml-auto rounded-lg p-1 text-[11px] font-medium transition-colors"
              aria-label={transcriptCollapsed ? 'Show Live Transcript' : 'Hide Live Transcript'}
            >
              {transcriptCollapsed ? (
                <ChatTeardrop size={16} weight="bold" className="text-primary" />
              ) : (
                <X size={14} />
              )}
            </button>
          </div>

          {/* Transcript scrollable area — only when not collapsed */}
          {!transcriptCollapsed && (
            <div className="min-h-0 flex-1 overflow-hidden">
              <CustomTranscript messages={messages} agentState={agentState} />
            </div>
          )}

          {/* Collapsed state — vertical label */}
          {transcriptCollapsed && (
            <div className="flex flex-1 items-center justify-center">
              <span
                className="text-muted-foreground/40 font-mono text-[10px] font-bold tracking-widest"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                TRANSCRIPT
              </span>
            </div>
          )}
        </aside>
      </div>

      {/* ── Fixed bottom control bar ── */}
      <div className="absolute inset-x-0 bottom-0 z-40 px-4 pt-2 pb-4 md:px-12 md:pb-6">
        {/* Gradient fade overlay */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-full h-24"
          style={{ background: 'linear-gradient(to top, var(--background), transparent)' }}
          aria-hidden="true"
        />
        {/* Powered by footer */}
        <p className="text-muted-foreground/40 mb-1.5 text-center text-[10px]">
          Powered by Murf Falcon TTS · LiveKit Agents · Deepgram Nova-3
        </p>
        <div className="relative mx-auto max-w-md">
          <AgentControlBar
            variant="livekit"
            controls={{
              leave: true,
              microphone: true,
              chat: true,
              camera: false,
              screenShare: false,
            }}
            isChatOpen={chatInputOpen}
            onIsChatOpenChange={setChatInputOpen}
            isConnected={session.isConnected}
            onDisconnect={handleDisconnect}
          />
        </div>
      </div>
    </section>
  );
}
