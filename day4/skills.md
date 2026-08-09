# VIDYA — DAY 4 IMPLEMENTATION SKILL (UI REDESIGN)

**Role:** Senior frontend engineer  
**Stack:** Next.js 15 / Tailwind CSS v4 / shadcn/ui / Phosphor Icons  
**Scope:** Premium UI redesign — SVG icons, premium hero, Learning Room, panels, animations

---

## RULE 0 — READ BEFORE TOUCHING

Before editing any file:
1. Read the full file
2. Read every import it depends on
3. Run `get_diagnostics`
4. Make the minimal correct change
5. Run `get_diagnostics` again

Never guess prop shapes. Never fabricate LiveKit hook APIs.

---

## RULE 1 — WHAT IS DONE AND MUST NOT CHANGE

**Backend (fully complete — hands off):**
- `database.py`, `learner_repository.py`, `memory_service.py`, `memory_server.py`, `agent.py`

**Frontend (complete — only style changes allowed):**
- `useLearnerMemory` hook — API is stable
- `getUserId()` — stable
- `token/route.ts` — stable
- `view-controller.tsx` session lifecycle — do not break
- `app.tsx` — do not change session connect/disconnect logic

---

## RULE 2 — IMPLEMENTATION TASKS IN PRIORITY ORDER

### TASK 1 — Replace emoji icons with Phosphor SVG (P0, all files)

`@phosphor-icons/react` is already installed. Import and use directly.

Replacement map:

| Emoji | Phosphor component | weight | color class |
|---|---|---|---|
| 🧠 | `Brain` | `duotone` | `text-primary` |
| 🎙 / microphone | `Microphone` | `regular` | `text-cyan-400` |
| 🔊 / speaking | `Waveform` | `regular` | `text-emerald-400` |
| 💡 / thinking | `Lightbulb` | `bold` | `text-violet-400` |
| 💬 / transcript | `ChatTeardrop` | `regular` | current |
| ⚡ / activity | `Lightning` | `bold` | `text-primary` |
| 🔒 / privacy | `Lock` | `duotone` | `text-primary` |
| 🛡 / shield | `ShieldCheck` | `duotone` | `text-primary` |
| 🗑 / forget | `Trash` | `regular` | `text-error` |
| ✓ / check | `CheckCircle` | `duotone` | `text-success` |
| ⚠️ / warning | `Warning` | `bold` | `text-warning` |
| 🎉 / session end | `Star` | `duotone` | `text-warning` |
| → / CTA arrow | `ArrowRight` | `regular` | current |
| 🌐 / language | `Globe` | `regular` | `text-muted-foreground` |
| ✕ / close | `X` | `regular` | current |
| ☰ / hamburger | `List` | `regular` | current |
| 📚 / book open | `BookOpen` | `regular` | current |
| 📐 / math | `MathOperations` | `regular` | `text-violet-400` |
| 🧬 / science | `Atom` | `regular` | `text-cyan-400` |
| ❓ / quiz | `Question` | `regular` | `text-emerald-400` |
| 🏆 / exam | `Certificate` | `regular` | `text-warning` |
| 🔄 / revision | `ArrowsCounterClockwise` | `regular` | `text-secondary` |

```tsx
import { Brain, Microphone, Waveform } from '@phosphor-icons/react';

// Usage — always add aria-hidden="true" for decorative icons
<Brain size={20} weight="duotone" className="text-primary" aria-hidden="true" />

// For buttons with icon-only — add aria-label
<button aria-label="Toggle transcript">
  <ChatTeardrop size={20} weight="regular" aria-hidden="true" />
</button>
```

Do NOT replace:
- Hindi Devanagari characters (text, not icons)
- Flag 🇮🇳 when it is inline text content (not a standalone icon button)
- Custom Book SVG in orb center — it is superior at that scale

---

### TASK 2 — Hero headline size and 2-column layout (P0, `welcome-view.tsx`)

**Headline classes:**
```tsx
// Before (approximate)
className="text-4xl sm:text-5xl lg:text-6xl font-extrabold"

// After
className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight"
```

`text-7xl` = 72px on desktop. This satisfies the ≥56px requirement with headroom.

