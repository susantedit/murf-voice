'use client';

import { useEffect, useState } from 'react';
import {
  CalendarBlank,
  ChartBar,
  CheckCircle,
  Clock,
  Phone,
  PhoneX,
  Spinner,
  Target,
  XCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/shadcn/utils';
import { getUserId } from '@/lib/user-identity';
import type { CallRecord } from '@/types/call';

// ── Types ─────────────────────────────────────────────────────────────────

interface ExerciseAttempt {
  topic: string;
  result: 'correct' | 'incorrect';
}

interface MemoryResponse {
  exercise_attempts?: ExerciseAttempt[];
  [key: string]: unknown;
}

interface ProgressStats {
  totalAttempts: number;
  accuracyPct: number | null;
  topTopic: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDuration(seconds: number | undefined | null): string {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return isoString;
  }
}

function computeProgressStats(attempts: ExerciseAttempt[]): ProgressStats {
  const total = attempts.length;
  if (total === 0) {
    return { totalAttempts: 0, accuracyPct: null, topTopic: null };
  }

  const correct = attempts.filter((a) => a.result === 'correct').length;
  const accuracyPct = Math.round((correct / total) * 1000) / 10;

  // Count topic frequency
  const topicCounts: Record<string, number> = {};
  for (const attempt of attempts) {
    topicCounts[attempt.topic] = (topicCounts[attempt.topic] ?? 0) + 1;
  }
  const topTopic = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return { totalAttempts: total, accuracyPct, topTopic };
}

// ── Status badge ──────────────────────────────────────────────────────────

const STATUS_STYLES: Record<CallRecord['status'], string> = {
  answered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  missed: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
  failed: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const STATUS_ICONS: Record<CallRecord['status'], React.ReactNode> = {
  answered: <CheckCircle size={11} weight="fill" aria-hidden="true" />,
  missed: <PhoneX size={11} weight="fill" aria-hidden="true" />,
  failed: <XCircle size={11} weight="fill" aria-hidden="true" />,
};

function StatusBadge({ status }: { status: CallRecord['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide capitalize',
        STATUS_STYLES[status]
      )}
    >
      {STATUS_ICONS[status]}
      {status}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border-foreground/8 bg-background/60 flex flex-col gap-1 rounded-xl border p-3 backdrop-blur-sm">
      <span className="text-primary" aria-hidden="true">
        {icon}
      </span>
      <p className="text-foreground text-base leading-none font-bold">{value}</p>
      <p className="text-muted-foreground text-[11px] leading-tight">{label}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function PracticeHistoryPanel() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [stats, setStats] = useState<ProgressStats>({
    totalAttempts: 0,
    accuracyPct: null,
    topTopic: null,
  });
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  const apiBase = process.env.NEXT_PUBLIC_MEMORY_API_URL ?? 'http://localhost:8888';

  // 14.1 — Fetch call history on mount
  useEffect(() => {
    const userId = getUserId();
    if (!userId || userId === 'server-side') {
      setLoadingCalls(false);
      return;
    }

    let cancelled = false;
    fetch(`${apiBase}/calls/${encodeURIComponent(userId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json() as Promise<{ calls: CallRecord[] } | CallRecord[]>;
      })
      .then((data) => {
        if (!cancelled) {
          // Backend returns { calls: [...] } from handle_get_calls
          const records = Array.isArray(data)
            ? data
            : ((data as { calls: CallRecord[] }).calls ?? []);
          setCalls(records.slice(0, 10));
        }
      })
      .catch(() => {
        if (!cancelled) setCalls([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCalls(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  // 14.4 — Fetch memory for progress stats
  useEffect(() => {
    const userId = getUserId();
    if (!userId || userId === 'server-side') {
      setLoadingStats(false);
      return;
    }

    let cancelled = false;
    fetch(`${apiBase}/memory/${encodeURIComponent(userId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json() as Promise<MemoryResponse>;
      })
      .then((data) => {
        if (!cancelled) {
          const attempts = Array.isArray(data.exercise_attempts) ? data.exercise_attempts : [];
          setStats(computeProgressStats(attempts));
        }
      })
      .catch(() => {
        if (!cancelled) setStats({ totalAttempts: 0, accuracyPct: null, topTopic: null });
      })
      .finally(() => {
        if (!cancelled) setLoadingStats(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  const isLoading = loadingCalls || loadingStats;

  return (
    <section
      className="border-foreground/8 bg-background/60 rounded-2xl border p-4 backdrop-blur-sm"
      aria-label="Practice History"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Phone size={16} weight="duotone" className="text-primary" aria-hidden="true" />
        <h2 className="text-foreground text-sm font-bold tracking-wide">Practice History</h2>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
          <Spinner
            size={20}
            weight="bold"
            className="text-primary motion-safe:animate-spin"
            aria-hidden="true"
          />
          <span className="sr-only">Loading practice history…</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* 14.4 — Progress stats */}
          {stats.totalAttempts > 0 && (
            <div className="mb-4 grid grid-cols-3 gap-2">
              <StatCard
                icon={<Target size={14} weight="duotone" />}
                label="Total attempts"
                value={String(stats.totalAttempts)}
              />
              <StatCard
                icon={<ChartBar size={14} weight="duotone" />}
                label="Accuracy"
                value={stats.accuracyPct !== null ? `${stats.accuracyPct}%` : '—'}
              />
              <StatCard
                icon={<CheckCircle size={14} weight="duotone" />}
                label="Top topic"
                value={stats.topTopic ?? '—'}
              />
            </div>
          )}

          {/* 14.2 / 14.3 — Call list or empty state */}
          {calls.length === 0 ? (
            /* 14.3 — Empty state */
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CalendarBlank
                size={28}
                weight="duotone"
                className="text-muted-foreground/50"
                aria-hidden="true"
              />
              <p className="text-muted-foreground text-sm leading-snug">
                No calls yet. Set your daily practice time to get started.
              </p>
            </div>
          ) : (
            /* 14.2 — Call records */
            <ul className="flex flex-col gap-2" role="list" aria-label="Call records">
              {calls.map((call) => (
                <li
                  key={call.id}
                  className="border-foreground/8 bg-background/60 flex flex-col gap-1.5 rounded-xl border px-3 py-2.5 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      {/* Date */}
                      <span className="text-foreground flex items-center gap-1 truncate text-xs font-medium">
                        <CalendarBlank
                          size={11}
                          weight="regular"
                          className="text-muted-foreground shrink-0"
                          aria-hidden="true"
                        />
                        <time dateTime={call.started_at}>{formatDate(call.started_at)}</time>
                      </span>
                      {/* Topic */}
                      {call.topic && (
                        <span className="text-muted-foreground truncate pl-3.5 text-[11px]">
                          {call.topic}
                        </span>
                      )}
                    </div>

                    {/* Duration + status */}
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={call.status} />
                      <span className="text-muted-foreground flex items-center gap-0.5 text-[11px]">
                        <Clock size={10} weight="regular" className="shrink-0" aria-hidden="true" />
                        {formatDuration(call.duration_seconds)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
