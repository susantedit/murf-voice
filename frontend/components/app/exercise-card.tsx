'use client';

import { motion } from 'motion/react';
import { BookOpen } from '@phosphor-icons/react';
import { cn } from '@/lib/shadcn/utils';

export interface ExerciseCardProps {
  topic: string;
  level?: string;
  difficulty: string;
  question: string;
  dataSource?: string;
  className?: string;
}

const DIFFICULTY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  easy: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    label: 'Easy',
  },
  medium: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    label: 'Medium',
  },
  hard: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    label: 'Hard',
  },
};

function getDifficultyStyle(difficulty: string) {
  return (
    DIFFICULTY_STYLES[difficulty.toLowerCase()] ?? {
      bg: 'bg-primary/10',
      text: 'text-primary',
      label: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
    }
  );
}

/**
 * ExerciseCard
 *
 * Shown inside the Learning Room when `exercise_ready` fires on the
 * `vidya-tools` data channel. Displays the current practice question
 * while Vidya speaks it naturally. Voice is the primary interaction —
 * this card is supporting context, not a replacement.
 */
export function ExerciseCard({
  topic,
  level,
  difficulty,
  question,
  dataSource,
  className,
}: ExerciseCardProps) {
  const diff = getDifficultyStyle(difficulty);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'border-border/40 bg-background/60 rounded-2xl border p-5 backdrop-blur-sm',
        className
      )}
      role="region"
      aria-label="Current practice question"
    >
      {/* Header row: topic badge + difficulty badge */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase">
          {topic.toUpperCase()}
        </span>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase',
            diff.bg,
            diff.text
          )}
        >
          {diff.label}
        </span>
        {level && <span className="text-muted-foreground text-[10px] font-medium">{level}</span>}
      </div>

      {/* Label */}
      <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase">
        <BookOpen size={11} weight="bold" aria-hidden="true" />
        Practice Question
      </p>

      {/* Question text */}
      <p className="text-foreground text-base leading-relaxed font-medium">
        {question || '(question not available)'}
      </p>

      {/* Data source watermark */}
      {dataSource === 'local_curated' && (
        <p className="text-muted-foreground/50 mt-3 text-[10px]">
          From Vidya&apos;s local learning dataset
        </p>
      )}
    </motion.div>
  );
}
