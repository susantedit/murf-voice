'use client';

import { Brain, CheckCircle } from '@phosphor-icons/react';
import { useLearnerMemory } from '@/hooks/useLearnerMemory';
import { cn } from '@/lib/shadcn/utils';

interface LearningContextPanelProps {
  userId: string;
  className?: string;
}

/**
 * LearningContextPanel
 *
 * Shown inside the Learning Room. Displays only what is actually stored in
 * SQLite and has been consented to. Never fabricates learner information.
 */
export function LearningContextPanel({ userId, className }: LearningContextPanelProps) {
  const { memory, loading } = useLearnerMemory(userId);

  if (loading) {
    return (
      <div
        className={cn(
          'border-border/40 bg-background/40 rounded-xl border p-4 backdrop-blur-sm',
          className
        )}
        aria-busy="true"
      >
        <p className="text-muted-foreground text-xs">Loading context...</p>
      </div>
    );
  }

  const hasMemory = memory?.found === true;

  return (
    <div
      className={cn(
        'border-border/40 bg-background/40 flex flex-col gap-3 rounded-xl border p-4 backdrop-blur-sm',
        className
      )}
      aria-label="Learning context"
    >
      <h4 className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase">
        <Brain size={12} weight="duotone" className="text-primary" aria-hidden="true" />
        Learning Context
      </h4>

      {!hasMemory ? (
        <p className="text-muted-foreground text-xs">
          No saved context yet. Vidya will ask before remembering anything.
        </p>
      ) : (
        <dl className="flex flex-col gap-2">
          {memory?.current_level && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                Level
              </dt>
              <dd className="text-foreground text-xs">{memory.current_level}</dd>
            </div>
          )}

          {memory?.language_preference && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                Language
              </dt>
              <dd className="text-foreground text-xs">{memory.language_preference}</dd>
            </div>
          )}

          {memory?.learning_goal && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                Goal
              </dt>
              <dd className="text-foreground text-xs">{memory.learning_goal}</dd>
            </div>
          )}

          {memory?.topics && memory.topics.length > 0 && (
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                Recent Topics
              </dt>
              <dd>
                <div className="flex flex-wrap gap-1">
                  {memory.topics.slice(-4).map((t) => (
                    <span
                      key={t}
                      className="border-primary/20 bg-primary/5 text-primary rounded-full border px-2 py-0.5 text-[10px] font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </dd>
            </div>
          )}

          <div className="flex items-center gap-1 pt-1">
            <CheckCircle
              size={11}
              weight="duotone"
              className="text-emerald-400"
              aria-hidden="true"
            />
            <span className="text-muted-foreground text-[10px]">Memory enabled</span>
          </div>
        </dl>
      )}
    </div>
  );
}
