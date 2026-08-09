'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Brain, Microphone, Trash } from '@phosphor-icons/react';
import { ForgetConfirmModal } from '@/components/app/forget-confirm-modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';

// ── Types ──────────────────────────────────────────────────────────────────

interface MemoryCardProps {
  /** Learner's display name. */
  name?: string;
  /** e.g. "Beginner", "Class 10" */
  level?: string;
  /** e.g. "Hindi", "English" */
  language?: string;
  /** The learner's stated learning goal. */
  goal?: string;
  /** List of topics the learner has studied. */
  topics: string[];
  /** ISO 8601 last interaction timestamp. */
  lastInteraction?: string;
  /** Called when the learner confirms memory deletion. */
  onForget: () => Promise<void>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Format an ISO 8601 timestamp as a human-readable relative string. */
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1_000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
        {label}
      </span>
      <span className="text-foreground text-sm">{value}</span>
    </div>
  );
}

function TopicChip({ topic }: { topic: string }) {
  return (
    <span className="border-primary/30 bg-primary/10 text-primary inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium">
      {topic}
    </span>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyMemoryCard() {
  return (
    <div
      className={cn(
        'bg-card flex flex-col items-center gap-6 rounded-2xl border px-6 py-12 text-center',
        'border-border/60 backdrop-blur-sm'
      )}
    >
      {/* Brain icon */}
      <div
        className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-full"
        aria-hidden="true"
      >
        <Brain size={32} weight="duotone" className="text-primary" />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-foreground text-lg font-semibold">Your learning memory is empty.</h2>
        <p className="text-muted-foreground max-w-xs text-sm">
          Start a session with Vidya — she can remember your name, learning level, and topics with
          your permission.
        </p>
      </div>

      {/* Privacy notice */}
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Brain size={12} weight="duotone" className="text-primary shrink-0" aria-hidden="true" />
        Vidya only remembers learning information you choose to save.
      </p>

      <Link href="/">
        <Button
          size="lg"
          className="rounded-full font-mono text-xs font-bold tracking-widest uppercase"
        >
          <Microphone size={13} weight="bold" aria-hidden="true" />
          Start Learning
        </Button>
      </Link>
    </div>
  );
}

// ── MemoryCard ─────────────────────────────────────────────────────────────

export function MemoryCard({
  name,
  level,
  language,
  goal,
  topics,
  lastInteraction,
  onForget,
}: MemoryCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  // Show empty state when there's no meaningful data.
  const hasData = Boolean(name ?? level ?? language ?? goal ?? topics.length);
  if (!hasData) {
    return <EmptyMemoryCard />;
  }

  return (
    <>
      <div
        className={cn(
          'bg-card flex flex-col gap-6 rounded-2xl border px-6 py-8',
          'border-border/60 backdrop-blur-sm'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full"
              aria-hidden="true"
            >
              <Brain size={24} weight="duotone" className="text-primary" />
            </div>
            <div>
              <h2 className="text-foreground text-xl font-bold">{name ?? 'Learner'}</h2>
              {lastInteraction && (
                <p className="text-muted-foreground text-xs">
                  Last active: {formatRelativeTime(lastInteraction)}
                </p>
              )}
            </div>
          </div>

          {/* Forget button */}
          <Button
            variant="destructive"
            size="sm"
            className="shrink-0"
            onClick={() => setModalOpen(true)}
          >
            <Trash size={13} weight="regular" aria-hidden="true" />
            Forget Everything
          </Button>
        </div>

        {/* Divider */}
        <div className="bg-border/60 h-px" />

        {/* Info grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {level && <InfoRow label="Level" value={level} />}
          {language && <InfoRow label="Language" value={language} />}
          {goal && <InfoRow label="Learning Goal" value={goal} />}
        </div>

        {/* Topics */}
        {topics.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
              Topics
            </span>
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <TopicChip key={t} topic={t} />
              ))}
            </div>
          </div>
        )}

        {/* Privacy notice */}
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Brain size={12} weight="duotone" className="text-primary shrink-0" aria-hidden="true" />
          Vidya only remembers learning information you choose to save.
        </p>
      </div>

      {/* Forget confirmation modal */}
      <ForgetConfirmModal open={modalOpen} onOpenChange={setModalOpen} onConfirm={onForget} />
    </>
  );
}
