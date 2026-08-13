'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowClockwise, Headset } from '@phosphor-icons/react';
import { cn } from '@/lib/shadcn/utils';

export interface EscalationRecord {
  reference_id: string;
  user_id: string;
  name?: string;
  reason: string;
  summary: string;
  what_was_checked?: string;
  urgency: string;
  language?: string;
  follow_up_method?: string;
  status: 'open' | 'in_progress' | 'resolved' | string;
  created_at: string;
}

interface TeacherSupportPanelProps {
  userId?: string;
  className?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_MEMORY_API_URL ?? 'http://localhost:8888';

export function TeacherSupportPanel({ userId, className }: TeacherSupportPanelProps) {
  const [escalations, setEscalations] = useState<EscalationRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRef, setUpdatingRef] = useState<string | null>(null);

  const fetchEscalations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE}/escalations`;
      if (userId) {
        url = `${API_BASE}/escalations/${encodeURIComponent(userId)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { escalations?: EscalationRecord[] };
      setEscalations(data.escalations ?? []);
    } catch {
      setError('Could not load support requests.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchEscalations();
  }, [fetchEscalations]);

  const handleUpdateStatus = async (refId: string, newStatus: string) => {
    setUpdatingRef(refId);
    try {
      const res = await fetch(`${API_BASE}/escalations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_id: refId, status: newStatus }),
      });
      if (!res.ok) throw new Error('Update failed');

      // Optimistic update
      setEscalations((prev) =>
        prev.map((item) => (item.reference_id === refId ? { ...item, status: newStatus } : item))
      );
    } catch {
      alert('Failed to update status.');
    } finally {
      setUpdatingRef(null);
    }
  };

  const filtered = escalations.filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status.toLowerCase() === filterStatus.toLowerCase();
  });

  const countOpen = escalations.filter((i) => i.status === 'open').length;
  const countInProgress = escalations.filter((i) => i.status === 'in_progress').length;
  const countResolved = escalations.filter((i) => i.status === 'resolved').length;

  return (
    <div
      className={cn(
        'bg-background/80 rounded-2xl border border-white/10 p-5 shadow-xl backdrop-blur-xl',
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-400/10 text-violet-400">
            <Headset size={20} weight="duotone" />
          </div>
          <div>
            <h3 className="text-foreground text-sm font-bold tracking-wider uppercase">
              Teacher Support Dashboard
            </h3>
            <p className="text-muted-foreground text-[11px]">
              Human escalation requests from Vidya learners
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchEscalations}
          disabled={loading}
          className="text-foreground inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          <ArrowClockwise size={13} className={cn(loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pt-4 pb-2">
        {[
          { key: 'all', label: `All (${escalations.length})` },
          { key: 'open', label: `Open (${countOpen})` },
          { key: 'in_progress', label: `In Progress (${countInProgress})` },
          { key: 'resolved', label: `Resolved (${countResolved})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterStatus(tab.key)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold tracking-wide whitespace-nowrap transition-all',
              filterStatus === tab.key
                ? 'bg-primary/20 text-primary border-primary/40 border'
                : 'text-muted-foreground hover:text-foreground border border-white/5 bg-white/5'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-muted-foreground py-10 text-center text-xs">
          Loading teacher support requests...
        </div>
      ) : error ? (
        <div className="py-8 text-center text-xs text-red-400">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground py-10 text-center text-xs">
          No support requests found for this filter.
        </div>
      ) : (
        <div className="mt-3 flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
          {filtered.map((item) => (
            <motion.div
              key={item.reference_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] p-4 transition-colors hover:border-white/15"
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-primary font-mono text-sm font-bold">
                    {item.reference_id}
                  </span>
                  <span className="text-foreground/80 text-xs font-medium">
                    • {item.name || item.user_id}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase',
                      item.urgency === 'high' && 'border-red-500/30 bg-red-500/10 text-red-400',
                      item.urgency === 'medium' &&
                        'border-amber-500/30 bg-amber-500/10 text-amber-400',
                      item.urgency === 'low' && 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                    )}
                  >
                    {item.urgency} Urgency
                  </span>

                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase',
                      item.status === 'open' &&
                        'border border-amber-400/30 bg-amber-400/15 text-amber-400',
                      item.status === 'in_progress' &&
                        'border border-blue-400/30 bg-blue-400/15 text-blue-400',
                      item.status === 'resolved' &&
                        'border border-emerald-400/30 bg-emerald-400/15 text-emerald-400'
                    )}
                  >
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Summary */}
              <div className="text-foreground/90 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-xs leading-relaxed">
                <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
                  Reason: {item.reason}
                </p>
                {item.summary}
                {item.what_was_checked && (
                  <p className="text-muted-foreground mt-1.5 text-[11px]">
                    <span className="font-semibold">Checked:</span> {item.what_was_checked}
                  </p>
                )}
              </div>

              {/* Details & Actions */}
              <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-1 text-[11px]">
                <div>
                  Language:{' '}
                  <span className="text-foreground">{item.language || 'Hindi-English'}</span>
                  {item.follow_up_method && (
                    <span className="ml-2">• Method: {item.follow_up_method}</span>
                  )}
                </div>

                {/* Status action buttons */}
                <div className="flex items-center gap-1.5">
                  {item.status !== 'open' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(item.reference_id, 'open')}
                      disabled={updatingRef === item.reference_id}
                      className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300 hover:bg-amber-500/20"
                    >
                      Set Open
                    </button>
                  )}
                  {item.status !== 'in_progress' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(item.reference_id, 'in_progress')}
                      disabled={updatingRef === item.reference_id}
                      className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-300 hover:bg-blue-500/20"
                    >
                      In Progress
                    </button>
                  )}
                  {item.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(item.reference_id, 'resolved')}
                      disabled={updatingRef === item.reference_id}
                      className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/20"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export const EscalationsDashboard = TeacherSupportPanel;
