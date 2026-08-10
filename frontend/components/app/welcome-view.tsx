'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ArrowCounterClockwise,
  ArrowDown,
  ArrowRight,
  Atom,
  BookOpen,
  Brain,
  CheckCircle,
  Globe,
  GraduationCap,
  Lightning,
  Lock,
  MathOperations,
  Microphone,
  type Icon as PhosphorIcon,
  Question,
  ShieldCheck,
  Trash,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import type { LearnerMemory } from '@/hooks/useLearnerMemory';
import { cn } from '@/lib/shadcn/utils';
import { getUserId } from '@/lib/user-identity';

/* ── Types ── */
type OrbState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'ended';

/* ── Ambient background ── */
function AmbientBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="bg-primary/8 absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full blur-[160px]" />
      <div className="absolute top-1/3 -left-40 h-[400px] w-[400px] rounded-full bg-violet-400/6 blur-[120px]" />
      <div className="absolute top-1/4 -right-40 h-[350px] w-[350px] rounded-full bg-indigo-400/6 blur-[110px]" />
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
    </div>
  );
}

/* ── Educational SVG Illustration (right column) ── */
function EduIllustration() {
  const floatVariants = {
    animate: (i: number) => ({
      y: [0, -8, 0],
      transition: {
        duration: 3 + i * 0.5,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: i * 0.4,
      },
    }),
  };

  const bubbles = [
    {
      icon: '∑',
      color: 'from-violet-500/20 to-violet-600/10',
      border: 'border-violet-400/30',
      text: 'text-violet-300',
      x: '-left-4',
      y: 'top-6',
      delay: 0,
    },
    {
      icon: '⚛',
      color: 'from-cyan-500/20 to-cyan-600/10',
      border: 'border-cyan-400/30',
      text: 'text-cyan-300',
      x: '-right-4',
      y: 'top-10',
      delay: 1,
    },
    {
      icon: '🌍',
      color: 'from-emerald-500/20 to-emerald-600/10',
      border: 'border-emerald-400/30',
      text: 'text-emerald-300',
      x: '-left-6',
      y: 'bottom-12',
      delay: 2,
    },
    {
      icon: '♪',
      color: 'from-amber-500/20 to-amber-600/10',
      border: 'border-amber-400/30',
      text: 'text-amber-300',
      x: '-right-2',
      y: 'bottom-8',
      delay: 3,
    },
  ];

  return (
    <div className="relative flex items-center justify-center" aria-hidden="true">
      {/* Floating subject bubbles */}
      {bubbles.map((b, i) => (
        <motion.div
          key={i}
          custom={b.delay}
          variants={floatVariants}
          animate="animate"
          className={cn(
            'absolute flex h-11 w-11 items-center justify-center rounded-full border bg-gradient-to-br text-lg backdrop-blur-sm',
            b.color,
            b.border,
            b.x,
            b.y
          )}
        >
          <span className={b.text}>{b.icon}</span>
        </motion.div>
      ))}

      {/* Central book SVG */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <div
          className="relative flex h-48 w-48 items-center justify-center rounded-3xl"
          style={{
            background:
              'radial-gradient(circle at 40% 40%, oklch(0.55 0.25 265 / 0.25), oklch(0.35 0.22 280 / 0.15))',
            border: '1px solid oklch(1 0 0 / 0.1)',
            boxShadow: '0 0 60px oklch(0.65 0.22 264 / 0.15), inset 0 1px 0 oklch(1 0 0 / 0.08)',
          }}
        >
          {/* Light rays */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
            <div
              key={i}
              className="absolute h-px w-16 origin-left opacity-10"
              style={{
                background: 'linear-gradient(90deg, oklch(0.75 0.22 264), transparent)',
                transform: `rotate(${deg}deg)`,
                left: '50%',
                top: '50%',
              }}
            />
          ))}
          {/* Book SVG */}
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="relative z-10">
            <path
              d="M40 18C40 18 25 15 12 21V63C25 57 40 60 40 60V18Z"
              fill="white"
              fillOpacity="0.18"
              stroke="white"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M40 18C40 18 55 15 68 21V63C55 57 40 60 40 60V18Z"
              fill="white"
              fillOpacity="0.08"
              stroke="white"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <line
              x1="17"
              y1="30"
              x2="36"
              y2="28"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />
            <line
              x1="17"
              y1="38"
              x2="36"
              y2="36"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />
            <line
              x1="17"
              y1="46"
              x2="36"
              y2="44"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />
            <line
              x1="44"
              y1="28"
              x2="63"
              y2="30"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeOpacity="0.35"
            />
            <line
              x1="44"
              y1="36"
              x2="63"
              y2="38"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeOpacity="0.35"
            />
            <line
              x1="44"
              y1="44"
              x2="63"
              y2="46"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeOpacity="0.35"
            />
            {/* Sparkle */}
            <circle cx="66" cy="17" r="4" fill="white" fillOpacity="0.5" />
            <line
              x1="66"
              y1="9"
              x2="66"
              y2="13"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.5"
            />
            <line
              x1="66"
              y1="21"
              x2="66"
              y2="25"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.5"
            />
            <line
              x1="58"
              y1="17"
              x2="62"
              y2="17"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.5"
            />
            <line
              x1="70"
              y1="17"
              x2="74"
              y2="17"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.5"
            />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Voice Orb (preserved exactly, just smaller variant for welcome) ── */
function VoiceOrb({ state }: { state: OrbState }) {
  const isConnecting = state === 'connecting';
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isEnded = state === 'ended';

  const glowClass = cn('absolute rounded-full transition-all duration-1000', {
    'h-60 w-60 bg-primary/10 blur-[50px] motion-safe:animate-pulse [animation-duration:3s]':
      state === 'idle',
    'h-60 w-60 bg-primary/8 blur-[50px]': isConnecting,
    'h-60 w-60 bg-cyan-400/15 blur-[50px] motion-safe:animate-pulse [animation-duration:0.8s]':
      isListening,
    'h-60 w-60 bg-violet-500/20 blur-[50px] motion-safe:animate-pulse [animation-duration:1s]':
      isSpeaking,
    'h-60 w-60 bg-primary/5 blur-[50px]': isEnded,
  });

  const labelMap: Record<OrbState, string> = {
    idle: 'Ready to learn',
    connecting: 'Connecting...',
    listening: 'Listening...',
    speaking: 'Vidya is speaking...',
    ended: 'Session ended',
  };

  return (
    <div className="relative flex flex-col items-center gap-3">
      <div className={glowClass} aria-hidden="true" />
      <div className="relative flex items-center justify-center" aria-hidden="true">
        {state === 'idle' && (
          <span className="border-primary/15 absolute h-40 w-40 rounded-full border [animation-duration:3s] motion-safe:animate-ping" />
        )}
        {isConnecting && (
          <span className="border-t-primary/60 absolute h-40 w-40 rounded-full border-2 border-transparent [animation-duration:1.2s] motion-safe:animate-spin" />
        )}
        {isListening && (
          <span className="absolute h-40 w-40 rounded-full border border-cyan-400/30 [animation-duration:0.8s] motion-safe:animate-ping" />
        )}
        {isSpeaking && (
          <span className="absolute h-40 w-40 rounded-full border border-violet-500/25 [animation-duration:1s] motion-safe:animate-ping" />
        )}
        <span
          className={cn('absolute h-28 w-28 rounded-full border', {
            'border-primary/10 [animation-duration:4s] motion-safe:animate-pulse': state === 'idle',
            'border-primary/20 [animation-duration:2s] motion-safe:animate-spin': isConnecting,
            'border-cyan-400/20 [animation-duration:0.8s] motion-safe:animate-pulse': isListening,
            'border-violet-500/20 [animation-duration:1s] motion-safe:animate-pulse': isSpeaking,
            'border-primary/5': isEnded,
          })}
        />
        {/* Orb body — 120px */}
        <div
          className={cn(
            'relative flex h-[120px] w-[120px] items-center justify-center rounded-full shadow-2xl transition-all duration-500',
            {
              'shadow-primary/20': state === 'idle' || isConnecting,
              'shadow-cyan-400/20': isListening,
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
          <div
            className={cn('absolute inset-0 rounded-full transition-all duration-500', {
              'bg-primary/15 [animation-duration:2s] motion-safe:animate-pulse': state === 'idle',
              'bg-primary/10': isConnecting,
              'bg-cyan-400/10 [animation-duration:0.8s] motion-safe:animate-pulse': isListening,
              'bg-violet-500/15 [animation-duration:1s] motion-safe:animate-pulse': isSpeaking,
              'bg-primary/5': isEnded,
            })}
          />
          <svg width="40" height="40" viewBox="0 0 48 48" fill="none" className="relative z-10">
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
      <p
        className={cn(
          'text-[10px] font-semibold tracking-widest uppercase transition-colors duration-300',
          {
            'text-primary/70': state === 'idle' || isConnecting,
            'text-cyan-400/80': isListening,
            'text-violet-400/80': isSpeaking,
            'text-muted-foreground': isEnded,
          }
        )}
      >
        {labelMap[state]}
      </p>
    </div>
  );
}

/* ── Feature card ── */
function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group border-foreground/8 bg-background/60 hover:border-primary/30 hover:bg-background/80 flex flex-col gap-1.5 rounded-2xl border p-4 text-left backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <span className="text-primary" aria-hidden="true">
        {icon}
      </span>
      <p className="text-foreground text-sm leading-tight font-semibold">{title}</p>
      <p className="text-muted-foreground text-xs leading-relaxed">{desc}</p>
    </div>
  );
}

/* ── Topic card ── */
interface TopicCardData {
  icon: PhosphorIcon;
  label: string;
  desc: string;
  color: string;
  hoverBg: string;
  hoverBorder: string;
}

const TOPIC_CARDS: TopicCardData[] = [
  {
    icon: MathOperations,
    label: 'Mathematics',
    desc: 'Practice equations',
    color: 'text-violet-400',
    hoverBg: 'hover:bg-violet-400/5',
    hoverBorder: 'hover:border-violet-400/50',
  },
  {
    icon: Atom,
    label: 'Science',
    desc: 'Explore concepts',
    color: 'text-cyan-400',
    hoverBg: 'hover:bg-cyan-400/5',
    hoverBorder: 'hover:border-cyan-400/50',
  },
  {
    icon: BookOpen,
    label: 'English',
    desc: 'Reading & writing',
    color: 'text-emerald-400',
    hoverBg: 'hover:bg-emerald-400/5',
    hoverBorder: 'hover:border-emerald-400/50',
  },
  {
    icon: Globe,
    label: 'History',
    desc: 'Events & people',
    color: 'text-amber-400',
    hoverBg: 'hover:bg-amber-400/5',
    hoverBorder: 'hover:border-amber-400/50',
  },
  {
    icon: Question,
    label: 'Quick Quiz',
    desc: 'Test yourself',
    color: 'text-primary',
    hoverBg: 'hover:bg-primary/5',
    hoverBorder: 'hover:border-primary/50',
  },
  {
    icon: GraduationCap,
    label: 'Exam Prep',
    desc: 'Prepare for exams',
    color: 'text-rose-400',
    hoverBg: 'hover:bg-rose-400/5',
    hoverBorder: 'hover:border-rose-400/50',
  },
];

function TopicCard({
  topic,
  selected,
  onSelect,
}: {
  topic: TopicCardData;
  selected: boolean;
  onSelect: (label: string) => void;
}) {
  const Icon = topic.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(topic.label)}
      className={cn(
        'bg-background/60 flex flex-col gap-1.5 rounded-2xl border p-4 text-left backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md',
        topic.hoverBg,
        topic.hoverBorder,
        selected ? 'border-primary bg-primary/10' : 'border-foreground/8'
      )}
      aria-pressed={selected}
    >
      <Icon size={32} weight="regular" className={topic.color} aria-hidden="true" />
      <p className="text-foreground text-sm leading-tight font-semibold">{topic.label}</p>
      <p className="text-muted-foreground text-xs leading-relaxed">{topic.desc}</p>
    </button>
  );
}

