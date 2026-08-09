'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowCounterClockwise,
  ArrowRight,
  Atom,
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
      {/* Top center glow */}
      <div className="bg-primary/8 absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full blur-[160px]" />
      {/* Left glow */}
      <div className="absolute top-1/3 -left-40 h-[400px] w-[400px] rounded-full bg-violet-400/6 blur-[120px]" />
      {/* Right glow */}
      <div className="absolute top-1/4 -right-40 h-[350px] w-[350px] rounded-full bg-indigo-400/6 blur-[110px]" />
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  );
}

/* ── Voice Orb ── */
function VoiceOrb({ state }: { state: OrbState }) {
  const isConnecting = state === 'connecting';
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isEnded = state === 'ended';

  /* Outer glow color by state */
  const glowClass = cn('absolute rounded-full transition-all duration-1000', {
    'h-72 w-72 bg-primary/10 blur-[60px] motion-safe:animate-pulse [animation-duration:3s]':
      state === 'idle',
    'h-72 w-72 bg-primary/8 blur-[60px]': isConnecting,
    'h-72 w-72 bg-cyan-400/15 blur-[60px] motion-safe:animate-pulse [animation-duration:0.8s]':
      isListening,
    'h-72 w-72 bg-violet-500/20 blur-[60px] motion-safe:animate-pulse [animation-duration:1s]':
      isSpeaking,
    'h-72 w-72 bg-primary/5 blur-[60px]': isEnded,
  });

  /* State label */
  const labelMap: Record<OrbState, string> = {
    idle: 'Ready to learn',
    connecting: 'Connecting to Vidya...',
    listening: 'Listening to you...',
    speaking: 'Vidya is speaking...',
    ended: 'Session ended',
  };

  return (
    <div className="relative flex flex-col items-center gap-4">
      {/* Outer ambient glow */}
      <div className={glowClass} aria-hidden="true" />

      {/* Orb rings + body */}
      <div className="relative flex items-center justify-center" aria-hidden="true">
        {/* Outer animated ring — varies by state */}
        {state === 'idle' && (
          <span className="border-primary/15 absolute h-52 w-52 rounded-full border [animation-duration:3s] motion-safe:animate-ping" />
        )}
        {isConnecting && (
          <span className="border-t-primary/60 absolute h-52 w-52 rounded-full border-2 border-transparent [animation-duration:1.2s] motion-safe:animate-spin" />
        )}
        {isListening && (
          <span className="absolute h-52 w-52 rounded-full border border-cyan-400/30 [animation-duration:0.8s] motion-safe:animate-ping" />
        )}
        {isSpeaking && (
          <span className="absolute h-52 w-52 rounded-full border border-violet-500/25 [animation-duration:1s] motion-safe:animate-ping" />
        )}
        {isEnded && <span className="border-primary/8 absolute h-52 w-52 rounded-full border" />}

        {/* Mid ring */}
        <span
          className={cn('absolute h-40 w-40 rounded-full border', {
            'border-primary/10 [animation-duration:4s] motion-safe:animate-pulse': state === 'idle',
            'border-primary/20 [animation-duration:2s] motion-safe:animate-spin': isConnecting,
            'border-cyan-400/20 [animation-duration:0.8s] motion-safe:animate-pulse': isListening,
            'border-violet-500/20 [animation-duration:1s] motion-safe:animate-pulse': isSpeaking,
            'border-primary/5': isEnded,
          })}
        />

        {/* Orb body — 120px mobile / 160px desktop, always indigo gradient */}
        <div
          className={cn(
            'relative flex h-32 w-32 items-center justify-center rounded-full shadow-2xl transition-all duration-500 lg:h-40 lg:w-40',
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
          {/* Inner glow overlay */}
          <div
            className={cn('absolute inset-0 rounded-full transition-all duration-500', {
              'bg-primary/15 [animation-duration:2s] motion-safe:animate-pulse': state === 'idle',
              'bg-primary/10': isConnecting,
              'bg-cyan-400/10 [animation-duration:0.8s] motion-safe:animate-pulse': isListening,
              'bg-violet-500/15 [animation-duration:1s] motion-safe:animate-pulse': isSpeaking,
              'bg-primary/5': isEnded,
            })}
          />

          {/* Book + sparkle icon */}
          <svg
            width="52"
            height="52"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="relative z-10 text-white"
          >
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

      {/* State label — visible text, not aria-hidden */}
      <p
        className={cn(
          'text-xs font-semibold tracking-widest uppercase transition-colors duration-300',
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

/* ── Topic card (full card with SVG icon, replaces flat chip) ── */
interface TopicCardData {
  icon: PhosphorIcon;
  label: string;
  desc: string;
  color: string;
}

const TOPIC_CARDS: TopicCardData[] = [
  {
    icon: MathOperations,
    label: 'Mathematics',
    desc: 'Practice equations',
    color: 'text-violet-400',
  },
  { icon: Atom, label: 'Science', desc: 'Explore concepts', color: 'text-cyan-400' },
  {
    icon: MathOperations,
    label: 'Fractions',
    desc: 'Practice fractions',
    color: 'text-emerald-400',
  },
  { icon: Question, label: 'Quick Quiz', desc: 'Test your knowledge', color: 'text-primary' },
  { icon: ArrowCounterClockwise, label: 'Revision', desc: 'Review topics', color: 'text-sky-400' },
  {
    icon: GraduationCap,
    label: 'Exam Practice',
    desc: 'Prepare for exams',
    color: 'text-amber-400',
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
      className={`bg-background/60 flex flex-col gap-1.5 rounded-2xl border p-4 text-left backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        selected
          ? 'border-primary bg-primary/10'
          : 'border-foreground/8 hover:border-primary/40 hover:bg-primary/5'
      }`}
      aria-pressed={selected}
    >
      <Icon size={28} weight="regular" className={topic.color} aria-hidden="true" />
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
    <div className="border-primary/20 bg-primary/5 mb-6 w-full rounded-2xl border p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-primary/70 flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
            <CheckCircle size={13} weight="duotone" aria-hidden="true" />
            Continue where you left off
          </p>
          {lastTopic && (
            <p className="text-muted-foreground text-sm">
              Last topic: <span className="text-foreground font-medium">{lastTopic}</span>
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

  // ── Task 15.1: Fetch memory on mount ─────────────────────────────────────
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
      .catch(() => {
        // Silently ignore memory errors on the welcome view — show default hero
      })
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
        // ignore storage errors
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

  // ── Task 15.2: Memory-aware headline ─────────────────────────────────────
  const isReturningUser = !memoryLoading && learnerMemory?.found === true;
  const learnerName = learnerMemory?.name;
  const lastTopic =
    learnerMemory?.topics && learnerMemory.topics.length > 0
      ? learnerMemory.topics[learnerMemory.topics.length - 1]
      : undefined;

  return (
    <div className="relative min-h-svh w-full overflow-hidden">
      <AmbientBackground />

      {/* Main content */}
      <div className="relative z-10 flex w-full items-center justify-center px-4 py-8 lg:min-h-[calc(100svh-57px)] lg:py-0">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[55fr_45fr] lg:gap-8">
            {/* ── Left column: text + CTA ── */}
            <div className="order-1 flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
              {/* Badge — Task 15.6: Memory badge */}
              <div className="mb-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <div
                  className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-widest uppercase transition-colors duration-300"
                  role="status"
                  aria-live="polite"
                >
                  {!connecting && (
                    <span
                      className="bg-primary inline-block h-1.5 w-1.5 rounded-full motion-safe:animate-pulse"
                      aria-hidden="true"
                    />
                  )}
                  {connecting ? 'Connecting to Vidya...' : 'AI Voice Learning Assistant'}
                </div>

                {/* Memory badge linking to /memory */}
                {!connecting && (
                  <Link href="/memory">
                    <span className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-widest uppercase transition-colors duration-150">
                      <Brain size={11} weight="duotone" aria-hidden="true" /> Memory: Your choice
                    </span>
                  </Link>
                )}
              </div>

              {/* Headline — Task 15.2 & 15.3 */}
              <h1 className="text-foreground mb-4 text-5xl leading-[1.1] font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
                {connecting ? (
                  <>
                    Getting your
                    <br />
                    <span className="text-primary">session ready...</span>
                  </>
                ) : isReturningUser && learnerName ? (
                  /* Task 15.2: Returning user headline */
                  <>
                    Welcome back,
                    <br />
                    <span className="text-primary">{learnerName}</span>
                  </>
                ) : (
                  /* Task 15.3: Day 4 hero headline */
                  <>
                    Learning that
                    <br />
                    <span className="text-primary">remembers you.</span>
                  </>
                )}
              </h1>

              {/* Description — Day 4 copy or returning user copy */}
              {!connecting && (
                <p className="text-muted-foreground mb-2 max-w-md text-base leading-relaxed">
                  {isReturningUser
                    ? 'Great to see you again. Pick up where you left off or explore something new.'
                    : 'Vidya remembers the learning preferences and topics you choose to save, so every conversation can pick up where you left off.'}
                </p>
              )}

              {/* Language line (hidden when connecting) */}
              {!connecting && (
                <p className="text-muted-foreground mb-2 text-sm font-medium tracking-wide">
                  हिंदी · English · Natural Code-Mixing
                </p>
              )}

              {/* Hindi tagline (hidden when connecting) */}
              {!connecting && (
                <p className="text-muted-foreground mb-6 text-sm font-medium" lang="hi">
                  बोलकर सीखें — Hindi, English, या दोनों।
                </p>
              )}

              {/* Task 15.2: Returning user "Continue where you left off" card */}
              {!connecting && isReturningUser && (
                <ReturningUserCard lastTopic={lastTopic} onContinue={handleStart} />
              )}

              {/* CTA Button */}
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

              {/* Microcopy (hidden when connecting) */}
              {!connecting && (
                <p className="text-muted-foreground mb-10 text-[11px]">No typing. Just speak.</p>
              )}

              {/* Feature cards (hidden when connecting) */}
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

              {/* Prompt chips (hidden when connecting) */}
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

              {/* Topic cards — "What would you like to practice?" */}
              {!connecting && (
                <div className="mb-8 flex flex-col items-center gap-3 lg:items-start">
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
                  className="border-foreground/8 bg-background/60 mb-6 w-full rounded-2xl border p-4 backdrop-blur-sm"
                  id="privacy"
                >
                  <p className="text-foreground mb-3 flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                    <Lock size={13} weight="duotone" className="text-primary" aria-hidden="true" />
                    Privacy &amp; Memory
                  </p>
                  <ul className="flex flex-col gap-2">
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

              {/* Task 15.7: Four feature badges */}
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

              {/* Language section anchor */}
              <span id="languages" className="sr-only">
                Supported languages: Hindi, English, Hinglish
              </span>
            </div>

            {/* ── Right column: Voice orb ── */}
            <div className="order-2 flex items-center justify-center lg:order-2">
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
          </a>{' '}
          ·{' '}
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