**Accent the key phrase:**
```tsx
<h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight">
  Learning that{' '}
  <span className="text-primary">remembers you.</span>
</h1>
```

**2-column hero layout (desktop):**
```tsx
<section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[85vh]">
  <div>{/* left: headline, copy, CTAs, badges, topic cards, privacy */}</div>
  <div className="hidden lg:flex justify-center">{/* right: animated orb */}</div>
</section>
```

On mobile (`< lg`), orb moves above text (reorder with CSS `order`):
```tsx
<div className="flex lg:hidden justify-center mb-8 order-first">{/* orb */}</div>
```

---

### TASK 3 — Topic cards (P0, `welcome-view.tsx`)

Replace flat topic chips with full interactive cards:

```tsx
const TOPICS = [
  { label: 'Mathematics',  icon: MathOperations, color: 'text-violet-400', desc: 'Practice equations' },
  { label: 'Science',       icon: Atom,           color: 'text-cyan-400',   desc: 'Explore concepts' },
  { label: 'Fractions',     icon: MathOperations, color: 'text-emerald-400',desc: 'Practice fractions' },
  { label: 'Quick Quiz',    icon: Question,        color: 'text-primary',    desc: 'Test your knowledge' },
  { label: 'Revision',      icon: ArrowsCounterClockwise, color: 'text-secondary', desc: 'Review topics' },
  { label: 'Exam Practice', icon: Certificate,     color: 'text-warning',    desc: 'Prepare for exams' },
];

function TopicCard({ topic, onSelect, selected }) {
  const Icon = topic.icon;
  return (
    <button
      onClick={() => onSelect(topic.label)}
      className={cn(
        'bg-surface border rounded-2xl p-4 text-left cursor-pointer transition-all duration-200',
        'hover:border-primary/40 hover:bg-primary/5',
        selected === topic.label
          ? 'border-primary bg-primary/10'
          : 'border-border'
      )}
    >
      <Icon size={28} weight="regular" className={topic.color} aria-hidden="true" />
      <p className="text-sm font-semibold mt-2">{topic.label}</p>
      <p className="text-xs text-muted-foreground mt-1">{topic.desc}</p>
    </button>
  );
}
```

Grid: `grid grid-cols-2 sm:grid-cols-3 gap-3`

On click, store in sessionStorage:
```tsx
sessionStorage.setItem('vidya_start_topic', topic.label);
```
Then trigger session start.

---

### TASK 4 — Privacy section with SVG icons (P0, `welcome-view.tsx`)

```tsx
const PRIVACY_ITEMS = [
  { icon: Lock,    title: 'Optional Memory',   desc: 'Save learning progress only with your permission.' },
  { icon: ShieldCheck, title: 'Private by design', desc: 'Your data stays in your learner profile.' },
  { icon: Trash,   title: 'Forget anytime',    desc: 'Ask Vidya to clear everything at any time.' },
];

<section className="mt-12 rounded-2xl border border-border bg-surface p-6">
  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
    <Lock size={18} weight="duotone" className="text-primary" aria-hidden="true" />
    Privacy &amp; Memory
  </h2>
  <div className="space-y-3">
    {PRIVACY_ITEMS.map(({ icon: Icon, title, desc }) => (
      <div key={title} className="flex items-start gap-3">
        <Icon size={16} weight="duotone" className="text-primary mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
    ))}
  </div>
</section>
```

---

### TASK 5 — Learning Room state badge (P0, `vidya-learning-room.tsx`)

The state badge must be the most prominent thing above the orb.