/* ── Prompt chip ── */
function PromptChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="border-foreground/8 bg-foreground/[0.04] text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs">
      <span aria-hidden="true" className="text-primary shrink-0">
        {icon}
      </span>
      {text}
    </span>
  );
}

/* ── Feature badge ── */
function FeatureBadge({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <span className="border-foreground/8 bg-foreground/[0.04] text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium">
      {icon}
      {label}
    </span>
  );
}

/* ── Returning user card ── */
function ReturningUserCard({
  lastTopic,
  onContinue,
}: {
  lastTopic?: string;
  onContinue: (topic?: string) => void;
}) {
  return (
    <div className="border-primary/25 bg-primary/8 shadow-primary/5 mb-6 w-full rounded-2xl border p-5 shadow-lg backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-primary flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
            <CheckCircle size={13} weight="duotone" aria-hidden="true" />
            Continue where you left off
          </p>
          {lastTopic && (
            <p className="text-muted-foreground mt-1 text-sm">
              Last topic: <span className="text-foreground font-semibold">{lastTopic}</span>
            </p>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => onContinue(lastTopic)}
          className="shrink-0 rounded-full font-mono text-xs font-bold tracking-widest uppercase"
          aria-label={`Continue learning from ${lastTopic ?? 'your last session'}`}
        >
          <ArrowRight size={12} weight="bold" aria-hidden="true" />
          Continue
        </Button>
      </div>
    </div>
  );
}

/* ── Props ── */
interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
}

