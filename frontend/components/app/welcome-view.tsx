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
  Database,
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
import { CallSchedulePanel } from '@/components/app/call-schedule-panel';
import { StudentDashboard } from '@/components/app/student-dashboard';
import { TeacherSupportPanel } from '@/components/app/teacher-support-panel';
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
      {/* Primary top glow */}
      <div className="bg-primary/10 absolute -top-40 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full blur-[180px]" />
      {/* Violet side bloom */}
      <div className="absolute top-1/3 -left-40 h-[500px] w-[500px] rounded-full bg-violet-400/8 blur-[140px]" />
      {/* Indigo side bloom */}
      <div className="absolute top-1/4 -right-40 h-[450px] w-[450px] rounded-full bg-indigo-400/7 blur-[130px]" />
      {/* Bottom cyan accent */}
      <div className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-400/5 blur-[100px]" />
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.022]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
    </div>
  );
}

/* ── Vidya Knowledge Orb (premium hero visual, right column) ── */
function VidyaKnowledgeOrb() {
  const subjectNodes = [
    {
      Icon: MathOperations,
      color: 'from-violet-500/25 to-violet-600/10',
      border: 'border-violet-400/35',
      text: 'text-violet-300',
      angle: 0,
      r: 108,
    },
    {
      Icon: Atom,
      color: 'from-cyan-500/25 to-cyan-600/10',
      border: 'border-cyan-400/35',
      text: 'text-cyan-300',
      angle: 90,
      r: 108,
    },
    {
      Icon: Globe,
      color: 'from-emerald-500/25 to-emerald-600/10',
      border: 'border-emerald-400/35',
      text: 'text-emerald-300',
      angle: 180,
      r: 108,
    },
    {
      Icon: BookOpen,
      color: 'from-amber-500/25 to-amber-600/10',
      border: 'border-amber-400/35',
      text: 'text-amber-300',
      angle: 270,
      r: 108,
    },
  ];

  return (
    <div
      className="relative flex items-center justify-center"
      aria-hidden="true"
      style={{ width: 260, height: 260 }}
    >
      {/* Outermost ambient glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, oklch(0.65 0.22 264 / 0.12) 0%, transparent 70%)',
        }}
      />

      {/* Ring 3 — outermost, very slow breathe */}
      <div
        className="border-primary/8 absolute rounded-full border"
        style={{
          width: 244,
          height: 244,
          animation: 'vidya-ring-breathe-slow 5s ease-in-out infinite',
        }}
      />

      {/* Ring 2 */}
      <div
        className="border-primary/12 absolute rounded-full border"
        style={{
          width: 196,
          height: 196,
          animation: 'vidya-ring-breathe 3.5s ease-in-out infinite',
        }}
      />

      {/* Ring 1 — inner */}
      <div
        className="border-primary/18 absolute rounded-full border"
        style={{
          width: 152,
          height: 152,
          animation: 'vidya-ring-breathe 2.5s ease-in-out infinite 0.5s',
        }}
      />

      {/* Orbiting subject nodes */}
      {subjectNodes.map((node, i) => {
        const rad = (node.angle * Math.PI) / 180;
        const x = Math.cos(rad) * node.r * 0.5;
        const y = Math.sin(rad) * node.r * 0.5;
        return (
          <motion.div
            key={i}
            animate={{ y: [0, -7, 0] }}
            transition={{
              duration: 2.8 + i * 0.6,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.5,
            }}
            className={`absolute flex h-10 w-10 items-center justify-center rounded-full border bg-gradient-to-br backdrop-blur-sm ${node.color} ${node.border}`}
            style={{ transform: `translate(${x}px, ${y}px)` }}
          >
            <node.Icon size={18} weight="duotone" className={node.text} />
          </motion.div>
        );
      })}

      {/* Central orb body */}
      <div
        className="vidya-orb-idle relative z-10 flex h-28 w-28 items-center justify-center rounded-full"
        style={{
          background:
            'radial-gradient(circle at 38% 32%, oklch(0.72 0.24 264), oklch(0.40 0.28 282))',
          border: '1px solid oklch(1 0 0 / 16%)',
        }}
      >
        {/* Inner highlight */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 25%, oklch(1 0 0 / 0.12), transparent 60%)',
          }}
        />
        {/* Book SVG */}
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="relative z-10">
          <path
            d="M24 11C24 11 15 9 7 13V38C15 34 24 36 24 36V11Z"
            fill="white"
            fillOpacity="0.28"
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
            strokeOpacity="0.75"
          />
          <line
            x1="11"
            y1="23"
            x2="21"
            y2="21.5"
            stroke="white"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />
          <line
            x1="11"
            y1="28"
            x2="21"
            y2="26.5"
            stroke="white"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />
          {/* AI arc + node */}
          <path
            d="M30 8 Q36 5 41 9"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
            strokeOpacity="0.9"
          />
          <circle cx="41" cy="9" r="2.5" fill="white" fillOpacity="0.9" />
        </svg>
      </div>
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
    <div className="group bg-background/50 hover:border-primary/30 hover:bg-background/70 flex flex-col gap-2 rounded-2xl border border-white/8 p-4 text-left backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <span
        className="bg-primary/10 text-primary group-hover:bg-primary/15 inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
        aria-hidden="true"
      >
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

