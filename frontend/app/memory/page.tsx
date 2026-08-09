'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MemoryCard } from '@/components/app/memory-card';
import { Button } from '@/components/ui/button';
import { useLearnerMemory } from '@/hooks/useLearnerMemory';
import { cn } from '@/lib/shadcn/utils';
import { getUserId } from '@/lib/user-identity';

// ── Page metadata (set via document.title on the client) ───────────────────

const PAGE_TITLE = 'My Learning Memory — Vidya';

// ── Loading skeleton ───────────────────────────────────────────────────────

function MemorySkeleton() {
  return (
    <div
      className={cn(
        'bg-card flex flex-col gap-6 rounded-2xl border px-6 py-8',
        'border-border/60 backdrop-blur-sm'
      )}
      aria-busy="true"
      aria-label="Loading your learning memory"
    >
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="bg-muted h-12 w-12 animate-pulse rounded-full" />
        <div className="flex flex-col gap-2">
          <div className="bg-muted h-5 w-32 animate-pulse rounded-md" />
          <div className="bg-muted h-3 w-24 animate-pulse rounded-md" />
        </div>
      </div>

      {/* Divider skeleton */}
      <div className="bg-border/40 h-px" />

      {/* Info rows skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="bg-muted h-3 w-16 animate-pulse rounded-md" />
            <div className="bg-muted h-4 w-28 animate-pulse rounded-md" />
          </div>
        ))}
      </div>

      {/* Topics skeleton */}
      <div className="flex flex-col gap-2">
        <div className="bg-muted h-3 w-12 animate-pulse rounded-md" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-muted h-6 w-20 animate-pulse rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Offline state ──────────────────────────────────────────────────────────

function MemoryOffline() {
  return (
    <div
      className={cn(
        'bg-card flex flex-col items-center gap-6 rounded-2xl border px-6 py-12 text-center',
        'border-border/60 backdrop-blur-sm'
      )}
      role="status"
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 text-3xl"
        aria-hidden="true"
      >
        ℹ️
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-foreground text-lg font-semibold">Memory service is offline</h2>
        <p className="text-muted-foreground max-w-xs text-sm">
          Start the memory server to see your learning data.
        </p>
      </div>

      <div className="bg-muted/50 border-border/50 w-full rounded-lg border p-3 text-left">
        <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
          Start command
        </p>
        <code className="text-foreground font-mono text-xs break-all">
          uv run python -m src.api.memory_server
        </code>
      </div>
    </div>
  );
}

// ── Error state ────────────────────────────────────────────────────────────

function MemoryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className={cn(
        'bg-card flex flex-col items-center gap-6 rounded-2xl border px-6 py-12 text-center',
        'border-destructive/30 backdrop-blur-sm'
      )}
      role="alert"
    >
      <div
        className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
        aria-hidden="true"
      >
        ⚠️
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-foreground text-lg font-semibold">
          Couldn&apos;t load your learning memory.
        </h2>
        <p className="text-muted-foreground max-w-xs text-sm">{message}</p>
      </div>

      <Button variant="outline" onClick={onRetry} aria-label="Retry loading your learning memory">
        Try Again
      </Button>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function MemoryPage() {
  // getUserId() is localStorage-based — safe in 'use client' context.
  const [userId] = useState<string>(() => getUserId());

  // Set page title.
  useEffect(() => {
    document.title = PAGE_TITLE;
  }, []);

  const { memory, loading, error, refresh, deleteMemory } = useLearnerMemory(userId);

  return (
    <main className="relative min-h-svh w-full overflow-hidden">
      {/* Ambient background — matches the app-wide design */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="bg-primary/8 absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full blur-[160px]" />
        <div className="absolute top-1/3 -left-40 h-[350px] w-[350px] rounded-full bg-violet-400/6 blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 pt-28 pb-20">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-1">
          <div className="bg-primary/10 text-primary mb-2 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-widest uppercase">
            <span className="bg-primary inline-block h-1.5 w-1.5 rounded-full" aria-hidden="true" />
            Memory
          </div>
          <h1 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl">
            My Learning Memory
          </h1>
          <p className="text-muted-foreground text-sm">
            Everything Vidya has saved about your learning journey.
          </p>
        </div>

        {/* Main card area */}
        {loading && <MemorySkeleton />}

        {!loading &&
          error &&
          (/offline|Memory service/i.test(error) ? (
            <MemoryOffline />
          ) : (
            <MemoryError message={error} onRetry={refresh} />
          ))}

        {!loading && !error && (
          <MemoryCard
            name={memory?.name}
            level={memory?.current_level}
            language={memory?.language_preference}
            goal={memory?.learning_goal}
            topics={memory?.topics ?? []}
            lastInteraction={memory?.last_interaction}
            onForget={deleteMemory}
          />
        )}

        {/* Back to home */}
        <div className="mt-8 flex justify-center">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              ← Back to Vidya
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
