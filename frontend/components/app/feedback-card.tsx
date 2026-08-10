'use client';

import { motion } from 'motion/react';
import {
  ArrowCounterClockwise,
  ArrowRight,
  CheckCircle,
  CircleHalf,
  Lightbulb,
} from '@phosphor-icons/react';
import { cn } from '@/lib/shadcn/utils';

export interface FeedbackCardProps {
  result: 'correct' | 'incorrect' | 'partially_correct';
  explanation: string;
  hint?: string;
  nextStep?: string;
  topic?: string;
  className?: string;
}

type ResultConfig = {
  icon: React.ReactNode;
  heading: string;
  border: string;
  bg: string;
  badge: string;
  badgeText: string;
  badgeBg: string;
};

function getResultConfig(result: FeedbackCardProps['result']): ResultConfig {
  switch (result) {
    case 'correct':
      return {
        icon: (
          <CheckCircle
            size={18}
            weight="duotone"
            className="shrink-0 text-emerald-400"
            aria-hidden="true"
          />
        ),
        heading: 'Great work!',
        border: 'border-emerald-500/20',
        bg: 'bg-emerald-500/5',
        badge: 'CORRECT',
        badgeText: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/10',
      };
    case 'partially_correct':
      return {
        icon: (
          <CircleHalf
            size={18}
            weight="duotone"
            className="shrink-0 text-blue-400"
            aria-hidden="true"
          />
        ),
        heading: "You're close!",
        border: 'border-blue-500/20',
        bg: 'bg-blue-500/5',
        badge: 'CLOSE',
        badgeText: 'text-blue-400',
        badgeBg: 'bg-blue-500/10',
      };
    case 'incorrect':
    default:
      return {
        icon: (
          <ArrowCounterClockwise
            size={18}
            weight="bold"
            className="shrink-0 text-amber-400"
            aria-hidden="true"
          />
        ),
        heading: "Let's review.",
        border: 'border-amber-500/20',
        bg: 'bg-amber-500/5',
        badge: 'TRY AGAIN',
        badgeText: 'text-amber-400',
        badgeBg: 'bg-amber-500/10',
      };
  }
}

/**
 * FeedbackCard
 *
 * Shown inside the Learning Room when `answer_scored` fires on the
 * `vidya-tools` data channel. Displays the evaluation result while
 * Vidya speaks her feedback. Never shames the learner.
 */
export function FeedbackCard({
  result,
  explanation,
  hint,
  nextStep,
  className,
}: FeedbackCardProps) {
  const config = getResultConfig(result);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn('rounded-2xl border p-5 backdrop-blur-sm', config.border, config.bg, className)}
      role="region"
      aria-label="Answer feedback"
    >
      {/* Header: icon + heading + badge */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {config.icon}
          <span className="text-foreground text-sm font-semibold">{config.heading}</span>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase',
            config.badgeBg,
            config.badgeText
          )}
        >
          {config.badge}
        </span>
      </div>

      {/* Explanation */}
      <p className="text-foreground/90 mb-3 text-sm leading-relaxed">
        {explanation || 'Answer evaluated.'}
      </p>

      {/* Hint */}
      {hint && (
        <div className="border-border/40 mb-3 flex items-start gap-2 rounded-xl border bg-white/[0.02] p-3">
          <Lightbulb
            size={13}
            weight="duotone"
            className="mt-0.5 shrink-0 text-amber-400"
            aria-hidden="true"
          />
          <div>
            <p className="text-muted-foreground mb-0.5 text-[10px] font-bold tracking-widest uppercase">
              Hint
            </p>
            <p className="text-foreground/80 text-xs leading-relaxed">{hint}</p>
          </div>
        </div>
      )}

      {/* Next step */}
      {nextStep && (
        <div className="flex items-start gap-2">
          <ArrowRight
            size={12}
            weight="bold"
            className="text-muted-foreground mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <p className="text-muted-foreground text-xs leading-relaxed">{nextStep}</p>
        </div>
      )}
    </motion.div>
  );
}
