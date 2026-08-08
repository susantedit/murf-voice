'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';

/* ── Types ── */
type OrbState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'ended';

/* ── Ambient background ── */
function AmbientBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Top center glow */}
      <div className="absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-primary/8 blur-[160px]" />
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
  const glowClass = cn(
    'absolute rounded-full transition-all duration-1000',
    {
      'h-72 w-72 bg-primary/10 blur-[60px] motion-safe:animate-pulse [animation-duration:3s]': state === 'idle',
      'h-72 w-72 bg-primary/8 blur-[60px]': isConnecting,
      'h-72 w-72 bg-cyan-400/15 blur-[60px] motion-safe:animate-pulse [animation-duration:0.8s]': isListening,
      'h-72 w-72 bg-violet-500/20 blur-[60px] motion-safe:animate-pulse [animation-duration:1s]': isSpeaking,
      'h-72 w-72 bg-primary/5 blur-[60px]': isEnded,
    }
  );

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
      <div
        className="relative flex items-center justify-center"
        aria-hidden="true"
      >
        {/* Outer animated ring — varies by state */}
        {state === 'idle' && (
          <span className="absolute h-52 w-52 rounded-full border border-primary/15 motion-safe:animate-ping [animation-duration:3s]" />
        )}
        {isConnecting && (
          <span className="absolute h-52 w-52 rounded-full border-2 border-transparent border-t-primary/60 motion-safe:animate-spin [animation-duration:1.2s]" />
        )}
        {isListening && (
          <span className="absolute h-52 w-52 rounded-full border border-cyan-400/30 motion-safe:animate-ping [animation-duration:0.8s]" />
        )}
        {isSpeaking && (
          <span className="absolute h-52 w-52 rounded-full border border-violet-500/25 motion-safe:animate-ping [animation-duration:1s]" />
        )}
        {isEnded && (
          <span className="absolute h-52 w-52 rounded-full border border-primary/8" />
        )}

        {/* Mid ring */}
        <span
          className={cn(
            'absolute h-40 w-40 rounded-full border',
            {
              'border-primary/10 motion-safe:animate-pulse [animation-duration:4s]': state === 'idle',
              'border-primary/20 motion-safe:animate-spin [animation-duration:2s]': isConnecting,
              'border-cyan-400/20 motion-safe:animate-pulse [animation-duration:0.8s]': isListening,
              'border-violet-500/20 motion-safe:animate-pulse [animation-duration:1s]': isSpeaking,
              'border-primary/5': isEnded,
            }
          )}
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
            background: 'radial-gradient(circle at 35% 35%, oklch(0.70 0.22 264), oklch(0.42 0.25 280))',
            border: '1px solid oklch(1 0 0 / 15%)',
            opacity: isEnded ? 0.6 : 1,
          }}
        >
          {/* Inner glow overlay */}
          <div
            className={cn(
              'absolute inset-0 rounded-full transition-all duration-500',
              {
                'bg-primary/15 motion-safe:animate-pulse [animation-duration:2s]': state === 'idle',
                'bg-primary/10': isConnecting,
                'bg-cyan-400/10 motion-safe:animate-pulse [animation-duration:0.8s]': isListening,
                'bg-violet-500/15 motion-safe:animate-pulse [animation-duration:1s]': isSpeaking,
                'bg-primary/5': isEnded,
              }
            )}
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
function FeatureCard({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="group flex flex-col gap-1.5 rounded-2xl border border-foreground/8 bg-background/60 p-4 text-left backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background/80 hover:shadow-md">
      <span className="text-lg" aria-hidden="true">{emoji}</span>
      <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

/* ── Prompt chip ── */
function PromptChip({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/8 bg-foreground/[0.04] px-3 py-1 text-xs text-muted-foreground">
      <span aria-hidden="true">{icon}</span>
      {text}
    </span>
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

  const handleStart = () => {
    if (connecting) return;
    setConnecting(true);
    onStartCall();
  };

  const orbState: OrbState = connecting ? 'connecting' : 'idle';

  return (
    <div className="relative min-h-svh w-full overflow-hidden">
      <AmbientBackground />

      {/* Main content */}
      <div className="relative z-10 flex w-full items-center justify-center px-4 py-20 lg:py-0">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[55fr_45fr] lg:gap-8">

            {/* ── Left column: text + CTA ── */}
            <div className="order-2 flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">

              {/* Badge */}
              <div
                className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold tracking-widest uppercase text-primary transition-colors duration-300"
                role="status"
                aria-live="polite"
              >
                {!connecting && (
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-pulse"
                    aria-hidden="true"
                  />
                )}
                {connecting ? 'Connecting to Vidya...' : 'AI Voice Learning Assistant'}
              </div>

              {/* Headline */}
              <h1 className="mb-4 text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {connecting ? (
                  <>
                    Getting your<br />
                    <span className="text-primary">session ready...</span>
                  </>
                ) : (
                  <>
                    Learn Smarter.<br />
                    <span className="text-primary">Just Talk.</span>
                  </>
                )}
              </h1>

              {/* Description (hidden when connecting) */}
              {!connecting && (
                <p className="mb-2 max-w-md text-base leading-relaxed text-muted-foreground">
                  Understand concepts, practice questions, and revise lessons through natural voice conversations.
                </p>
              )}

              {/* Language line (hidden when connecting) */}
              {!connecting && (
                <p className="mb-2 text-sm font-medium tracking-wide text-muted-foreground">
                  Hindi • English • Hinglish
                </p>
              )}

              {/* Hinglish tagline (hidden when connecting) */}
              {!connecting && (
                <p className="mb-6 text-sm font-medium text-muted-foreground" lang="hi">
                  Apni language mein baat karo.
                </p>
              )}

              {/* CTA Button */}
              <Button
                size="lg"
                onClick={handleStart}
                disabled={connecting}
                aria-label={connecting ? 'Connecting to Vidya, please wait' : 'Start your learning session with Vidya'}
                className="mb-3 w-56 rounded-full font-mono text-xs font-bold tracking-widest uppercase shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-105 hover:shadow-primary/40 active:scale-95 disabled:cursor-wait disabled:opacity-70 disabled:hover:scale-100"
              >
                {connecting ? (
                  <>
                    <span
                      className="mr-2 inline-block h-3 w-3 motion-safe:animate-spin rounded-full border-2 border-current border-t-transparent"
                      aria-hidden="true"
                    />
                    Connecting...
                  </>
                ) : (
                  <>🎙️ {startButtonText}</>
                )}
              </Button>

              {/* Microcopy (hidden when connecting) */}
              {!connecting && (
                <p className="mb-10 text-[11px] text-muted-foreground">
                  No typing. Just speak.
                </p>
              )}

              {/* Feature cards (hidden when connecting) */}
              {!connecting && (
                <div id="how-it-works" className="mb-6 grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
                  <FeatureCard emoji="💡" title="Understand" desc="Break difficult concepts into simple explanations" />
                  <FeatureCard emoji="📝" title="Practice" desc="Answer questions and receive hints" />
                  <FeatureCard emoji="🔄" title="Revise" desc="Review concepts through conversation" />
                  <FeatureCard emoji="🗣️" title="Learn Naturally" desc="Use Hindi, English, or Hinglish" />
                </div>
              )}

              {/* Prompt chips (hidden when connecting) */}
              {!connecting && (
                <div className="flex flex-col items-center gap-3 lg:items-start">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Try asking Vidya
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                    <PromptChip icon="📚" text="Explain photosynthesis simply." />
                    <PromptChip icon="🧮" text="Quiz me on algebra." />
                    <PromptChip icon="🔄" text="Help me revise physics." />
                    <PromptChip icon="🌐" text="Mujhe quadratic equations samjhao." />
                  </div>
                </div>
              )}

              {/* Language section anchor */}
              <span id="languages" className="sr-only">Supported languages: Hindi, English, Hinglish</span>
            </div>

            {/* ── Right column: Voice orb ── */}
            <div className="order-1 flex items-center justify-center lg:order-2">
              <VoiceOrb state={orbState} />
            </div>

          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 flex w-full items-center justify-center">
        <p className="text-[11px] text-muted-foreground">
          Powered by{' '}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://murf.ai"
            className="underline underline-offset-2 hover:opacity-80"
          >
            Murf Falcon TTS
          </a>
          {' '}·{' '}
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