```tsx
const STATE_CONFIG = {
  idle:        { label: 'READY',      color: 'text-primary/60',    sublabel: 'Ready to learn' },
  connecting:  { label: 'CONNECTING', color: 'text-primary/70',    sublabel: 'Connecting to Vidya...' },
  listening:   { label: 'LISTENING',  color: 'text-cyan-400',      sublabel: 'Vidya is listening to you...' },
  thinking:    { label: 'THINKING',   color: 'text-violet-400',    sublabel: 'Vidya is thinking...' },
  speaking:    { label: 'SPEAKING',   color: 'text-emerald-400',   sublabel: 'Vidya is speaking...' },
  ended:       { label: 'ENDED',      color: 'text-muted-foreground', sublabel: 'Session ended' },
} as const;

// In JSX, above the orb:
<div className="flex flex-col items-center gap-2 mb-6">
  <div
    role="status"
    aria-live="polite"
    className={cn('font-mono text-xs tracking-[0.2em] uppercase font-bold', STATE_CONFIG[state].color)}
  >
    ● ── {STATE_CONFIG[state].label} ── ●
  </div>
  <p className="text-sm text-muted-foreground italic">
    {STATE_CONFIG[state].sublabel}
  </p>
</div>
```

---

### TASK 6 — AI Activity panel upgrade (P0, `ai-activity-panel.tsx`)

```tsx
import { Microphone, Brain, Lightbulb, Waveform, CheckCircle, Lightning } from '@phosphor-icons/react';

function ActivityIcon({ label }: { label: string }) {
  if (/heard|speech|detected/i.test(label))
    return <Microphone size={14} weight="bold" className="text-cyan-400 shrink-0" />;
  if (/memory|remember|checking/i.test(label))
    return <Brain size={14} weight="bold" className="text-primary shrink-0" />;
  if (/thinking|preparing|understanding/i.test(label))
    return <Lightbulb size={14} weight="bold" className="text-violet-400 shrink-0" />;
  if (/speaking|voice|response/i.test(label))
    return <Waveform size={14} weight="bold" className="text-emerald-400 shrink-0" />;
  return <CheckCircle size={14} weight="bold" className="text-muted-foreground shrink-0" />;
}

// Header
<div className="flex items-center justify-between p-3 border-b border-border">
  <div className="flex items-center gap-2">
    <Lightning size={14} weight="bold" className="text-primary" aria-hidden="true" />
    <span className="text-xs font-mono font-bold uppercase tracking-wider">AI Activity</span>
  </div>
  <span className="text-xs text-muted-foreground font-mono">{events.length}</span>
</div>

// Event item
<div className="flex items-center gap-2 px-3 py-2 hover:bg-surface-2 transition-colors">
  <ActivityIcon label={event.label} />
  <span className="text-xs flex-1">{event.label}</span>
  <span className="text-xs font-mono text-muted-foreground">{event.time}</span>
</div>

// Technical Details (collapsible)
<details className="border-t border-border">
  <summary className="px-3 py-2 text-xs font-mono cursor-pointer text-muted-foreground hover:text-text">
    Technical Details ▾
  </summary>
  <dl className="px-3 py-2 grid grid-cols-2 gap-y-1 text-xs">
    <dt className="text-muted-foreground">STT</dt>  <dd>Deepgram Nova-3</dd>
    <dt className="text-muted-foreground">LLM</dt>  <dd>Gemini 3.5</dd>
    <dt className="text-muted-foreground">DB</dt>   <dd>SQLite</dd>
    <dt className="text-muted-foreground">TTS</dt>  <dd>Murf Falcon</dd>
  </dl>
</details>
```

---

### TASK 7 — Session summary 3rd CTA button (P0, `session-summary.tsx`)

Add a third button. `onContinue` prop already returns to welcome view — reuse it.

```tsx
<div className="flex flex-col gap-3 mt-6">
  <Button onClick={onContinue} className="w-full">
    <ArrowRight size={16} aria-hidden="true" /> Continue Learning
  </Button>
  <Button variant="outline" asChild className="w-full">
    <a href="/memory">
      <Brain size={16} weight="duotone" aria-hidden="true" /> View My Memory
    </a>
  </Button>
  <Button variant="ghost" onClick={onContinue} className="w-full">
    <BookOpen size={16} aria-hidden="true" /> New Topic
  </Button>
</div>
```

---

### TASK 8 — Memory toast on save (P1, `ai-activity-panel.tsx`)

```tsx
import { toast } from 'sonner';
import { Brain } from '@phosphor-icons/react';

// When processing events, detect memory saves:
useEffect(() => {
  if (!latestEvent) return;
  if (/saved|remember/i.test(latestEvent.label)) {
    toast('Saved to your learning memory.', {
      icon: <Brain size={16} weight="duotone" />,
      duration: 3000,
    });
  }
}, [latestEvent]);
```

