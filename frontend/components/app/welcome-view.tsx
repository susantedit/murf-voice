'use client';

import { Button } from '@/components/ui/button';

/* ── Animated orb background ── */
function OrbBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Large primary orb */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full bg-primary/10 blur-[120px]" />
      {/* Secondary warm orb */}
      <div className="absolute top-1/3 -left-24 h-[320px] w-[320px] rounded-full bg-violet-400/8 blur-[100px]" />
      {/* Third accent orb */}
      <div className="absolute top-1/4 -right-24 h-[280px] w-[280px] rounded-full bg-indigo-400/8 blur-[90px]" />
    </div>
  );
}

/* ── Vidya Avatar Icon ── */
function VidyaAvatar() {
  return (
    <div className="relative mb-6 flex items-center justify-center">
      {/* Outer pulse ring */}
      <span className="absolute inline-flex h-28 w-28 animate-ping rounded-full bg-primary/15 duration-[2500ms]" />
      {/* Ring */}
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-primary/20 bg-primary/8 shadow-xl shadow-primary/10">
        {/* Book icon inside */}
        <svg
          width="44"
          height="44"
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-primary"
          aria-hidden="true"
        >
          {/* Open book left page */}
          <path
            d="M22 10C22 10 14 8 6 12V36C14 32 22 34 22 34V10Z"
            fill="currentColor"
            fillOpacity="0.18"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Open book right page */}
          <path
            d="M22 10C22 10 30 8 38 12V36C30 32 22 34 22 34V10Z"
            fill="currentColor"
            fillOpacity="0.10"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Left lines */}
          <line x1="10" y1="17" x2="19" y2="15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.65" />
          <line x1="10" y1="22" x2="19" y2="20.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.65" />
          <line x1="10" y1="27" x2="19" y2="25.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.65" />
          {/* Right lines */}
          <line x1="25" y1="15.5" x2="34" y2="17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.40" />
          <line x1="25" y1="20.5" x2="34" y2="22" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.40" />
          <line x1="25" y1="25.5" x2="34" y2="27" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.40" />
          {/* Sparkle */}
          <circle cx="36" cy="10" r="2" fill="currentColor" fillOpacity="0.55" />
          <line x1="36" y1="5.5" x2="36" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.4" />
          <line x1="36" y1="12" x2="36" y2="14.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.4" />
          <line x1="31.5" y1="10" x2="34" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.4" />
          <line x1="38" y1="10" x2="40.5" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

/* ── Capability card ── */
function CapabilityCard({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-foreground/[0.03] border-foreground/8 hover:bg-foreground/[0.06] flex flex-col gap-1 rounded-2xl border p-4 text-left transition-colors duration-200">
      <span className="text-xl" aria-hidden="true">{emoji}</span>
      <p className="text-foreground text-sm font-semibold">{title}</p>
      <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
    </div>
  );
}

/* ── Language chip ── */
function LangChip({ label }: { label: string }) {
  return (
    <span className="bg-primary/8 text-primary border-primary/15 inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium">
      {label}
    </span>
  );
}

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div
      ref={ref}
      className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden px-4 py-16"
    >
      {/* Background orbs */}
      <OrbBackground />

      {/* Content card */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        {/* Avatar */}
        <VidyaAvatar />

        {/* Badge */}
        <div className="bg-primary/10 text-primary mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-widest uppercase">
          <span className="bg-primary inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
          Voice AI Tutor · Day 2
        </div>

        {/* Headline */}
        <h1 className="text-foreground mb-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Hi, I&apos;m{' '}
          <span className="text-primary">Vidya</span>
        </h1>

        {/* Sub-headline */}
        <p className="text-muted-foreground mb-3 max-w-xs text-sm leading-relaxed">
          Your patient voice learning assistant. Ask anything — concepts, practice, or revision.
        </p>

        {/* Language chips */}
        <div className="mb-7 flex flex-wrap justify-center gap-2">
          <LangChip label="English" />
          <LangChip label="हिंदी" />
          <LangChip label="नेपाली" />
          <LangChip label="Code-mixed" />
        </div>

        {/* CTA */}
        <Button
          size="lg"
          onClick={onStartCall}
          className="mb-3 w-56 rounded-full font-mono text-xs font-bold tracking-widest uppercase shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-105 hover:shadow-primary/40 active:scale-95"
        >
          {startButtonText}
        </Button>

        <p className="text-muted-foreground mb-10 text-[11px]">
          🎤 Allow microphone when prompted
        </p>

        {/* Capability cards */}
        <div className="grid w-full grid-cols-3 gap-2 text-center">
          <CapabilityCard
            emoji="💡"
            title="Concepts"
            description="Understand tough topics step by step"
          />
          <CapabilityCard
            emoji="📝"
            title="Practice"
            description="Short questions with hints & feedback"
          />
          <CapabilityCard
            emoji="🔁"
            title="Revision"
            description="Quick topic recap with Q&A"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-5 left-0 flex w-full items-center justify-center">
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
