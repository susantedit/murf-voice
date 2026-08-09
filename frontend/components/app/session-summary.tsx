'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { ReceivedMessage } from '@livekit/components-react';
import { ArrowRight, Brain, Microphone, NotePencil } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';

// ── Types ──────────────────────────────────────────────────────────────────

export interface SessionSummaryProps {
  /** Messages captured from useSessionMessages at the time of disconnect. */
  messages: ReceivedMessage[];
  /** Called when the learner clicks "Continue Learning". */
  onContinue: () => void;
  /** Optional override to navigate to /memory (defaults to Next.js Link). */
  onViewMemory?: () => void;
  className?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Extract brief topic snippets from agent messages. */
function extractTopics(messages: ReceivedMessage[]): string[] {
  const agentMessages = messages.filter((m) => m.from?.isLocal === false);
  if (agentMessages.length === 0) return [];

  // Collect first sentence or truncated snippet from each agent message.
  const snippets: string[] = [];
  for (const m of agentMessages) {
    const text = m.message?.trim();
    if (!text) continue;

    // Extract first sentence (up to 80 chars)
    const firstSentence = text.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length > 10) {
      snippets.push(firstSentence.length > 80 ? firstSentence.slice(0, 77) + '...' : firstSentence);
    }
    if (snippets.length >= 3) break;
  }
  return snippets;
}

/** Check if any agent message contains a memory-save confirmation phrase. */
function detectMemorySaved(messages: ReceivedMessage[]): boolean {
  const memorySavePhrases = [
    "i've saved",
    "i'll remember",
    'saved to memory',
    'memory saved',
    "i've noted",
    "i'll note",
    'noted that',
  ];

  return messages
    .filter((m) => m.from?.isLocal === false)
    .some((m) => {
      const lower = m.message?.toLowerCase() ?? '';
      return memorySavePhrases.some((phrase) => lower.includes(phrase));
    });
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * SessionSummary
 *
 * Shown after a session ends. Displays what was discussed and whether
 * any facts were saved. No fabricated durations, counts, or percentages.
 */
export function SessionSummary({
  messages,
  onContinue,
  onViewMemory,
  className,
}: SessionSummaryProps) {
  const topics = useMemo(() => extractTopics(messages), [messages]);
  const memorySaved = useMemo(() => detectMemorySaved(messages), [messages]);
  const hadConversation = messages.length > 0;

  return (
    <div
      className={cn(
        'relative flex min-h-svh w-full items-center justify-center overflow-hidden px-4 py-20',
        className
      )}
    >
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="bg-primary/8 absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -left-40 h-[300px] w-[300px] rounded-full bg-violet-400/6 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-lg">
        {/* ── Heading ── */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div
            className="bg-primary/10 mb-2 flex h-20 w-20 items-center justify-center rounded-full"
            aria-hidden="true"
          >
            <NotePencil size={40} weight="duotone" className="text-primary" />
          </div>
          <h1 className="text-foreground text-3xl font-extrabold tracking-tight">Great session! 🎉</h1>
          <p className="text-muted-foreground text-sm">
            {hadConversation ? "Here's a recap of what we covered." : 'Your session has ended.'}
          </p>
        </div>

        {/* ── Topics discussed ── */}
        {topics.length > 0 && (
          <div
            className="border-border/60 bg-background/60 mb-4 rounded-2xl border p-4 backdrop-blur-sm"
            aria-label="Topics discussed"
          >
            <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-wider uppercase">
              Topics discussed
            </p>
            <ul className="flex flex-col gap-2">
              {topics.map((snippet, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0 text-xs">•</span>
                  <span className="text-foreground text-sm leading-relaxed">{snippet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!hadConversation && (
          <div className="border-border/60 bg-background/60 mb-4 rounded-2xl border p-4 text-center backdrop-blur-sm">
            <p className="text-muted-foreground text-sm">
              No messages were exchanged this session.
            </p>
          </div>
        )}

        {/* ── Memory saved section ── */}
        {memorySaved && (
          <div
            className="border-primary/20 bg-primary/5 mb-4 flex items-start gap-3 rounded-2xl border p-4 backdrop-blur-sm"
            aria-label="Memory saved this session"
          >
            <Brain
              size={20}
              weight="duotone"
              className="text-primary mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="text-foreground text-sm font-semibold">Added to memory</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Vidya saved some of your learning preferences this session. You can review or delete
                them on your Memory page.
              </p>
            </div>
          </div>
        )}

        {/* ── CTAs ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            onClick={onContinue}
            className="rounded-full font-mono text-xs font-bold tracking-widest uppercase"
            aria-label="Start a new learning session"
          >
            <Microphone size={14} weight="bold" aria-hidden="true" />
            Continue Learning
          </Button>

          {onViewMemory ? (
            <Button
              size="lg"
              variant="outline"
              onClick={onViewMemory}
              className="rounded-full font-mono text-xs font-bold tracking-widest uppercase"
              aria-label="View your saved learning memory"
            >
              <Brain size={14} weight="duotone" aria-hidden="true" />
              View My Memory
            </Button>
          ) : (
            <Link href="/memory">
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-full font-mono text-xs font-bold tracking-widest uppercase sm:w-auto"
                aria-label="View your saved learning memory"
              >
                <Brain size={14} weight="duotone" aria-hidden="true" />
                View My Memory
              </Button>
            </Link>
          )}

          <Button
            size="lg"
            variant="ghost"
            onClick={onContinue}
            className="rounded-full font-mono text-xs font-bold tracking-widest uppercase"
            aria-label="Start a new topic"
          >
            <ArrowRight size={14} weight="bold" aria-hidden="true" />
            New Topic
          </Button>
        </div>
      </div>
    </div>
  );
}
