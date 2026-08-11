'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Brain, GraduationCap, Sparkle, Spinner } from '@phosphor-icons/react';
import type { LearnerMemory } from '@/hooks/useLearnerMemory';
import { cn } from '@/lib/shadcn/utils';
import { getUserId } from '@/lib/user-identity';
import type { CallRecord } from '@/types/call';

// ── Types ──────────────────────────────────────────────────────────────────

interface StudentDashboardProps {
  /** Optionally pass practice count directly to skip the calls fetch. */
  practiceCount?: number;
  /** Extra class names for the root element. */
  className?: string;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase">
        <span aria-hidden="true">{icon}</span>
        {label}
      </span>
      <span className="text-foreground text-sm font-semibold">{value}</span>
    </div>
  );
}

function MemoryStatusBadge({ found }: { found: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold',
        found
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
          : 'border-border/60 bg-muted/40 text-muted-foreground'
      )}
      role="status"
      aria-label={found ? 'Memory status: Active' : 'Memory status: New'}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full', found ? 'bg-emerald-400' : 'bg-muted-foreground')}
        aria-hidden="true"
      />
      {found ? 'Active' : 'New'}
    </span>
  );
}

// ── StudentDashboard ───────────────────────────────────────────────────────

/**
 * Shows a compact student profile card with name, level, current topic,
 * memory status, and practice call count — all fetched fresh on mount.
 */
export function StudentDashboard({ practiceCount, className }: StudentDashboardProps) {
  const [memory, setMemory] = useState<LearnerMemory | null>(null);
  const [callCount, setCallCount] = useState<number | null>(practiceCount ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_MEMORY_API_URL ?? 'http://localhost:8888';
    const userId = getUserId();

    if (!userId || userId === 'server-side') {
      setLoading(false);
      return;
    }

    let cancelled = false;

    // 16.1 — Fetch memory and call history in parallel on mount.
    const memoryFetch = fetch(`${apiBase}/memory/${encodeURIComponent(userId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Memory API status ${res.status}`);
        return res.json() as Promise<LearnerMemory>;
      })
      .then((data) => {
        if (!cancelled) setMemory(data);
      })
      .catch(() => {
        if (!cancelled) setMemory(null);
      });

    // 16.3 — Only fetch call count if it wasn't passed as a prop.
    const callsFetch =
      practiceCount !== undefined
        ? Promise.resolve()
        : fetch(`${apiBase}/calls/${encodeURIComponent(userId)}`)
            .then((res) => {
              if (!res.ok) throw new Error(`Calls API status ${res.status}`);
              return res.json() as Promise<CallRecord[]>;
            })
            .then((records) => {
              if (!cancelled) setCallCount(records.length);
            })
            .catch(() => {
              if (!cancelled) setCallCount(0);
            });

    Promise.all([memoryFetch, callsFetch]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [practiceCount]);

  // 16.2 — Derived display values.
  const name = memory?.name ?? 'New Student';
  const level = memory?.current_level ?? '—';
  const currentTopic =
    memory?.topics && memory.topics.length > 0
      ? memory.topics[memory.topics.length - 1]
      : 'No topic yet';
  const memoryFound = memory?.found === true;

  // ── Loading skeleton ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className={cn(
          'border-foreground/8 bg-background/60 flex items-center justify-center gap-3 rounded-2xl border p-4 backdrop-blur-sm',
          className
        )}
        aria-busy="true"
        aria-label="Loading student dashboard"
      >
        <Spinner
          size={20}
          weight="bold"
          className="text-primary motion-safe:animate-spin"
          aria-hidden="true"
        />
        <span className="text-muted-foreground text-sm">Loading profile…</span>
      </div>
    );
  }

  // ── Populated card ───────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        'border-foreground/8 bg-background/60 flex flex-col gap-5 rounded-2xl border p-4 backdrop-blur-sm',
        className
      )}
    >
      {/* Header row: avatar + name + memory badge */}
      <div className="flex items-center gap-3">
        <div
          className="bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          aria-hidden="true"
        >
          <Brain size={24} weight="duotone" className="text-primary" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-foreground truncate text-base leading-tight font-bold">{name}</h2>
          <div className="flex items-center gap-2">
            <MemoryStatusBadge found={memoryFound} />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="bg-border/60 h-px" />

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Level */}
        <StatItem
          icon={<GraduationCap size={12} weight="duotone" className="text-primary" />}
          label="Level"
          value={level}
        />

        {/* Current topic */}
        <StatItem
          icon={<BookOpen size={12} weight="duotone" className="text-primary" />}
          label="Current Topic"
          value={currentTopic}
        />

        {/* Practice count */}
        <StatItem
          icon={<Sparkle size={12} weight="duotone" className="text-primary" />}
          label="Practice Sessions"
          value={callCount !== null ? String(callCount) : '—'}
        />
      </div>
    </div>
  );
}