`<Toaster />` is already in `app.tsx`.

---

### TASK 9 — CSS keyframes for orb rings (P0, `globals.css`)

Add these after existing keyframes. Do NOT add JS animation loops.

```css
/* Orb ring animations */
@keyframes orb-ping-fast {
  0%, 100% { transform: scale(1); opacity: 0.25; }
  50%       { transform: scale(1.15); opacity: 0; }
}
@keyframes orb-ping-slow {
  0%, 100% { transform: scale(1); opacity: 0.15; }
  50%       { transform: scale(1.1); opacity: 0; }
}
@keyframes orb-spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* Per-state ring classes */
.orb-state-listening  .orb-ring { animation: orb-ping-fast 1s ease-in-out infinite; border-color: rgb(34 211 238 / 0.25); }
.orb-state-thinking   .orb-ring { animation: orb-spin-slow 3s linear infinite; border-color: rgb(167 139 250 / 0.25); }
.orb-state-speaking   .orb-ring { animation: orb-ping-fast 0.7s ease-in-out infinite; border-color: rgb(74 222 128 / 0.20); }
.orb-state-connecting .orb-ring { animation: orb-spin-slow 2s linear infinite; border-style: dashed; border-color: rgb(124 92 255 / 0.50); }
.orb-state-idle       .orb-ring { animation: orb-ping-slow 2.5s ease-in-out infinite; border-color: rgb(124 92 255 / 0.12); }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .orb-ring, * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Apply state class to orb container:
```tsx
<div className={cn('orb-container', `orb-state-${agentState}`)}>
  <div className="orb-ring orb-ring-outer" />
  <div className="orb-ring orb-ring-mid" />
  <div className="orb-center">/* Book SVG */</div>
</div>
```

---

## RULE 3 — VERIFICATION AFTER EVERY CHANGE

```bash
cd frontend
pnpm tsc --noEmit   # must be 0 errors
pnpm lint           # must be 0 errors
```

Then check in browser:
1. 1280px — 2-col hero, 72px headline, orb right, topic cards grid
2. 375px — single column, no horizontal scroll, all controls ≥44px tap target
3. Start session — state badge changes color and text per state
4. Transcript panel — slides in from right, Hindi renders in Devanagari
5. Activity panel — slides in from left, icons appear per event type
6. End session — summary shows 3 buttons
7. `/memory` — real data or clean empty state

---

## RULE 4 — DO NOT

- Add `any` TypeScript type
- Add `console.log` with user data
- Fabricate events in AI Activity panel
- Hardcode user name, topic, or memory value in JSX
- Break `AnimatePresence` in `view-controller.tsx`
- Modify any backend file
- Add new npm packages without checking if an equivalent already exists
- Break Day 2 guardrails or Day 3 session states

---

## RULE 5 — DEFINITION OF DONE

```
[ ] No emojis used as primary UI icons
[ ] Hero headline ≥ 72px desktop
[ ] "remembers you." phrase in text-primary accent
[ ] 2-column hero layout on desktop (lg+)
[ ] Topic cards show SVG icons, hover effects, click stores topic
[ ] Privacy section uses Lock / ShieldCheck / Trash SVG icons
[ ] Navbar: backdrop-blur, memory indicator with Brain icon
[ ] Learning Room: ● ── STATE ── ● badge color-coded and aria-live
[ ] AI Activity: icon + label + time per event, Technical Details drawer
[ ] Transcript: slide-in panel on desktop, accordion on mobile, Devanagari renders
[ ] Memory journey card: guard — only shown when SQLite data is real
[ ] Session summary: 3 CTA buttons functional (Continue, Memory, New Topic)
[ ] CSS keyframe rings — not JS — per orb state
[ ] prefers-reduced-motion respected
[ ] pnpm tsc --noEmit → 0 errors
[ ] pnpm lint → 0 errors
[ ] pnpm build → 0 errors
[ ] Mobile 375px — usable, no horizontal scroll
[ ] Hindi Devanagari renders in transcript
[ ] Memory toast fires when agent confirms a save
```
