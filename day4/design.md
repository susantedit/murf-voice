# VIDYA — DAY 4 DESIGN SYSTEM (FINAL)

**Version:** Day 4 UI Redesign  
**Stack:** Next.js 15, Tailwind CSS v4, shadcn/ui, motion/react, Phosphor Icons  
**Fonts:** Public Sans (Latin), Noto Sans Devanagari (Hindi), JetBrains Mono / CommitMono (labels)

---

## 1. Design Principle

> The database should never be the visual focus. The user came to learn.

Priority hierarchy:
```
Learning → Voice → Personalization → Memory
```

Memory UI should make a returning user feel **"Vidya remembers me"**, not **"a database is tracking me"**.

---

## 2. Color Tokens

Define in `globals.css` as CSS custom properties. Never hardcode hex values in components.

```css
/* Backgrounds */
--color-bg:           #070A17;   /* deep navy — page background */
--color-surface:      #0D1224;   /* card / panel base */
--color-surface-2:    #131A31;   /* elevated surface, modals */

/* Brand */
--color-primary:      #7C5CFF;   /* indigo-violet — CTAs, accent */
--color-secondary:    #45D6FF;   /* cyan — listening state */
--color-accent:       #A78BFA;   /* soft violet — hover, thinking */

/* Semantic */
--color-success:      #4ADE80;   /* speaking state, saves */
--color-warning:      #FBBF24;
--color-error:        #FB7185;

/* Text */
--color-text:         #F8FAFC;
--color-text-muted:   #A8B1C7;

/* Borders */
--color-border:       rgba(255,255,255,0.08);
```

Tailwind config: map these vars to semantic color names so `text-primary`, `bg-surface`, `border-border` work.

---

## 3. Typography Scale

| Usage | Desktop | Mobile | Weight | Font |
|---|---|---|---|---|
| Hero headline | 72px / `text-7xl` | 40px / `text-4xl` | 800 | Public Sans |
| Section title | 40px / `text-4xl` | 28px / `text-3xl` | 700 | Public Sans |
| Card title | 20px / `text-xl` | 18px / `text-lg` | 600 | Public Sans |
| Body | 16px / `text-base` | 15px | 400 | Public Sans |
| Label / badge | 11px | 10px | 700 | CommitMono |
| Hindi body | 16px | 15px | 400 | Noto Sans Devanagari |

Minimum body text: 13px. Never smaller.

---

## 4. Icon System — Phosphor Icons (No Emoji as Icons)

Install: `@phosphor-icons/react` (already in project).

Every emoji used as a UI icon must be replaced with the matching Phosphor SVG below.

| Concept | Phosphor component | Weight | Color class |
|---|---|---|---|
| Brand / Education | Custom Book SVG | — | `text-primary` |
| Memory / Brain | `Brain` | `duotone` | `text-primary` |
| Microphone / Listening | `Microphone` | `regular` | `text-cyan-400` |
| Speaking / Waveform | `Waveform` | `regular` | `text-emerald-400` |
| Thinking / Lightbulb | `Lightbulb` | `bold` | `text-violet-400` |
| Connecting / Spinner | `CircleNotch` (animated spin) | `regular` | `text-primary/70` |
| Lock / Privacy | `Lock` | `duotone` | `text-primary` |
| Shield | `ShieldCheck` | `duotone` | `text-primary` |
| Delete / Forget | `Trash` | `regular` | `text-error` |
| Success / Check | `CheckCircle` | `duotone` | `text-success` |
| Warning | `Warning` | `bold` | `text-warning` |
| Arrow CTA | `ArrowRight` | `regular` | current color |
| Transcript | `ChatTeardrop` | `regular` | `text-muted` |
| AI Activity | `Lightning` | `bold` | `text-primary` |
| Star / Session end | `Star` | `duotone` | `text-warning` |
| Globe / Language | `Globe` | `regular` | `text-muted` |
| Close | `X` | `regular` | `text-muted` |
| Hamburger | `List` | `regular` | current color |
| Book open (topics) | `BookOpen` | `regular` | topic color |
| Math | `MathOperations` | `regular` | `text-violet-400` |
| Science / Atom | `Atom` | `regular` | `text-cyan-400` |
| Quiz / Question | `Question` | `regular` | `text-emerald-400` |
| Exam | `Certificate` | `regular` | `text-warning` |
| Revision | `ArrowsCounterClockwise` | `regular` | `text-secondary` |

Usage pattern:
```tsx
import { Brain, Microphone } from '@phosphor-icons/react';
<Brain size={20} weight="duotone" className="text-primary" aria-hidden="true" />
```

**The custom Book SVG in the orb center is kept as-is** — hand-crafted, better at that size.

**Never replace:**
- Hindi Devanagari characters — these are text content, not icons
- Flag emoji (🇮🇳) when it is inline text content, not a standalone icon

