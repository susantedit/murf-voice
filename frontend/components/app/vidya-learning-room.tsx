'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
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
  Lock,
  MathOperations,
  Microphone,
  Question,
  Timer,
  Warning,
  Waveform,
} from '@phosphor-icons/react';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { AgentControlBar } from '@/components/agents-ui/agent-control-bar';
import { AIActivityPanel } from '@/components/app/ai-activity-panel';
import { ExerciseCard } from '@/components/app/exercise-card';
import type { ExerciseCardProps } from '@/components/app/exercise-card';
import { FeedbackCard } from '@/components/app/feedback-card';
import type { FeedbackCardProps } from '@/components/app/feedback-card';
import { LearningContextPanel } from '@/components/app/learning-context-panel';
import { useLearnerMemory } from '@/hooks/useLearnerMemory';
import { useToolEvents } from '@/hooks/useToolEvents';
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
    sublabel: "Speak now — I'm ready for you",
    color: 'text-cyan-400',
    dot: 'bg-cyan-400 motion-safe:animate-ping',
  },
  thinking: {
    IconComponent: Brain,
    label: 'THINKING',
    sublabel: 'Processing your question...',
    color: 'text-violet-400',
    dot: 'bg-violet-400 motion-safe:animate-spin',
  },
  speaking: {
    IconComponent: Waveform,
    label: 'SPEAKING',
    sublabel: 'Vidya is responding...',
    color: 'text-emerald-400',
    dot: 'bg-emerald-400 motion-safe:animate-pulse',
  },
  idle: {
    IconComponent: CheckCircle,
    label: 'READY',
    sublabel: 'Ask me anything about your studies',
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
          <line
            x1="11"
            y1="18"
            x2="21"
            y2="16.5"
            stroke="white"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />
          <line
            x1="11"
            y1="23"
            x2="21"
            y2="21.5"
            stroke="white"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />
          <line
            x1="11"
            y1="28"
            x2="21"
            y2="26.5"
            stroke="white"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />
          <line
            x1="27"
            y1="16.5"
            x2="37"
            y2="18"
            stroke="white"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeOpacity="0.5"
          />
          <line
            x1="27"
            y1="21.5"
            x2="37"
            y2="23"
            stroke="white"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeOpacity="0.5"
          />
          <line
            x1="27"
            y1="26.5"
            x2="37"
            y2="28"
            stroke="white"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeOpacity="0.5"
          />
          <circle cx="39" cy="10" r="2.5" fill="white" fillOpacity="0.6" />
          <line
            x1="39"
            y1="5"
            x2="39"
            y2="8"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.5"
          />
          <line
            x1="39"
            y1="12"
            x2="39"
            y2="15"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.5"
          />
          <line
            x1="34"
            y1="10"
            x2="37"
            y2="10"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.5"
          />
          <line
            x1="41"
            y1="10"
            x2="44"
            y2="10"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.5"
          />
        </svg>
      </div>

      {/* Waveform bars — only shown when speaking */}
      {isSpeaking && (
        <div className="absolute flex items-end gap-0.5" style={{ bottom: -20 }}>
          {[3, 5, 8, 5, 3].map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-emerald-400"
              style={{
                height: `${h * 3}px`,
                animationDelay: `${i * 0.1}s`,
                animation: 'waveform-bounce 0.6s ease-in-out infinite alternate',
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
          <Microphone
            size={16}
            weight="bold"
            className="motion-safe:animate-pulse"
            aria-hidden="true"
          />
        )}
        {orbState === 'thinking' && (
          <Brain
            size={16}
            weight="bold"
            className="[animation-duration:1.5s] motion-safe:animate-spin"
            aria-hidden="true"
          />
        )}
        {orbState === 'speaking' && (
          <Waveform
            size={16}
            weight="bold"
            className="[animation-duration:0.6s] motion-safe:animate-pulse"
            aria-hidden="true"
          />
        )}
        {orbState === 'connecting' && (
          <CircleNotch
            size={16}
            weight="bold"
            className="motion-safe:animate-spin"
            aria-hidden="true"
          />
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

// ── Learning Context Bar ───────────────────────────────────────────────────

function LearningContextBar({ userId }: { userId: string }) {
  const { memory, loading } = useLearnerMemory(userId);
  if (loading || !memory?.found) return null;

  const lastTopic =
    memory.topics && memory.topics.length > 0 ? memory.topics[memory.topics.length - 1] : undefined;

  return (
    <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-2 px-4">
      {memory.name && (
        <span className="border-primary/20 bg-primary/5 text-primary inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold">
          Student: {memory.name}
        </span>
      )}
      {memory.current_level && (
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-400/5 px-2.5 py-1 text-[10px] font-semibold text-violet-400">
          Level: {memory.current_level}
        </span>
      )}
      {lastTopic && (
        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-2.5 py-1 text-[10px] font-semibold text-cyan-400">
          Topic: {lastTopic}
        </span>
      )}
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
        <Brain size={10} weight="duotone" aria-hidden="true" /> Memory: Active
      </span>
    </div>
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
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <ChatTeardrop
          size={32}
          weight="regular"
          className="text-muted-foreground/30"
          aria-hidden="true"
        />
        <p className="text-muted-foreground text-xs">Your conversation will appear here...</p>
        <p className="text-muted-foreground/50 text-[10px]">Hindi → देवनागरी · English → Latin</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      {messages.map((msg) => {
        const isUser = msg.from?.isLocal === true;
        const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
        const time = new Date(msg.timestamp).toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div
            key={msg.id}
            className={cn('flex items-end gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}
          >
            {/* Avatar */}
            <div
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                isUser
                  ? 'bg-primary/20 text-primary border-primary/30 border'
                  : 'text-muted-foreground border border-white/10 bg-white/8'
              )}
              aria-hidden="true"
            >
              {isUser ? 'U' : <BookOpen size={10} weight="bold" />}
            </div>
            {/* Bubble */}
            <div
              className={cn(
                'flex max-w-[80%] flex-col gap-1',
                isUser ? 'items-end' : 'items-start'
              )}
            >
              <div
                className={cn(
                  'rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                  isUser
                    ? 'bg-primary/15 border-primary/20 text-foreground rounded-br-sm border'
                    : 'text-foreground rounded-bl-sm border border-white/8 bg-white/5'
                )}
              >
                {msg.message}
              </div>
              <span className="text-muted-foreground/50 text-[10px] tabular-nums">{time}</span>
            </div>
          </div>
        );
      })}
      {/* Thinking indicator */}
      {agentState === 'thinking' && (
        <div className="flex items-end gap-2">
          <div
            className="text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8"
            aria-hidden="true"
          >
            <BookOpen size={10} weight="bold" />
          </div>
          <div className="rounded-2xl rounded-bl-sm border border-white/8 bg-white/5 px-3.5 py-2">
            <span className="flex items-center gap-1">
              <span className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
              <span className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
              <span className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
            </span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

// ── Feature pills (Learning Context Cards) ─────────────────────────────────

function FeaturePills() {
  const pills = [
    {
      Icon: Brain,
      label: 'Memory Active',
      desc: 'Learns your preferences',
      className: 'text-primary',
    },
    {
      Icon: BookOpen,
      label: 'Personalised',
      desc: 'Adapted to your level',
      className: 'text-primary',
    },
    { Icon: Globe, label: 'Multilingual', desc: 'Hindi & English', className: 'text-primary' },
    {
      Icon: Lock,
      label: 'Privacy First',
      desc: 'Your data, your choice',
      className: 'text-primary',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 px-4 pb-3">
      {pills.map((p) => (
        <div
          key={p.label}
          className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
        >
          <p.Icon size={16} weight="duotone" className={p.className} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-foreground truncate text-[11px] font-semibold">{p.label}</p>
            <p className="text-muted-foreground truncate text-[10px]">{p.desc}</p>
          </div>
        </div>
      ))}
    </div>
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
        <Warning
          size={16}
          weight="duotone"
          className="shrink-0 text-amber-400"
          aria-hidden="true"
        />
        <span className="text-sm font-semibold text-amber-400">
          Unable to fetch practice question
        </span>
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

  // Auto-open mobile transcript on new message
  const prevMessageCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      setMobileTranscriptOpen(true);
      prevMessageCount.current = messages.length;
    }
  }, [messages.length]);

  // Tool events → exercise / feedback / error state
  const toolEvents = useToolEvents();
  const [activeExercise, setActiveExercise] = useState<Omit<ExerciseCardProps, 'className'> | null>(
    null
  );
  const [activeFeedback, setActiveFeedback] = useState<Omit<FeedbackCardProps, 'className'> | null>(
    null
  );
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
      }
    }
  }, [toolEvents]);

  // Clear cards when session ends
  useEffect(() => {
    if (!session.isConnected) {
      setActiveExercise(null);
      setActiveFeedback(null);
      setExerciseError(false);
    }
  }, [session.isConnected]);

  const userId = getUserId();
  const orbState = agentStateToOrb(agentState);
  const handleDisconnect = onDisconnect ?? session.end;

  return (
    <section
      className={cn(
        'bg-background fixed inset-0 z-10 flex h-full w-full flex-col overflow-hidden',
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
      <div className="bg-background/80 relative z-20 flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-2.5 backdrop-blur-sm md:px-8">
        <div className="flex items-center gap-2.5">
          <Image
            src="/vidya-logo.png"
            alt="Vidya"
            width={32}
            height={32}
            className="shrink-0 rounded-lg"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-foreground text-sm font-bold tracking-tight">VIDYA</span>
            <span className="text-muted-foreground text-[9px] tracking-widest uppercase">
              Learning Room
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Memory indicator */}
          <span className="border-primary/20 bg-primary/5 text-primary hidden items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold sm:flex">
            <Brain size={12} weight="duotone" aria-hidden="true" /> Memory: Your choice
          </span>
          {/* Language badge */}
          <span className="text-muted-foreground hidden items-center gap-1.5 rounded-full border border-white/8 px-3 py-1 text-[10px] sm:flex">
            <Globe size={12} weight="regular" aria-hidden="true" /> हिंदी · English
          </span>
        </div>
      </div>

      {/* ── Body: 70/30 split on desktop ── */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* ── Left / Center column (70%) ── */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Orb + state badge section */}
          <div className="flex flex-col items-center px-4 pt-8 pb-4 md:pt-12">
            <VidyaOrb state={orbState} />
            <StateBadge orbState={orbState} />
          </div>

          {/* Learning Context Bar — only when memory found */}
          <LearningContextBar userId={userId} />

          {/* ── Exercise Card / Feedback Card / Error Card ── */}
          <div className="mx-auto w-full max-w-sm px-4 pt-4 pb-2">
            <AnimatePresence mode="wait">
              {activeExercise && <ExerciseCard key="exercise" {...activeExercise} />}
              {activeFeedback && <FeedbackCard key="feedback" {...activeFeedback} />}
              {exerciseError && !activeExercise && !activeFeedback && (
                <ExerciseErrorCard key="exercise-error" onRetry={handleDisconnect} />
              )}
            </AnimatePresence>
          </div>

          {/* Inspiration chips — hidden when exercise/feedback card is active */}
          {!activeExercise && !activeFeedback && !exerciseError && (
            <div className="flex flex-col items-center gap-3 px-4 py-4">
              <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                Need inspiration? Try asking:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <InspirationChip
                  icon={<MathOperations size={12} weight="bold" />}
                  text="Explain Algebra"
                />
                <InspirationChip icon={<Atom size={12} weight="bold" />} text="Explain Biology" />
                <InspirationChip
                  icon={<MathOperations size={12} weight="regular" />}
                  text="Practice Fractions"
                />
                <InspirationChip icon={<Question size={12} weight="bold" />} text="Quiz Me" />
                <InspirationChip
                  icon={<ArrowCounterClockwise size={12} weight="bold" />}
                  text="Revise Yesterday's Topic"
                />
                <InspirationChip
                  icon={<BookOpen size={12} weight="bold" />}
                  text="हिंदी में समझाओ"
                />
              </div>
            </div>
          )}

          {/* Mobile: Activity panel accordion */}
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

          {/* Mobile: transcript collapsible at bottom */}
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

          {/* Mobile: feature pills + context inline */}
          <div className="md:hidden">
            <FeaturePills />
            <div className="px-4 pb-4">
              <LearningContextPanel userId={userId} />
            </div>
          </div>

          {/* Spacer so content doesn't hide behind control bar */}
          <div className="shrink-0 pb-36 md:pb-32" />
        </div>

        {/* ── Right panel (30%, ~380px) — always visible on desktop ── */}
        <aside className="hidden w-[380px] shrink-0 flex-col overflow-hidden border-l border-white/8 md:flex">
          <div className="flex flex-1 flex-col overflow-y-auto">
            {/* Transcript heading */}
            <div className="flex shrink-0 items-center gap-2 border-b border-white/5 px-4 py-3">
              <ChatTeardrop
                size={14}
                weight="regular"
                className="text-primary"
                aria-hidden="true"
              />
              <h3 className="text-foreground text-xs font-bold tracking-widest uppercase">
                Live Transcript
              </h3>
              {messages.length > 0 && (
                <span className="bg-primary/10 text-primary ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold">
                  {messages.length}
                </span>
              )}
            </div>

            {/* Custom chat bubbles transcript */}
            <div className="min-h-[200px] flex-1 overflow-hidden">
              <CustomTranscript messages={messages} agentState={agentState} />
            </div>

            {/* Feature pills */}
            <div className="shrink-0 border-t border-white/5 pt-3">
              <FeaturePills />
            </div>

            {/* Learning Context Panel */}
            <div className="shrink-0 px-4 pb-4">
              <LearningContextPanel userId={userId} />
            </div>
          </div>
        </aside>
      </div>

      {/* ── Fixed bottom control bar ── */}
      <div className="absolute inset-x-0 bottom-0 z-50 px-4 pt-2 pb-4 md:px-12 md:pb-8">
        {/* Gradient fade */}
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
