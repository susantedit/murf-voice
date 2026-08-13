'use client';

import React, { useState, useEffect, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface RecentCall {
  id: number;
  started_at: string;
  duration_seconds: number;
  channel: string;
  outcome: string;
  failure_reason: string | null;
  latency_ms: number;
}

export interface DashboardMetrics {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  success_rate?: number;
  avg_latency_ms?: number;
  failure_categories?: {
    user_declined: number;
    incomplete_task: number;
    tool_failure: number;
    api_error: number;
    no_response: number;
    user_hangup: number;
  };
  track_outcomes?: {
    exercises_completed: number;
    escalations_created: number;
    opt_outs: number;
  };
  recent_calls?: RecentCall[];
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

// ── MetricCard Sub-component ───────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number | string | null;
  accentVariant: 'green' | 'red' | 'neutral' | 'violet';
  subtitle?: string;
}

function MetricCard({ label, value, accentVariant, subtitle }: MetricCardProps) {
  const borderColorClass =
    accentVariant === 'green'
      ? 'border-green-500/30'
      : accentVariant === 'red'
        ? 'border-red-500/30'
        : accentVariant === 'violet'
          ? 'border-violet-500/30'
          : 'border-border';

  const textColorClass =
    accentVariant === 'green'
      ? 'text-green-600 dark:text-green-400'
      : accentVariant === 'red'
        ? 'text-red-600 dark:text-red-400'
        : accentVariant === 'violet'
          ? 'text-violet-600 dark:text-violet-400'
          : 'text-foreground';

  const accentBgClass =
    accentVariant === 'green'
      ? 'bg-green-500/10'
      : accentVariant === 'red'
        ? 'bg-red-500/10'
        : accentVariant === 'violet'
          ? 'bg-violet-500/10'
          : 'bg-muted/50';

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${borderColorClass} ${accentBgClass} backdrop-blur-sm transition-colors`}
    >
      <div className="p-6">
        <div className="mb-1 text-sm font-medium text-muted-foreground">
          {label}
        </div>
        <div className={`text-3xl font-bold ${textColorClass}`}>
          {value === null ? '—' : value}
        </div>
        {subtitle && (
          <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
        )}
      </div>
    </div>
  );
}

// ── DashboardClient Component ──────────────────────────────────────────────

export default function DashboardClient() {
  const BASE_URL =
    process.env.NEXT_PUBLIC_MEMORY_API_URL?.trim() || 'http://localhost:8888';

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filter state
  const [channelFilter, setChannelFilter] = useState<'all' | 'browser' | 'sip'>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'success' | 'failure'>('all');

  const currentControllerRef = useRef<AbortController | null>(null);

  const fetchMetrics = async () => {
    setStatus('loading');
    const controller = new AbortController();
    currentControllerRef.current = controller;

    try {
      const response = await fetch(`${BASE_URL}/dashboard/metrics`, {
        signal: controller.signal,
      });

      if (currentControllerRef.current === controller) {
        if (response.ok) {
          const data = (await response.json()) as DashboardMetrics;
          setMetrics(data);
          setStatus('success');
          setError(null);
          setLastUpdated(new Date());
        } else {
          setStatus('error');
          setError('Could not load dashboard data. Is the backend running?');
        }
      }
    } catch (err) {
      if (
        currentControllerRef.current === controller &&
        err instanceof Error &&
        err.name !== 'AbortError'
      ) {
        setStatus('error');
        setError('Could not load dashboard data. Is the backend running?');
      }
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  // Live Auto-Refresh polling effect (every 5 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchMetrics();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Derived values
  const successRate = metrics?.success_rate ?? (metrics?.total_calls ? Math.round((metrics.successful_calls / metrics.total_calls) * 1000) / 10 : 0);
  const avgLatency = metrics?.avg_latency_ms ?? 800;

  // Filtered recent calls
  const filteredCalls = (metrics?.recent_calls ?? []).filter((call) => {
    if (channelFilter !== 'all' && call.channel !== channelFilter) return false;
    if (outcomeFilter !== 'all' && call.outcome !== outcomeFilter) return false;
    return true;
  });

  const failureCats = metrics?.failure_categories ?? {
    user_declined: 0,
    incomplete_task: 0,
    tool_failure: 0,
    api_error: 0,
    no_response: 0,
    user_hangup: 0,
  };

  const totalFailures = metrics?.failed_calls ?? 0;

  return (
    <main className="relative min-h-svh w-full overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="bg-primary/8 absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full blur-[160px]" />
        <div className="absolute top-1/3 -left-40 h-[350px] w-[350px] rounded-full bg-violet-400/6 blur-[120px]" />
        <div className="absolute right-0 bottom-0 h-[300px] w-[400px] rounded-full bg-green-400/4 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-28 pb-20">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="bg-primary/10 text-primary mb-2 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-widest uppercase">
              <span className="bg-primary inline-block h-1.5 w-1.5 rounded-full" aria-hidden="true" />
              Day 8 — Live Call Analytics
            </div>
            <h1 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl">
              Call Analytics
            </h1>
            <p className="text-muted-foreground text-sm">
              Real-time call performance, failure path tracking, and response latency metrics
            </p>
          </div>

          {/* Controls: Refresh + Live Auto Refresh Toggle */}
          <div className="mt-4 flex items-center gap-3 sm:mt-0">
            <button
              onClick={() => setAutoRefresh((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                autoRefresh
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-border bg-muted/50 text-muted-foreground'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground'
                }`}
              />
              Live Updates {autoRefresh ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={fetchMetrics}
              disabled={status === 'loading'}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={status === 'loading' ? 'animate-spin' : ''}
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Error message */}
        {status === 'error' && error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Last updated timestamp */}
        {lastUpdated && (
          <div className="mb-6 text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}

        {/* Top 5 Metric Cards Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            label="Total Calls"
            value={metrics?.total_calls ?? null}
            accentVariant="neutral"
            subtitle="Browser + SIP calls"
          />

          <MetricCard
            label="Successful Calls"
            value={metrics?.successful_calls ?? null}
            accentVariant={metrics && metrics.successful_calls > 0 ? 'green' : 'neutral'}
            subtitle="Completed exercise"
          />

          <MetricCard
            label="Failed Calls"
            value={metrics?.failed_calls ?? null}
            accentVariant={metrics && metrics.failed_calls > 0 ? 'red' : 'neutral'}
            subtitle="Incomplete condition"
          />

          <MetricCard
            label="Success Rate"
            value={metrics ? `${successRate}%` : null}
            accentVariant={successRate >= 50 ? 'green' : 'neutral'}
            subtitle="Success percentage"
          />

          <MetricCard
            label="Avg Response Latency"
            value={metrics ? `${avgLatency} ms` : null}
            accentVariant="violet"
            subtitle="Speech turn latency"
          />
        </div>

        {/* Breakdown & Outcomes Row */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {/* Failure Reasons Categorization */}
          <div className="rounded-xl border border-border bg-card/60 p-6 backdrop-blur-sm">
            <h2 className="mb-1 text-lg font-bold text-foreground">Failure Categories</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Categorized reasons why calls did not meet success conditions
            </p>
            <div className="space-y-3">
              {[
                { key: 'user_hangup', label: 'User Hang-up (< 15s)', count: failureCats.user_hangup },
                { key: 'incomplete_task', label: 'Incomplete Task', count: failureCats.incomplete_task },
                { key: 'no_response', label: 'No Response', count: failureCats.no_response },
                { key: 'user_declined', label: 'User Declined', count: failureCats.user_declined },
                { key: 'tool_failure', label: 'Tool Failure', count: failureCats.tool_failure },
                { key: 'api_error', label: 'API Error', count: failureCats.api_error },
              ].map(({ label, count }) => {
                const pct = totalFailures > 0 ? Math.round((count / totalFailures) * 100) : 0;
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-foreground/90">{label}</span>
                      <span className="text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-red-500/70 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Track-Specific Outcomes */}
          <div className="rounded-xl border border-border bg-card/60 p-6 backdrop-blur-sm">
            <h2 className="mb-1 text-lg font-bold text-foreground">Track-Specific Outcomes</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Key learning interaction counters across Vidya sessions
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div>
                  <div className="text-sm font-semibold text-foreground">Completed Practice Exercises</div>
                  <div className="text-xs text-muted-foreground">Scored answer attempts</div>
                </div>
                <div className="text-2xl font-bold text-primary">
                  {metrics?.track_outcomes?.exercises_completed ?? 0}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
                <div>
                  <div className="text-sm font-semibold text-foreground">Teacher Support Escalations</div>
                  <div className="text-xs text-muted-foreground">Support requests created</div>
                </div>
                <div className="text-2xl font-bold text-violet-400">
                  {metrics?.track_outcomes?.escalations_created ?? 0}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                <div>
                  <div className="text-sm font-semibold text-foreground">Call Opt-Out Requests</div>
                  <div className="text-xs text-muted-foreground">Learners opted out</div>
                </div>
                <div className="text-2xl font-bold text-amber-400">
                  {metrics?.track_outcomes?.opt_outs ?? 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Call History Table with Filters */}
        <div className="rounded-xl border border-border bg-card/60 p-6 backdrop-blur-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Recent Call History</h2>
              <p className="text-xs text-muted-foreground">
                Recent sessions with channel, duration, outcome, and failure reason
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Channel filter */}
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value as 'all' | 'browser' | 'sip')}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none"
              >
                <option value="all">All Channels</option>
                <option value="browser">Browser</option>
                <option value="sip">SIP Outbound</option>
              </select>

              {/* Outcome filter */}
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value as 'all' | 'success' | 'failure')}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none"
              >
                <option value="all">All Outcomes</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-muted-foreground uppercase">
                <tr>
                  <th className="py-2.5 px-3">Call ID</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Outcome</th>
                  <th className="py-2.5 px-3">Failure Reason</th>
                  <th className="py-2.5 px-3">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      No matching call history records found.
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-muted/30">
                      <td className="py-3 px-3 font-mono text-foreground font-medium">#{call.id}</td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {new Date(call.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3 px-3 text-foreground">{call.duration_seconds}s</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            call.channel === 'sip'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          {call.channel}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            call.outcome === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {call.outcome}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {call.failure_reason || '—'}
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">{call.latency_ms} ms</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