---

## 5. Component Specifications

### 5.1 NavBar

```
┌──────────────────────────────────────────────────────────────────┐
│ [BookSVG] VIDYA          Learn  Memory  About    [Start Learning] │
│           AI Learning Assistant                                    │
└──────────────────────────────────────────────────────────────────┘
```

- `position: fixed; top: 0; z-index: 50`
- `backdrop-blur-md` + `bg-bg/80` + `border-b border-border`
- Logo: CommitMono 14px bold + muted 9px subtitle line
- Nav links: 14px, `text-muted` → `text-text` on hover, 200ms transition
- CTA: `rounded-full px-5 py-2 bg-primary text-white` hover: `bg-primary/90`
- Memory indicator right of links: `[Brain size=14] Memory: Your choice` — links to `/memory`
- Mobile (< 768px): hamburger `<List />` opens dropdown with same links + CTA

---

### 5.2 Hero Section — Welcome View

Desktop layout (2-column, 55/45 split, `gap-12`):

**LEFT COLUMN**
```
[Badge pill: "AI Voice Learning Assistant" with Lightning icon]

Learning that
remembers you.          ← "remembers you." in text-primary color

Vidya saves learning preferences you choose,
so every session picks up where you left off.

[Microphone icon] Start Learning    [ArrowRight] View My Memory

─────────────────────────────────────────────────────
[Globe] हिंदी + English     [Microphone] Voice-first
[Brain] Optional Memory     [Lock] Privacy-focused
─────────────────────────────────────────────────────

[ Understand ]  [ Practice ]  [ Revise ]  [ Learn Naturally ]
  (feature cards with SVG icons, glass border)

Try asking Vidya:
[chip] Explain photosynthesis   [chip] Quiz me on algebra
[chip] हिंदी में समझाओ          [chip] Practice fractions

──────────────────────────────
What would you like to practice?

[Mathematics] [Science] [Fractions] [Quick Quiz] [Revision] [Exam Practice]
  (cards with SVG icon, title, description, hover:border-primary/40)

──────────────────────────────
Privacy & Memory

[Lock]   Optional Memory — save only with your permission
[Shield] Private by design — stays in your learner profile  
[Trash]  Forget anytime — ask Vidya to clear everything
```

**RIGHT COLUMN**
```
┌──────────────────────────┐
│                          │
│   ·· pulse rings ··      │
│                          │
│   ┌──────────────────┐   │
│   │                  │   │
│   │   [Book SVG]     │   │
│   │     VIDYA        │   │
│   │                  │   │
│   └──────────────────┘   │
│                          │
│   ·· pulse rings ··      │
│                          │
└──────────────────────────┘
```

Mobile: single column, orb above text, headline 40px.

Headline: `text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight`  
"remembers you." span: `text-primary`

---

### 5.3 Returning User Card (hero, shown only when `memory.found === true`)

```
┌──────────────────────────────────────────────────────┐
│  [CheckCircle] Continue where you left off           │
│  Last topic: Fractions              [Continue Learning →]│
└──────────────────────────────────────────────────────┘
```

- Glass card: `border border-primary/20 bg-primary/5 rounded-2xl`
- Only shown when `useLearnerMemory` returns `found: true` with real data

---

### 5.4 Topic Cards — "What would you like to practice?"

6 cards in a responsive grid (`grid-cols-2 sm:grid-cols-3`):

```
┌────────────────────┐
│ [MathOperations]   │
│ Mathematics        │
│ Practice concepts  │
│ and equations      │
└────────────────────┘
```

Cards: `bg-surface border border-border rounded-2xl p-4 cursor-pointer`  
Hover: `border-primary/40 bg-primary/5` transition 200ms  
Active / selected: `border-primary bg-primary/10`  
Icon: 28px, colored per topic  
Title: 16px semibold  
Description: 12px muted

On click: store topic in `sessionStorage('vidya_start_topic', topic)`, then trigger session start.

---