/* ── How It Works step ── */
function HowItWorksStep({
  number,
  title,
  desc,
  color,
}: {
  number: string;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-black ${color}`}
        aria-hidden="true"
      >
        {number}
      </div>
      <p className="text-foreground text-sm font-bold">{title}</p>
      <p className="text-muted-foreground text-xs leading-relaxed">{desc}</p>
    </div>
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
    <div id="home" className="relative min-h-screen w-full overflow-hidden pt-16">
      <AmbientBackground />

      {/* ── Hero: above the fold ── */}
      <div className="relative z-10 flex w-full items-center justify-center px-4 py-8 lg:min-h-[calc(100vh-60px)] lg:py-10">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[55fr_45fr] lg:gap-12">
            {/* ── Left column: headline + CTA ── */}
            <div className="order-2 flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
              {/* VIDYA wordmark — always visible */}
              <div className="mb-4 flex flex-col items-center gap-1 lg:items-start">
                <h1
                  className="text-primary text-5xl font-black tracking-[0.15em] sm:text-6xl lg:text-7xl"
                  style={{
                    background:
                      'linear-gradient(135deg, oklch(0.70 0.24 264), oklch(0.55 0.28 285))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  VIDYA
                </h1>
                {/* Subtitle, tagline, and body — shown when not connecting */}
                {!connecting && (
                  <>
                    <p className="text-foreground/90 text-lg font-semibold tracking-tight sm:text-xl">
                      Your Personal AI Learning Companion
                    </p>
                    <p className="text-primary/80 text-sm font-medium tracking-widest uppercase">
                      Learn • Practice • Improve
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Voice-based learning in Hindi and English
                    </p>
                  </>
                )}
              </div>

              {/* Badge */}
              <div className="mb-5 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <div
                  className="bg-primary/12 text-primary inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-bold tracking-widest uppercase"
                  role="status"
                  aria-live="polite"
                >
                  {!connecting && (
                    <span
                      className="bg-primary inline-block h-1.5 w-1.5 rounded-full motion-safe:animate-pulse"
                      aria-hidden="true"
                    />
                  )}
                  {connecting ? 'Connecting to Vidya...' : 'Voice-First Learning Companion'}
                </div>
                {!connecting && (
                  <Link href="/memory">
                    <span className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-widest uppercase transition-colors duration-150">
                      <Brain size={11} weight="duotone" aria-hidden="true" /> Memory: Your choice
                    </span>
                  </Link>
                )}
              </div>

              {/* Hero headline — 3-line premium */}
              {!connecting && (
                <div className="mb-4">
                  <h1
                    className="mb-2 text-4xl leading-[1.1] font-black tracking-tight sm:text-5xl lg:text-6xl"
                    style={{
                      background:
                        'linear-gradient(135deg, oklch(0.92 0.03 265), oklch(0.72 0.24 264) 40%, oklch(0.55 0.28 285))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Learn smarter.
                    <br />
                    Speak naturally.
                    <br />
                    Grow with Vidya.
                  </h1>
                  <p className="text-muted-foreground text-base leading-relaxed">
                    Understand concepts, practice questions, and revise through natural voice
                    conversations — in the language you&apos;re comfortable with.
                  </p>
                </div>
              )}

              {/* VIDYA wordmark during connecting */}
              {connecting && (
                <h1
                  className="text-primary mb-4 text-6xl font-black tracking-[0.15em] sm:text-7xl lg:text-8xl"
                  style={{
                    background:
                      'linear-gradient(135deg, oklch(0.70 0.24 264), oklch(0.55 0.28 285))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  VIDYA
                </h1>
              )}

              {/* Dynamic greeting (returning user) */}
              {!connecting && isReturningUser && learnerName && (
                <p className="text-foreground mb-3 text-2xl font-extrabold tracking-tight">
                  Welcome back, <span className="text-primary">{learnerName}</span>
                </p>
              )}

              {/* Description */}
              {!connecting && (
                <p className="text-muted-foreground mb-3 max-w-md text-base leading-relaxed">
                  {isReturningUser
                    ? 'Great to see you again. Pick up where you left off or explore something new.'
                    : 'Ask questions, practice exercises, and revise topics — just speak.'}
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

              {/* Student dashboard — shown below returning user card, above CTA */}
              {!connecting && (
                <div className="mb-6 w-full">
                  <StudentDashboard />
                </div>
              )}

              {/* Trust indicators */}
              {!connecting && (
                <ul
                  className="mb-5 flex flex-col items-center gap-1.5 lg:items-start"
                  aria-label="Key features"
                >
                  {[
                    'Voice-first — no typing needed',
                    'हिंदी + English — code-mixed support',
                    'Memory with your permission only',
                    'Human teacher support when needed',
                  ].map((item) => (
                    <li
                      key={item}
                      className="text-muted-foreground flex items-center gap-2 text-xs"
                    >
                      <CheckCircle
                        size={13}
                        weight="fill"
                        className="text-primary shrink-0"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
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

              {/* How It Works section */}
              {!connecting && (
                <section
                  id="how-it-works"
                  className="mb-8 w-full"
                  aria-labelledby="how-it-works-heading"
                >
                  <p
                    id="how-it-works-heading"
                    className="text-muted-foreground mb-4 text-center text-xs font-bold tracking-widest uppercase lg:text-left"
                  >
                    How It Works
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <HowItWorksStep
                      number="01"
                      title="Talk"
                      desc="Speak naturally with Vidya in Hindi or English"
                      color="border-primary/40 bg-primary/10 text-primary"
                    />
                    <HowItWorksStep
                      number="02"
                      title="Learn"
                      desc="Get clear explanations and examples instantly"
                      color="border-cyan-400/40 bg-cyan-400/10 text-cyan-400"
                    />
                    <HowItWorksStep
                      number="03"
                      title="Remember"
                      desc="Vidya saves your progress with your permission"
                      color="border-violet-400/40 bg-violet-400/10 text-violet-400"
                    />
                    <HowItWorksStep
                      number="04"
                      title="Improve"
                      desc="Practice again or request human teacher support"
                      color="border-emerald-400/40 bg-emerald-400/10 text-emerald-400"
                    />
                  </div>
                </section>
              )}

              {/* Feature cards */}
              {!connecting && (
                <div className="mb-6 grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
                  <FeatureCard
                    icon={<Lightning size={16} weight="bold" />}
                    title="Understand"
                    desc="Break difficult concepts into simple explanations"
                  />
                  <FeatureCard
                    icon={<Question size={16} weight="bold" />}
                    title="Practice"
                    desc="Answer questions and receive hints"
                  />
                  <FeatureCard
                    icon={<ArrowCounterClockwise size={16} weight="bold" />}
                    title="Revise"
                    desc="Review concepts through conversation"
                  />
                  <FeatureCard
                    icon={<Globe size={16} weight="bold" />}
                    title="Multilingual"
                    desc="Hindi, English, or Hinglish — your choice"
                  />
                </div>
              )}

              {/* Features section */}
              {!connecting && (
                <section
                  id="features"
                  className="mb-8 flex w-full flex-col items-center gap-3 lg:items-start"
                  aria-labelledby="features-heading"
                >
                  <p
                    id="features-heading"
                    className="text-muted-foreground text-xs font-medium tracking-wider uppercase"
                  >
                    Features
                  </p>
                  <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <FeatureCard
                      icon={<Brain size={18} weight="duotone" />}
                      title="Personalized Learning"
                      desc="Adapts to your level and topics"
                    />
                    <FeatureCard
                      icon={<Database size={18} weight="duotone" />}
                      title="AI Memory"
                      desc="Remembers your progress across sessions"
                    />
                    <FeatureCard
                      icon={<Globe size={18} weight="duotone" />}
                      title="Hindi + English Support"
                      desc="Learn in Hindi, English, or Hinglish"
                    />
                    <FeatureCard
                      icon={<Microphone size={18} weight="duotone" />}
                      title="Voice Conversations"
                      desc="Just speak — no typing needed"
                    />
                    <FeatureCard
                      icon={<ShieldCheck size={18} weight="duotone" />}
                      title="Privacy First"
                      desc="Your data stays yours, always"
                    />
                  </div>
                </section>
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
                      text="मुझे quadratic equations समझाओ।"
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

              {/* Privacy section — 4-card grid */}
              {!connecting && (
                <section className="mb-6 w-full" id="privacy" aria-labelledby="privacy-heading">
                  <p
                    id="privacy-heading"
                    className="text-foreground mb-3 flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase"
                  >
                    <Lock size={13} weight="duotone" className="text-primary" aria-hidden="true" />
                    Your learning stays in your control.
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="bg-background/50 flex items-start gap-3 rounded-2xl border border-white/8 p-4 backdrop-blur-sm">
                      <Brain
                        size={18}
                        weight="duotone"
                        className="text-primary mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-foreground mb-0.5 text-xs font-bold">
                          Permission-Based Memory
                        </p>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Vidya only remembers useful learning information with your permission.
                        </p>
                      </div>
                    </div>
                    <div className="bg-background/50 flex items-start gap-3 rounded-2xl border border-white/8 p-4 backdrop-blur-sm">
                      <ShieldCheck
                        size={18}
                        weight="duotone"
                        className="text-primary mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-foreground mb-0.5 text-xs font-bold">
                          Private Learning Data
                        </p>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Your learning information is handled through secure local storage.
                        </p>
                      </div>
                    </div>
                    <div className="bg-background/50 flex items-start gap-3 rounded-2xl border border-white/8 p-4 backdrop-blur-sm">
                      <Trash
                        size={18}
                        weight="regular"
                        className="text-primary mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-foreground mb-0.5 text-xs font-bold">Forget Me</p>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Ask Vidya to forget your saved information at any time.
                        </p>
                      </div>
                    </div>
                    <div className="bg-background/50 flex items-start gap-3 rounded-2xl border border-white/8 p-4 backdrop-blur-sm">
                      <GraduationCap
                        size={18}
                        weight="duotone"
                        className="text-primary mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-foreground mb-0.5 text-xs font-bold">Human Support</p>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Teacher-support requests require your explicit permission before anything
                          is shared.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
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

            {/* ── Right column: knowledge orb + schedule ── */}
            <div className="order-1 flex flex-col items-center justify-center gap-8 lg:order-2">
              <VidyaKnowledgeOrb />
              <VoiceOrb state={orbState} />
              {/* Call schedule panel — visible right on the homepage */}
              {!connecting && (
                <div className="flex w-full max-w-sm flex-col gap-6" id="schedule">
                  <CallSchedulePanel />
                  <TeacherSupportPanel />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/5 py-8 text-center backdrop-blur-sm">
        <p className="text-muted-foreground text-xs">
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
          {' · '}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://deepgram.com"
            className="underline underline-offset-2 hover:opacity-80"
          >
            Deepgram Nova-3
          </a>
        </p>
      </footer>

      {/* ── About section (anchor for nav) ── */}
      <section id="about" aria-label="About" />
    </div>
  );
};
