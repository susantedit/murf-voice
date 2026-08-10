'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAgent, useSessionContext, useSessionMessages } from '@livekit/components-react';
import {
  BookOpen,
  Brain,
  CheckCircle,
  CircleNotch,
  Lightbulb,
  Lightning,
  Microphone,
  Warning,
  Waveform,
} from '@phosphor-icons/react';
import { useToolEvents } from '@/hooks/useToolEvents';
import type { ToolEvent } from '@/hooks/useToolEvents';
import { cn } from '@/lib/shadcn/utils';

// ── Types ──────────────────────────────────────────────────────────────────

type EventKind = 'heard' | 'memory' | 'thinking' | 'speaking' | 'tool' | 'error' | 'default';

interface ActivityItem {
  id: string;
  kind: EventKind;
  label: string;
  timestamp: Date;
  raw?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

let counter = 0;
function makeId() {
  return `act-${Date.now()}-${++counter}`;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function classifyKind(label: string): EventKind {
  const l = label.toLowerCase();
  if (l.includes('heard') || l.includes('speech')) return 'heard';
  if (l.includes('memory') || l.includes('checking') || l.includes('saved')) return 'memory';
  if (l.includes('think') || l.includes('understanding') || l.includes('preparing'))
    return 'thinking';
  if (l.includes('speaking') || l.includes('vidya is speak')) return 'speaking';
  return 'default';
}

/** Map a tool event to a human-readable activity item. */
function toolEventToItem(event: ToolEvent): ActivityItem {
  let label = event.label ?? event.type;
  let kind: EventKind = 'tool';

  switch (event.type) {
    case 'tool_start':
      label =
        event.label ??
        (event.tool === 'score_answer' ? 'Checking your answer...' : 'Fetching next exercise...');
      kind = 'tool';
      break;
    case 'exercise_ready':
      label = event.topic ? `✓ Exercise selected — ${event.topic}` : '✓ Exercise selected';
      kind = 'tool';
      break;
    case 'answer_scored':
      label = event.result ? `✓ Answer evaluated — ${event.result}` : '✓ Answer evaluated';
      kind = 'tool';
      break;
    case 'tool_error':
      label = event.label ?? 'Tool error';
      kind = 'error';
      break;
  }

  return {
    id: makeId(),
    kind,
    label,
    timestamp: event.receivedAt,
    raw: `${event.type}${event.tool ? ` / ${event.tool}` : ''}`,
  };
}

// ── Icon per kind ──────────────────────────────────────────────────────────

function KindIcon({ kind, className }: { kind: EventKind; className?: string }) {
  const base = cn('shrink-0', className);
  switch (kind) {
    case 'heard':
      return (
        <Microphone
          size={14}
          weight="bold"
          className={cn(base, 'text-cyan-400')}
          aria-hidden="true"
        />
      );
    case 'memory':
      return (
        <Brain size={14} weight="duotone" className={cn(base, 'text-primary')} aria-hidden="true" />
      );
    case 'thinking':
      return (
        <Lightbulb
          size={14}
          weight="bold"
          className={cn(base, 'text-violet-400')}
          aria-hidden="true"
        />
      );
    case 'speaking':
      return (
        <Waveform
          size={14}
          weight="bold"
          className={cn(base, 'text-emerald-400')}
          aria-hidden="true"
        />
      );
    case 'tool':
      return (
        <BookOpen size={14} weight="bold" className={cn(base, 'text-primary')} aria-hidden="true" />
      );
    case 'error':
      return (
        <Warning size={14} weight="bold" className={cn(base, 'text-red-400')} aria-hidden="true" />
      );
    default:
      return (
        <CheckCircle
          size={14}
          weight="bold"
          className={cn(base, 'text-muted-foreground')}
          aria-hidden="true"
        />
      );
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function AIActivityPanel({ className }: { className?: string }) {
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);
  const { state: agentState } = useAgent();

  // Day 5 — real tool events from the vidya-tools data channel
  const toolEvents = useToolEvents();

  const [items, setItems] = useState<ActivityItem[]>([]);
  const [techOpen, setTechOpen] = useState(false);

  const prevAgentState = useRef<string | undefined>(undefined);
  const prevMessageCount = useRef<number>(0);
  const prevToolEventCount = useRef<number>(0);
  const hasCheckedMemory = useRef(false);

  function addItem(label: string, raw?: string, kind?: EventKind) {
    const resolvedKind = kind ?? classifyKind(label);
    setItems((prev) => [
      { id: makeId(), kind: resolvedKind, label, timestamp: new Date(), raw },
      ...prev,
    ]);
  }

  // Watch agent state transitions
  useEffect(() => {
    if (agentState === prevAgentState.current) return;
    const prev = prevAgentState.current;
    prevAgentState.current = agentState;

    if (agentState === 'thinking') {
      if (!hasCheckedMemory.current) {
        hasCheckedMemory.current = true;
        addItem('Checking learning memory...', 'agentState → thinking (first)');
      }
      addItem('Preparing response...', 'agentState → thinking');
    } else if (agentState === 'speaking') {
      const latestAgentMsg = [...messages].reverse().find((m) => m.from?.isLocal === false);
      const msgText = latestAgentMsg?.message?.toLowerCase() ?? '';
      const isMemorySave =
        msgText.includes("i've saved") ||
        msgText.includes("i'll remember") ||
        msgText.includes('saved to memory') ||
        msgText.includes("i've noted") ||
        msgText.includes("i'll note") ||
        msgText.includes('noted that');

      if (prev === 'thinking' && isMemorySave) {
        addItem('Memory saved with your permission', 'memory save detected');
        toast('Saved to your learning memory.', {
          icon: <Brain size={16} weight="duotone" />,
          duration: 3000,
        });
      }
      addItem('Vidya is speaking', 'agentState → speaking');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentState]);

  // Watch for new user messages (STT)
  useEffect(() => {
    const currentCount = messages.length;
    if (currentCount <= prevMessageCount.current) return;
    const newMessages = messages.slice(prevMessageCount.current);
    prevMessageCount.current = currentCount;
    const hasUserMsg = newMessages.some((m) => m.from?.isLocal === true);
    if (hasUserMsg) addItem('Heard you', 'STT transcript received');
  }, [messages]);

  // Watch for new tool events from the vidya-tools data channel (Day 5)
  useEffect(() => {
    const currentCount = toolEvents.length;
    if (currentCount <= prevToolEventCount.current) return;

    const newEvents = toolEvents.slice(prevToolEventCount.current);
    prevToolEventCount.current = currentCount;

    // Convert each new tool event to an activity item and prepend (newest first)
    const newItems = newEvents.map(toolEventToItem);
    setItems((prev) => [...newItems.reverse(), ...prev]);
  }, [toolEvents]);

  return (
    <div
      className={cn(
        'border-border/60 bg-background/60 flex flex-col gap-3 rounded-2xl border p-4 backdrop-blur-sm',
        className
      )}
      aria-label="AI activity feed"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-foreground flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase">
          <Lightning size={14} weight="bold" className="text-primary" aria-hidden="true" />
          AI Activity
        </h3>
        {items.length > 0 && (
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
            {items.length}
          </span>
        )}
      </div>

      {/* Activity feed */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <CircleNotch
            size={20}
            className="text-muted-foreground/40 motion-safe:animate-spin"
            aria-hidden="true"
          />
          <p className="text-muted-foreground text-xs">
            Activity will appear once the session starts.
          </p>
        </div>
      ) : (
        <ul
          className="flex max-h-52 flex-col gap-1.5 overflow-y-auto"
          aria-live="polite"
          aria-label="Activity items"
        >
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                'border-border/40 bg-background/40 flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5',
                item.kind === 'error' && 'border-red-500/20 bg-red-500/5'
              )}
            >
              <span className="flex items-center gap-2">
                <KindIcon kind={item.kind} />
                <span
                  className={cn('text-foreground text-xs', item.kind === 'error' && 'text-red-400')}
                >
                  {item.label}
                </span>
              </span>
              <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
                {formatTime(item.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Technical Details — collapsed by default */}
      <details
        open={techOpen}
        onToggle={(e) => setTechOpen((e.target as HTMLDetailsElement).open)}
        className="mt-1"
      >
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px] font-semibold tracking-wider uppercase transition-colors select-none">
          Technical Details {techOpen ? '▲' : '▼'}
        </summary>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {[
            ['STT', 'Deepgram Nova-3'],
            ['LLM', 'Groq Llama-3.3'],
            ['Memory', 'SQLite'],
            ['TTS', 'Murf Falcon'],
          ].map(([k, v]) => (
            <span key={k} className="contents">
              <dt className="text-muted-foreground/60 text-[11px] font-semibold">{k}</dt>
              <dd className="text-muted-foreground text-[11px]">{v}</dd>
            </span>
          ))}
          {items.length > 0 && (
            <>
              <dt className="text-muted-foreground/60 col-span-2 mt-2 text-[11px] font-semibold">
                Raw events
              </dt>
              {items.slice(0, 8).map((item) => (
                <span key={`raw-${item.id}`} className="contents">
                  <dt className="text-muted-foreground/50 text-[10px] tabular-nums">
                    {formatTime(item.timestamp)}
                  </dt>
                  <dd className="text-muted-foreground/70 truncate font-mono text-[10px]">
                    {item.raw ?? item.label}
                  </dd>
                </span>
              ))}
            </>
          )}
        </dl>
      </details>
    </div>
  );
}
