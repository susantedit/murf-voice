import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAgent, useSessionContext, useSessionMessages } from '@livekit/components-react';
import type { AgentState } from '@livekit/components-react';
import {
  ArrowCounterClockwise,
  Atom,
  BookOpen,
  Brain,
  ChatTeardrop,
  CheckCircle,
  Globe,
  Lightning,
  MathOperations,
  Microphone,
  Question,
  Timer,
  Waveform,
  X,
} from '@phosphor-icons/react';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { AgentChatTranscript } from '@/components/agents-ui/agent-chat-transcript';
import { AgentControlBar } from '@/components/agents-ui/agent-control-bar';
import { AIActivityPanel } from '@/components/app/ai-activity-panel';
import { LearningContextPanel } from '@/components/app/learning-context-panel';
import { useLearnerMemory } from '@/hooks/useLearnerMemory';
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
    sublabel: 'Vidya is listening...',
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
    sublabel: 'Ask me anything about your studies.',
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

// ── Memory journey card ────────────────────────────────────────────────────

function MemoryJourneyCard({ userId }: { userId: string }) {
  const { memory, loading } = useLearnerMemory(userId);

  if (loading || !memory?.found) return null;

  const lastTopic =
    memory.topics && memory.topics.length > 0 ? memory.topics[memory.topics.length - 1] : undefined;
  const topicsCount = memory.topics?.length ?? 0;

  return (
    <div className="border-primary/20 bg-primary/5 mx-auto w-full max-w-sm rounded-2xl border p-4 backdrop-blur-sm">
      <p className="text-primary/70 mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase">
        <Brain size={12} weight="duotone" aria-hidden="true" /> Your Learning Journey
      </p>
      {memory.name && (
        <p className="text-foreground mb-1 text-sm font-semibold">Welcome back, {memory.name}</p>
      )}
      {lastTopic && (
        <p className="text-muted-foreground mb-3 text-xs">
          Last time: <span className="text-foreground font-medium">{lastTopic}</span>
        </p>
      )}
      {/* Topic progress bar — honest: n topics explored */}
      {topicsCount > 0 && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-muted-foreground text-[10px]">Topics explored</span>
            <span className="text-primary text-[10px] font-semibold">{topicsCount}</span>
          </div>
          <div className="bg-primary/10 h-1.5 w-full rounded-full">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, topicsCount * 10)}%` }}
            />
          </div>
        </div>
      )}
      <p className="text-muted-foreground/60 flex items-center gap-1 text-[10px]">
        <Brain size={10} weight="duotone" aria-hidden="true" /> Saved with your permission
      </p>
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

  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [chatInputOpen, setChatInputOpen] = useState(false);

  // Task 16.1 & 16.2 — auto-open transcript whenever a new message arrives
  const prevMessageCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      setTranscriptOpen(true);
      prevMessageCount.current = messages.length;
    }
  }, [messages.length]);

  const userId = getUserId();
  const orbState = agentStateToOrb(agentState);
  const stateConfig = STATE_CONFIG[orbState];
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
        <div className="flex flex-col leading-tight">
          <span className="text-foreground text-sm font-bold tracking-tight">VIDYA</span>
          <span className="text-muted-foreground text-[9px] tracking-widest uppercase">
            Learning Room
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Memory indicator */}
          <span className="border-primary/20 bg-primary/5 text-primary hidden items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold sm:flex">
            <Brain size={12} weight="duotone" aria-hidden="true" /> Memory: Your choice
          </span>{' '}
          {/* Language badge */}
          <span className="text-muted-foreground hidden items-center gap-1.5 rounded-full border border-white/8 px-3 py-1 text-[10px] sm:flex">
            <Globe size={12} weight="regular" aria-hidden="true" /> हिंदी · English
          </span>
          {/* Activity toggle */}
          <button
            type="button"
            onClick={() => setActivityOpen((v) => !v)}
            className={cn(
              'flex items-center gap-1 rounded-full border px-3 py-1 font-mono text-[10px] font-bold tracking-widest uppercase transition-colors duration-150',
              activityOpen
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground border-white/10 hover:border-white/20'
            )}
            aria-label="Toggle AI activity"
          >
            <Lightning size={11} weight="bold" aria-hidden="true" /> Activity
          </button>
          {/* Transcript toggle */}
          <button
            type="button"
            onClick={() => setTranscriptOpen((v) => !v)}
            className={cn(
              'flex items-center gap-1 rounded-full border px-3 py-1 font-mono text-[10px] font-bold tracking-widest uppercase transition-colors duration-150',
              transcriptOpen
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground border-white/10 hover:border-white/20'
            )}
            aria-label="Toggle transcript"
          >
            <ChatTeardrop size={11} weight="regular" aria-hidden="true" /> Transcript
          </button>
        </div>
      </div>

      {/* ── Body: center column + optional right panel ── */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* ── Center scrollable column ── */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Orb + state section */}
          <div className="flex flex-col items-center justify-center px-4 pt-8 pb-4 md:pt-12">
            <VidyaOrb state={orbState} />

            {/* State badge */}
            <div
              className="mt-6 flex items-center gap-2"
              role="status"
              aria-live="polite"
              aria-label={stateConfig.sublabel}
            >
              <span className={cn('h-2 w-2 rounded-full', stateConfig.dot)} aria-hidden="true" />
              <span
                className={cn(
                  'flex items-center gap-1.5 font-mono text-xs font-bold tracking-[0.2em] uppercase',
                  stateConfig.color
                )}
              >
                <stateConfig.IconComponent size={14} weight="bold" aria-hidden="true" />
                {stateConfig.label}
              </span>
              <span className={cn('h-2 w-2 rounded-full', stateConfig.dot)} aria-hidden="true" />
            </div>

            {/* Sublabel */}
            <p className="text-muted-foreground mt-2 text-sm font-medium">{stateConfig.sublabel}</p>
          </div>

          {/* ── Inspiration chips ── */}
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
              <InspirationChip icon={<BookOpen size={12} weight="bold" />} text="हिंदी में समझाओ" />
            </div>
          </div>

          {/* ── Memory journey card (only if real data) ── */}
          <div className="px-4 pb-4">
            <MemoryJourneyCard userId={userId} />
          </div>

          {/* ── Mobile: activity panel accordion ── */}
          <div className="px-4 pb-2 md:hidden">
            <details className="border-border/40 rounded-xl border backdrop-blur-sm">
              <summary className="text-muted-foreground flex cursor-pointer items-center gap-1.5 px-4 py-2 font-mono text-[10px] font-bold tracking-widest uppercase select-none">
                <Lightning size={11} weight="bold" aria-hidden="true" /> AI Activity
              </summary>
              <div className="px-4 pb-3">
                <AIActivityPanel />
              </div>
            </details>
          </div>

          {/* Mobile transcript */}
          <div className="px-4 pb-2 md:hidden">
            <details
              className="border-border/40 rounded-xl border backdrop-blur-sm"
              open={transcriptOpen}
            >
              <summary
                className="text-muted-foreground flex cursor-pointer items-center gap-1.5 px-4 py-2 font-mono text-[10px] font-bold tracking-widest uppercase select-none"
                onClick={(e) => {
                  e.preventDefault();
                  setTranscriptOpen((v) => !v);
                }}
              >
                <ChatTeardrop size={11} weight="regular" aria-hidden="true" />
                Live Transcript {messages.length > 0 && `(${messages.length})`}
              </summary>
              <div className="px-2 pb-3">
                {messages.length === 0 ? (
                  <p className="text-muted-foreground px-2 py-4 text-center text-xs">
                    Transcript will appear as you speak. Hindi → देवनागरी
                  </p>
                ) : (
                  <AgentChatTranscript
                    agentState={agentState}
                    messages={messages}
                    className="max-h-64 [&>div>div]:px-3 [&>div>div]:py-3"
                  />
                )}
              </div>
            </details>
          </div>

          {/* Spacer so content doesn't hide behind control bar */}
          <div className="shrink-0 pb-36 md:pb-32" />
        </div>

        {/* ── Desktop right panel: Activity + Transcript ── */}
        <AnimatePresence initial={false}>
          {(activityOpen || transcriptOpen) && (
            <motion.aside
              key="right-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="hidden shrink-0 flex-col gap-3 overflow-y-auto border-l border-white/5 p-4 md:flex"
            >
              {activityOpen && <AIActivityPanel />}
              {transcriptOpen && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-foreground flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase">
                      <ChatTeardrop size={13} weight="regular" aria-hidden="true" />
                      Live Transcript
                    </h3>
                    <button
                      type="button"
                      onClick={() => setTranscriptOpen(false)}
                      className="text-muted-foreground hover:text-foreground rounded-sm p-0.5 font-mono text-[10px] transition-colors"
                      aria-label="Hide transcript"
                    >
                      <X size={13} weight="bold" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="border-border/40 min-h-[200px] flex-1 overflow-hidden rounded-xl border">
                    {messages.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                        <ChatTeardrop
                          size={28}
                          weight="regular"
                          className="text-muted-foreground/40"
                          aria-hidden="true"
                        />
                        <p className="text-muted-foreground text-xs">
                          Transcript will appear as you speak.
                        </p>
                        <p className="text-muted-foreground/60 text-[11px]">
                          Hindi → देवनागरी · English → Latin
                        </p>
                      </div>
                    ) : (
                      <AgentChatTranscript
                        agentState={agentState}
                        messages={messages}
                        className="h-full [&>div>div]:px-4 [&>div>div]:py-4"
                      />
                    )}
                  </div>
                  <p className="text-muted-foreground/50 text-center text-[10px]">
                    Hindi → देवनागरी · English → Latin
                  </p>
                  <LearningContextPanel userId={userId} />
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ── Fixed bottom control bar ── */}
      <div className="absolute inset-x-0 bottom-0 z-50 px-4 pt-2 pb-4 md:px-12 md:pb-8">
        {/* State sublabel above controls */}
        <p
          className={cn(
            'mb-2 text-center font-mono text-[10px] font-semibold tracking-widest uppercase transition-colors duration-300',
            stateConfig.color
          )}
          aria-hidden="true"
        >
          {stateConfig.sublabel}
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
