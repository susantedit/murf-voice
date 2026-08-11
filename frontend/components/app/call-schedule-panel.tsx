'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  BellSlash,
  CheckCircle,
  Clock,
  FloppyDisk,
  Phone,
  Warning,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { getUserId } from '@/lib/user-identity';
import type { ScheduleConfig } from '@/types/call';

/* ── API response shape from GET /memory/{user_id} ── */
interface MemoryWithSchedule {
  preferred_time?: string | null;
  sip_uri?: string | null;
  call_opt_out?: number | null;
  [key: string]: unknown;
}

/* ── Helpers ── */
const API_BASE = process.env.NEXT_PUBLIC_MEMORY_API_URL ?? 'http://localhost:8888';

async function fetchSchedule(userId: string): Promise<MemoryWithSchedule> {
  const res = await fetch(`${API_BASE}/memory/${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  return res.json() as Promise<MemoryWithSchedule>;
}

async function saveSchedule(config: ScheduleConfig): Promise<void> {
  const res = await fetch(`${API_BASE}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Status ${res.status}`);
  }
}

/* ── Component ── */
export function CallSchedulePanel() {
  const [preferredTime, setPreferredTime] = useState<string>('08:00');
  const [sipUri, setSipUri] = useState<string>('');
  const [isOptedOut, setIsOptedOut] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [reenabling, setReenabling] = useState<boolean>(false);

  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* 13.1 — Fetch current schedule on mount */
  useEffect(() => {
    const userId = getUserId();
    if (!userId || userId === 'server-side') {
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetchSchedule(userId)
      .then((data) => {
        if (cancelled) return;
        if (data.preferred_time) setPreferredTime(data.preferred_time);
        if (data.sip_uri) setSipUri(data.sip_uri);
        setIsOptedOut((data.call_opt_out ?? 0) !== 0);
      })
      .catch(() => {
        /* non-fatal — leave defaults */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* 13.5 — Save handler */
  const handleSave = async () => {
    const userId = getUserId();
    if (!userId || userId === 'server-side' || !sipUri.trim()) return;

    setSaving(true);
    setConfirmation(null);
    setError(null);

    try {
      await saveSchedule({ user_id: userId, preferred_time: preferredTime, sip_uri: sipUri });
      setConfirmation(`Vidya will call you daily at ${preferredTime}`);
      setIsOptedOut(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  };

  /* 13.6 — Re-enable handler: POST the current schedule with call_opt_out intent */
  const handleReEnable = async () => {
    const userId = getUserId();
    if (!userId || userId === 'server-side' || !sipUri.trim()) return;

    setReenabling(true);
    setConfirmation(null);
    setError(null);

    try {
      // Saving the schedule again re-enables calls via the server-side logic
      // (the schedule endpoint upserts preferred_time + sip_uri, which makes
      // the user schedulable again once opt_out is cleared server-side).
      await saveSchedule({ user_id: userId, preferred_time: preferredTime, sip_uri: sipUri });
      setIsOptedOut(false);
      setConfirmation(`Scheduled calls re-enabled. Vidya will call you daily at ${preferredTime}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to re-enable scheduled calls.');
    } finally {
      setReenabling(false);
    }
  };

  /* ── Render ── */
  if (loading) {
    return (
      <div
        className="border-foreground/8 bg-background/60 flex items-center gap-3 rounded-2xl border p-5 backdrop-blur-sm"
        aria-busy="true"
      >
        <span
          className="border-t-primary/60 inline-block h-4 w-4 rounded-full border-2 border-transparent motion-safe:animate-spin"
          aria-hidden="true"
        />
        <p className="text-muted-foreground text-sm">Loading schedule…</p>
      </div>
    );
  }

  const canSave = sipUri.trim().length > 0;

  return (
    <section
      className="border-foreground/8 bg-background/60 flex flex-col gap-5 rounded-2xl border p-5 backdrop-blur-sm"
      aria-label="Daily call schedule settings"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <Phone size={18} weight="duotone" className="text-primary shrink-0" aria-hidden="true" />
        <h2 className="text-foreground text-sm font-bold tracking-wide">Daily Practice Call</h2>
      </div>

      {/* 13.6 — Opt-out banner */}
      {isOptedOut && (
        <div
          className="flex flex-col gap-3 rounded-xl border border-amber-400/20 bg-amber-400/8 p-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <BellSlash
              size={16}
              weight="duotone"
              className="mt-0.5 shrink-0 text-amber-400"
              aria-hidden="true"
            />
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-amber-300">
                Scheduled calls are currently paused
              </p>
              <p className="text-xs leading-relaxed text-amber-300/70">
                You opted out of daily calls. Save your schedule below to re-enable them.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReEnable}
            disabled={reenabling || !canSave}
            className="self-start rounded-full border-amber-400/30 text-xs text-amber-300 hover:bg-amber-400/10"
            aria-label="Re-enable scheduled daily calls"
          >
            {reenabling ? (
              <>
                <span
                  className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
                  aria-hidden="true"
                />
                Re-enabling…
              </>
            ) : (
              <>
                <Bell size={13} weight="bold" aria-hidden="true" />
                Re-enable Calls
              </>
            )}
          </Button>
          {!canSave && (
            <p className="text-[11px] text-amber-300/60">Enter a SIP URI below to re-enable.</p>
          )}
        </div>
      )}

      {/* ── Form ── */}
      <div className="flex flex-col gap-4">
        {/* 13.2 — Preferred time input */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="preferred-time"
            className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium"
          >
            <Clock size={12} weight="regular" aria-hidden="true" />
            Preferred call time
          </label>
          <input
            id="preferred-time"
            type="time"
            value={preferredTime}
            onChange={(e) => {
              setPreferredTime(e.target.value);
              setConfirmation(null);
            }}
            className="border-foreground/10 bg-background/40 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 h-9 w-full rounded-lg border px-3 text-sm transition-colors outline-none focus:ring-2"
            aria-label="Preferred call time in 24-hour format"
          />
        </div>

        {/* 13.3 — SIP URI input */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="sip-uri"
            className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium"
          >
            <Phone size={12} weight="regular" aria-hidden="true" />
            SIP address (Linphone)
          </label>
          <input
            id="sip-uri"
            type="text"
            value={sipUri}
            onChange={(e) => {
              setSipUri(e.target.value);
              setConfirmation(null);
              setError(null);
            }}
            placeholder="sip:username@sip.linphone.org"
            className="border-foreground/10 bg-background/40 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 h-9 w-full rounded-lg border px-3 text-sm transition-colors outline-none focus:ring-2"
            aria-label="SIP URI for receiving calls"
            aria-describedby="sip-uri-hint"
            aria-invalid={!canSave}
          />
          {/* 13.4 — Hint text when SIP URI is empty */}
          {!canSave && (
            <p id="sip-uri-hint" className="text-muted-foreground text-[11px]" aria-live="polite">
              Enter your Linphone SIP address to enable scheduled calls.
            </p>
          )}
        </div>
      </div>

      {/* ── Feedback messages ── */}
      {confirmation && (
        <div
          className="border-primary/20 bg-primary/8 flex items-center gap-2 rounded-xl border px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <CheckCircle
            size={15}
            weight="duotone"
            className="text-primary shrink-0"
            aria-hidden="true"
          />
          <p className="text-primary text-xs font-medium">{confirmation}</p>
        </div>
      )}

      {error && (
        <div
          className="border-destructive/20 bg-destructive/8 flex items-center gap-2 rounded-xl border px-4 py-3"
          role="alert"
          aria-live="assertive"
        >
          <Warning
            size={15}
            weight="duotone"
            className="text-destructive shrink-0"
            aria-hidden="true"
          />
          <p className="text-destructive text-xs font-medium">{error}</p>
        </div>
      )}

      {/* 13.4 / 13.5 — Save button */}
      <Button
        size="sm"
        onClick={handleSave}
        disabled={!canSave || saving}
        className="shadow-primary/20 self-start rounded-full font-mono text-xs font-bold tracking-widest uppercase shadow-sm transition-all duration-200 hover:scale-105 active:scale-95 disabled:hover:scale-100"
        aria-label={
          canSave
            ? `Save schedule — Vidya will call at ${preferredTime}`
            : 'Enter a SIP URI to save'
        }
        aria-disabled={!canSave}
      >
        {saving ? (
          <>
            <span
              className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
              aria-hidden="true"
            />
            Saving…
          </>
        ) : (
          <>
            <FloppyDisk size={13} weight="bold" aria-hidden="true" />
            Save Schedule
          </>
        )}
      </Button>

      {/* Help text */}
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        Vidya will call your Linphone app daily at the selected time. Make sure Linphone is running
        and registered with your SIP account.
      </p>
    </section>
  );
}