### 5.5 VidyaLearningRoom — Full Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ [BookSVG] VIDYA   Learning Room      [Brain] Memory   [ChatTeardrop] Transcript │
│                                                    [Lightning] Activity         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ACTIVITY PANEL ◄──────── center ────────────────► TRANSCRIPT     │
│  (left slide)                                        (right slide) │
│                                                                    │
│                     ┌────────────────────────┐                    │
│                     │                        │                    │
│                     │   ~~ pulse rings ~~    │                    │
│                     │   [Book SVG orb]       │                    │
│                     │   ~~ pulse rings ~~    │                    │
│                     │                        │                    │
│                     └────────────────────────┘                    │
│                                                                    │
│              ● ── LISTENING ── ●                                  │
│              (CommitMono 11px, letter-spacing 0.2em, color-coded) │
│              "Vidya is listening to you..."                        │
│              (14px muted, below badge)                             │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│  Need inspiration? Try asking:                                     │
│  [BookOpen] Algebra  [Atom] Biology  [MathOperations] Fractions   │
│  [Question] Quiz me  [Globe] हिंदी में समझाओ                      │
├────────────────────────────────────────────────────────────────────┤
│  [Brain] YOUR LEARNING JOURNEY                                     │
│  Welcome back, Aarav · Last topic: Fractions                       │
│  ████████░░  3 topics explored  [Memory saved with your permission]│
│  (only shown when SQLite has real consented data)                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│    [Microphone] Mute    [X] END SESSION    [ChatTeardrop] Transcript│
└────────────────────────────────────────────────────────────────────┘
```

**Activity panel (left slide-in on desktop, accordion on mobile):**
Width 0 → 320px, opacity 0 → 1, duration 250ms easeInOut.

**Transcript panel (right slide-in on desktop, accordion on mobile):**
Same animation, opposite direction.

Both panels: `bg-surface/95 backdrop-blur-md border border-border`

---

### 5.6 State Badge Spec

Format: `● ── LABEL ── ●`  
Font: CommitMono 11px, `letter-spacing: 0.2em`, uppercase, `aria-live="polite"`  
Sublabel: 14px, muted, italic, below badge

| State | Badge color | Orb outer ring | Mid ring | Glow | Sublabel |
|---|---|---|---|---|---|
| idle | `text-primary/60` | slow ping `primary/12` | slow pulse `primary/10` | `primary/8` | "Ready to learn" |
| connecting | `text-primary/70` | spin dashed `primary/50` | spin `primary/20` | `primary/8` | "Connecting to Vidya..." |
| listening | `text-cyan-400` | fast ping `cyan-400/25` | fast pulse `cyan-400/20` | `cyan-400/12` | "Vidya is listening to you..." |
| thinking | `text-violet-400` | slow spin `violet-400/25` | slow spin `violet-400/25` | `violet-400/15` | "Vidya is thinking..." |
| speaking | `text-emerald-400` | fast ping `emerald-400/20` | fast pulse `emerald-400/20` | `emerald-400/15` | "Vidya is speaking..." |
| ended | `text-muted` | none | none | none | "Session ended" |

All ring animations must use CSS `@keyframes` in `globals.css`, not JS intervals.  
All rings must have `motion-safe:` Tailwind prefix so they stop on reduced-motion systems.

---

### 5.7 AI Activity Panel

```
┌──────────────────────────────────────┐
│ [Lightning] AI ACTIVITY           3  │
├──────────────────────────────────────┤
│ [Microphone] Heard you       12:04   │
│ [Brain]      Checking memory 12:04   │
│ [Lightbulb]  Preparing...    12:05   │
│ [Waveform]   Vidya speaking  12:05   │
├──────────────────────────────────────┤
│ Technical Details ▾                   │
│ STT   Deepgram Nova-3                 │
│ LLM   Gemini 3.5                      │
│ DB    SQLite                          │
│ TTS   Murf Falcon                     │
└──────────────────────────────────────┘
```

- Each item: icon (14px) + label (13px) + timestamp (11px CommitMono muted)
- Items scroll newest to top, max 6 visible without scroll
- All items backed by real LiveKit session events — no fabricated entries
- Technical Details: `<details>` element, static stack info + raw event log
- Count badge (top right): number of events this session

Icon mapping (update `ai-activity-panel.tsx`):
```tsx
function ActivityIcon({ label }: { label: string }) {
  if (/heard|speech|detected/i.test(label))    return <Microphone size={14} weight="bold" className="text-cyan-400" />;
  if (/memory|remember|checking/i.test(label)) return <Brain size={14} weight="bold" className="text-primary" />;
  if (/thinking|preparing|understanding/i.test(label)) return <Lightbulb size={14} weight="bold" className="text-violet-400" />;
  if (/speaking|voice|response/i.test(label))  return <Waveform size={14} weight="bold" className="text-emerald-400" />;
  return <CheckCircle size={14} weight="bold" className="text-muted-foreground" />;
}
```

---

### 5.8 Transcript Panel

```
┌──────────────────────────────┐
│ [ChatTeardrop] Live Transcript   × │
├──────────────────────────────┤
│ YOU                          │
│ मुझे algebra समझ नहीं आ रहा │
│                              │
│ VIDYA                        │
│ कोई बात नहीं! Let's start    │
│ with the basics.             │
├──────────────────────────────┤
│ [Globe] Hindi → देवनागरी     │
├──────────────────────────────┤
│ [Brain] Learning Context     │
│ Level: Class 10              │
│ Language: Hinglish           │
│ Topics: [Fractions]          │
└──────────────────────────────┘
```

- Font stack for transcript content must include `'Noto Sans Devanagari', sans-serif`
- Add `lang="hi"` attribute to Hindi text spans
- User messages: right-aligned or left with "YOU" label in CommitMono
- Vidya messages: left-aligned, `text-primary` label "VIDYA"
- Auto-scroll to latest message

---

### 5.9 Session Summary

```
┌────────────────────────────────┐
│           [Star]               │
│      Great session!            │
│   Here's what we covered.      │
│                                │
│  Topics discussed              │
│  • Photosynthesis              │
│  • Algebra basics              │
│                                │
│  [Brain] Added to memory       │
│  Vidya saved your learning     │
│  preferences this session.     │
│  (hidden if nothing saved)     │
│                                │
│  [Continue Learning]           │
│  [View My Memory]              │
│  [BookOpen] New Topic          │
└────────────────────────────────┘
```

No fabricated: session durations, question counts, progress percentages.

---

### 5.10 Memory Page (`/memory`)

**With data:**
```
┌────────────────────────────────┐
│ [Brain] Aarav          [Trash] │
│ Last active: 2 hours ago       │
│ ────────────────────────────── │
│ Level     Language    Goal     │
│ Class 10  Hinglish    Science  │
│                                │
│ Topics                         │
│ [Photosynthesis] [Algebra]     │
│                                │
│ [Lock] Only saved with your    │
│        permission.             │
└────────────────────────────────┘
```

**Empty state:**
```
┌────────────────────────────────┐
│              [Brain]           │
│  Your learning memory is empty │
│  Start a session — Vidya can   │
│  remember with your permission │
│                                │
│  [Lock] Only saves what you    │
│         choose to share.       │
│                                │
│       [Start Learning]         │
└────────────────────────────────┘
```

---

## 6. Motion Spec

### Page transitions
- View changes: opacity fade 0.5s linear (existing `AnimatePresence`)

### Panels
- Slide-in: `width: 0 → 320px` + `opacity: 0 → 1`, 250ms `easeInOut`

### Orb rings
- CSS `@keyframes` only, not JS
- Outer ring class `.orb-ring-outer` — keyframe changes per state via CSS class swap
- No JS `setInterval` for animations

### Memory save micro-interaction
1. Brain icon in navbar: `scale(1) → scale(1.2) → scale(1)`, 400ms
2. Sonner toast bottom-center: `"Saved to your learning memory."`, 3s auto-dismiss

### Forget modal
1. MemoryCard fades to `opacity-30`
2. Items dissolve with stagger 50ms each
3. Empty state fades in

### Reduced motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
Orb ring classes: prefix with `motion-safe:` in Tailwind.

---

## 7. Responsive Breakpoints

| Breakpoint | Width | Changes |
|---|---|---|
| Mobile S | 320px | Single column, no side panels, all sections stacked |
| Mobile M | 375px | Standard mobile layout |
| Tablet | 768px | Reduced orb size, stacked cards |
| Desktop | 1024px+ | 2-column hero, side panels in Learning Room |

Rules:
- No horizontal scroll at any width
- Touch targets: minimum 44×44px
- Side panels (Transcript, Activity): only on desktop; collapse to `<details>` accordions on mobile

---

## 8. Accessibility

- All icon-only buttons: `aria-label` with descriptive text
- State badge: `role="status"` `aria-live="polite"`
- Destructive actions (Forget Everything): require confirmation modal before execution
- All interactive elements: visible focus ring (`outline-primary`)
- Color contrast: minimum 4.5:1 for body text on surface backgrounds
- Hindi text: `lang="hi"` attribute on containers with Devanagari content
- `<Toaster />` aria-live region already configured in Sonner

---

## 9. File Change Summary

| File | What changes | Why |
|---|---|---|
| `welcome-view.tsx` | 2-col hero, SVG icons, 72px headline, topic cards, privacy section | P0 #1–6 |
| `nav-bar.tsx` | Book SVG logo, backdrop-blur, memory indicator | P0 #4 |
| `vidya-learning-room.tsx` | Prominent state badge, slide-in panels, memory card guard, SVG icons | P0 #7, 9, 10 |
| `ai-activity-panel.tsx` | Icon per event type, Technical Details drawer, SVG icons | P0 #8 |
| `session-summary.tsx` | 3 CTA buttons, SVG icons | P0 #11 |
| `learning-context-panel.tsx` | SVG icons, Devanagari font stack | P0 #12 |
| `agent-chat-transcript.tsx` | Devanagari font, `lang="hi"` spans | P0 #12 |
| `globals.css` | CSS keyframes for orb states, `prefers-reduced-motion`, Devanagari font | P0 #13, P1 #18 |
| `forget-confirm-modal.tsx` | Show data before confirming | P1 #17 |