/* ── WelcomeView ── */
export const WelcomeView = ({ startButtonText, onStartCall }: WelcomeViewProps) => {
  const [connecting, setConnecting] = useState(false);
  const [learnerMemory, setLearnerMemory] = useState<LearnerMemory | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Fetch memory on mount
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_MEMORY_API_URL ?? 'http://localhost:8888';
    const userId = getUserId();
    if (!userId || userId === 'server-side') {
      setMemoryLoading(false);
      return;
    }

    let cancelled = false;
    fetch(`${apiBase}/memory/${encodeURIComponent(userId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json() as Promise<LearnerMemory>;
      })
      .then((data) => {
        if (!cancelled) setLearnerMemory(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setMemoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStart = (topic?: string) => {
    if (connecting) return;
    if (topic) {
      try {
        sessionStorage.setItem('vidya_start_topic', topic);
      } catch {
        /* ignore */
      }
    }
    setConnecting(true);
    onStartCall();
  };

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    handleStart(topic);
  };

  const orbState: OrbState = connecting ? 'connecting' : 'idle';
  const isReturningUser = !memoryLoading && learnerMemory?.found === true;
  const learnerName = learnerMemory?.name;
  const lastTopic =
    learnerMemory?.topics && learnerMemory.topics.length > 0
      ? learnerMemory.topics[learnerMemory.topics.length - 1]
      : undefined;

  return (
    <div className="relative min-h-svh w-full overflow-hidden">
      <AmbientBackground />

      {/* ── Hero: above the fold ── */}
      <div className="relative z-10 flex w-full items-center justify-center px-4 py-8 lg:min-h-[calc(100svh-60px)] lg:py-0">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[55fr_45fr] lg:gap-12">
            {/* ── Left column: headline + CTA ── */}
            <div className="order-2 flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
              {/* Badge */}
              <div className="mb-5 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <div
                  className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-widest uppercase"
                  role="status"
                  aria-live="polite"
                >
                  {!connecting && (
                    <span
                      className="bg-primary inline-block h-1.5 w-1.5 rounded-full motion-safe:animate-pulse"
                      aria-hidden="true"
                    />
                  )}
                  {connecting ? 'Connecting to Vidya...' : 'VIDYA · AI Learning Assistant'}
                </div>
                {!connecting && (
                  <Link href="/memory">
                    <span className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-widest uppercase transition-colors duration-150">
                      <Brain size={11} weight="duotone" aria-hidden="true" /> Memory: Your choice
                    </span>
                  </Link>
                )}
              </div>

              {/* H1 */}
              <h1 className="text-foreground mb-4 text-5xl leading-[1.1] font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
                {connecting ? (
                  <>
                    Getting your
                    <br />
                    <span className="text-primary">session ready...</span>
                  </>
                ) : isReturningUser && learnerName ? (
                  <>
                    Welcome back,
                    <br />
                    <span className="text-primary">{learnerName}</span>
                  </>
                ) : (
                  <>
                    Learn, Practice &amp; Improve —<br />
                    <span className="text-primary">through voice.</span>
                  </>
                )}
              </h1>

              {/* Description */}
              {!connecting && (
                <p className="text-muted-foreground mb-3 max-w-md text-base leading-relaxed">
                  {isReturningUser
                    ? 'Great to see you again. Pick up where you left off or explore something new.'
                    : 'Vidya is your AI voice tutor. Ask questions, practice exercises, and revise topics in Hindi, English, or both.'}
                </p>
              )}

              {/* Language line */}
              {!connecting && (
                <p className="text-muted-foreground mb-6 text-sm font-medium tracking-wide">
                  हिंदी · English · Code-mixing supported
                </p>
              )}

              {/* Returning user card */}
              {!connecting && isReturningUser && (
                <ReturningUserCard lastTopic={lastTopic} onContinue={handleStart} />
              )}

              {/* Primary CTA */}
              <Button
                size="lg"
                onClick={() => handleStart()}
                disabled={connecting}
                aria-label={
                  connecting
                    ? 'Connecting to Vidya, please wait'
                    : 'Start your learning session with Vidya'
                }
                className="shadow-primary/25 hover:shadow-primary/40 mb-3 w-56 rounded-full font-mono text-xs font-bold tracking-widest uppercase shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-wait disabled:opacity-70 disabled:hover:scale-100"
                style={{
                  background: connecting
                    ? undefined
                    : 'linear-gradient(135deg, oklch(0.60 0.24 264), oklch(0.50 0.28 285))',
                }}
              >
                {connecting ? (
                  <>
                    <span
                      className="mr-2 inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
                      aria-hidden="true"
                    />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Microphone size={14} weight="bold" aria-hidden="true" />
                    {startButtonText}
                  </>
                )}
              </Button>

              {/* Secondary action */}
              {!connecting && (
                <a
                  href="#how-it-works"
                  className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1 text-sm transition-colors duration-150"
                >
                  How it works <ArrowDown size={13} weight="bold" aria-hidden="true" />
                </a>
              )}

              {/* Microcopy */}
              {!connecting && (
                <p className="text-muted-foreground mb-8 text-[11px]">No typing. Just speak.</p>
              )}

              {/* Feature cards */}
              {!connecting && (
                <div
                  id="how-it-works"
                  className="mb-6 grid w-full grid-cols-2 gap-2 sm:grid-cols-4"
                >
                  <FeatureCard
                    icon={<Lightning size={18} weight="bold" />}
                    title="Understand"
                    desc="Break difficult concepts into simple explanations"
                  />
                  <FeatureCard
                    icon={<Question size={18} weight="bold" />}
                    title="Practice"
                    desc="Answer questions and receive hints"
                  />
                  <FeatureCard
                    icon={<ArrowCounterClockwise size={18} weight="bold" />}
                    title="Revise"
                    desc="Review concepts through conversation"
                  />
                  <FeatureCard
                    icon={<Globe size={18} weight="bold" />}
                    title="Learn Naturally"
                    desc="Use Hindi, English, or Hinglish"
                  />
                </div>
              )}

              {/* Prompt chips */}
              {!connecting && (
                <div className="mb-8 flex flex-col items-center gap-3 lg:items-start">
                  <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    Try asking Vidya
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                    <PromptChip
                      icon={<Atom size={12} weight="regular" />}
                      text="Explain photosynthesis simply."
                    />
                    <PromptChip
                      icon={<MathOperations size={12} weight="regular" />}
                      text="Quiz me on algebra."
                    />
                    <PromptChip
                      icon={<ArrowCounterClockwise size={12} weight="regular" />}
                      text="Help me revise physics."
                    />
                    <PromptChip
                      icon={<Globe size={12} weight="regular" />}
                      text="Mujhe quadratic equations samjhao."
                    />
                  </div>
                </div>
              )}

              {/* Topic cards */}
              {!connecting && (
                <div id="learning" className="mb-8 flex flex-col items-center gap-3 lg:items-start">
                  <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    What would you like to practice?
                  </p>
                  <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
                    {TOPIC_CARDS.map((topic) => (
                      <TopicCard
                        key={topic.label}
                        topic={topic}
                        selected={selectedTopic === topic.label}
                        onSelect={handleTopicSelect}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Privacy section */}
              {!connecting && (
                <div
                  className="border-foreground/8 bg-background/60 mb-6 w-full rounded-2xl border p-5 backdrop-blur-sm"
                  id="privacy"
                >
                  <p className="text-foreground mb-3 flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                    <Lock size={13} weight="duotone" className="text-primary" aria-hidden="true" />
                    Privacy &amp; Memory
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    <li className="text-muted-foreground flex items-start gap-2 text-xs">
                      <Brain
                        size={14}
                        weight="duotone"
                        className="text-primary mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>
                        <strong className="text-foreground font-semibold">Optional Memory</strong> —
                        Save learning progress only with your permission.
                      </span>
                    </li>
                    <li className="text-muted-foreground flex items-start gap-2 text-xs">
                      <ShieldCheck
                        size={14}
                        weight="duotone"
                        className="text-primary mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>
                        <strong className="text-foreground font-semibold">Private by design</strong>{' '}
                        — Your data stays yours. No tracking, no selling.
                      </span>
                    </li>
                    <li className="text-muted-foreground flex items-start gap-2 text-xs">
                      <Trash
                        size={14}
                        weight="regular"
                        className="text-primary mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>
                        <strong className="text-foreground font-semibold">Forget anytime</strong> —
                        Delete everything Vidya knows about you in one tap.
                      </span>
                    </li>
                  </ul>
                </div>
              )}

              {/* Feature badges */}
              {!connecting && (
                <div className="mb-6 flex flex-wrap justify-center gap-2 lg:justify-start">
                  <FeatureBadge
                    icon={<Globe size={12} weight="regular" aria-hidden="true" />}
                    label="हिंदी + English"
                  />
                  <FeatureBadge
                    icon={<Microphone size={12} weight="regular" aria-hidden="true" />}
                    label="Voice-first"
                  />
                  <FeatureBadge
                    icon={<Brain size={12} weight="duotone" aria-hidden="true" />}
                    label="Optional Memory"
                  />
                  <FeatureBadge
                    icon={<Lock size={12} weight="duotone" aria-hidden="true" />}
                    label="Privacy-focused"
                  />
                </div>
              )}

              <span id="languages" className="sr-only">
                Supported languages: Hindi, English, Hinglish
              </span>
            </div>

            {/* ── Right column: illustration + orb ── */}
            <div className="order-1 flex flex-col items-center justify-center gap-8 lg:order-2">
              <EduIllustration />
              <VoiceOrb state={orbState} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 flex w-full items-center justify-center">
        <p className="text-muted-foreground text-[11px]">
          Powered by{' '}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://murf.ai"
            className="underline underline-offset-2 hover:opacity-80"
          >
            Murf Falcon TTS
          </a>
          {' · '}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://livekit.io/agents"
            className="underline underline-offset-2 hover:opacity-80"
          >
            LiveKit Agents
          </a>
        </p>
      </div>
    </div>
  );
};
