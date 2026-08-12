'use client';

import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Clock, Copy, Headset, ShieldCheck, Warning } from '@phosphor-icons/react';
import { cn } from '@/lib/shadcn/utils';

export interface EscalationCardProps {
  status: 'preparing' | 'created' | 'failed';
  referenceId?: string;
  reason?: string;
  summary?: string;
  urgency?: string;
  language?: string;
  error?: string;
  className?: string;
}

export function EscalationCard({
  status,
  referenceId,
  summary,
  urgency = 'medium',
  language,
  error,
  className,
}: EscalationCardProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!referenceId) return;
    navigator.clipboard.writeText(referenceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const urgencyConfig: Record<string, { label: string; badgeClass: string }> = {
    high: {
      label: 'High Priority',
      badgeClass: 'border-red-500/30 bg-red-500/10 text-red-400',
    },
    medium: {
      label: 'Medium Priority',
      badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    },
    low: {
      label: 'Low Priority',
      badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    },
  };

  const urg = urgencyConfig[urgency.toLowerCase()] ?? urgencyConfig.medium;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'relative overflow-hidden rounded-2xl border p-5 shadow-xl backdrop-blur-md transition-all',
        status === 'created' && 'border-emerald-500/30 bg-emerald-950/20 shadow-emerald-950/20',
        status === 'preparing' && 'border-violet-500/30 bg-violet-950/20 shadow-violet-950/20',
        status === 'failed' && 'border-red-500/30 bg-red-950/20 shadow-red-950/20',
        className
      )}
      role="region"
      aria-label="Teacher Support Request Status"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-xl font-bold',
              status === 'created' && 'bg-emerald-500/20 text-emerald-400',
              status === 'preparing' && 'bg-violet-500/20 text-violet-400',
              status === 'failed' && 'bg-red-500/20 text-red-400'
            )}
          >
            {status === 'created' && <CheckCircle size={18} weight="fill" />}
            {status === 'preparing' && (
              <Headset size={18} weight="duotone" className="animate-pulse" />
            )}
            {status === 'failed' && <Warning size={18} weight="fill" />}
          </div>
          <div>
            <h4 className="text-foreground text-xs font-bold tracking-wider uppercase">
              {status === 'created' && 'Teacher Support Requested'}
              {status === 'preparing' && 'Preparing Human Help Request...'}
              {status === 'failed' && 'Request Could Not Be Created'}
            </h4>
            <p className="text-muted-foreground text-[10px]">
              {status === 'created' && 'Request submitted to teacher queue'}
              {status === 'preparing' && 'Formatting privacy-safe details'}
              {status === 'failed' && 'Service unavailable'}
            </p>
          </div>
        </div>

        {status === 'created' && (
          <span
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide',
              urg.badgeClass
            )}
          >
            {urg.label}
          </span>
        )}
      </div>

      {/* Main Body Content */}
      <div className="mt-4 flex flex-col gap-3">
        {status === 'created' && referenceId && (
          <div className="flex flex-col gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 shadow-inner">
            <span className="text-emerald-400/80 text-[10px] font-bold tracking-widest uppercase">
              Reference ID
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xl font-black tracking-wider text-emerald-300 select-all">
                {referenceId}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-200 transition-all hover:bg-emerald-500/30 active:scale-95"
                aria-label="Copy reference ID"
              >
                <Copy size={13} weight="bold" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {summary && (
          <div className="text-foreground/90 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs leading-relaxed">
            <span className="text-muted-foreground mb-1 block text-[10px] font-bold tracking-wider uppercase">
              Request Summary:
            </span>
            {summary}
          </div>
        )}

        {status === 'preparing' && (
          <div className="flex items-center gap-2 text-xs text-violet-300">
            <Clock size={14} className="shrink-0 animate-spin" />
            <span>Generating unique reference ID &amp; confirming details...</span>
          </div>
        )}

        {status === 'failed' && error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Footer info */}
        {status === 'created' && (
          <div className="text-muted-foreground flex items-center justify-between pt-1 text-[10px]">
            <span className="inline-flex items-center gap-1 text-emerald-400/90">
              <ShieldCheck size={12} /> Privacy Protected
            </span>
            {language && <span>Language: {language}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
