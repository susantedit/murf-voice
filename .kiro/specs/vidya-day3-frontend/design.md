# Design — Vidya Day 3 Frontend Personalisation + Hindi Transcription Fix

## Overview

This document describes the technical approach for transforming the existing Vidya frontend. The architecture is Next.js 15 / React 19 / Tailwind v4 / LiveKit Components React. All changes are **incremental** — no infrastructure is replaced.

---

## 1. Design System Changes (`styles/globals.css`)

### Color palette

Replace the neutral (gray) CSS custom properties with Vidya's indigo/violet educational palette. Changes are applied to both `:root` (light) and `.dark`.

```
:root
  --background:      oklch(0.98 0.005 265)   /* near-white with blue tint */
  --foreground:      oklch(0.12 0.02 265)
  --primary:         oklch(0.52 0.22 264)    /* electric indigo */
  --primary-foreground: oklch(0.98 0 0)
  --muted:           oklch(0.94 0.01 265)
  --muted-foreground: oklch(0.48 0.04 265)
  --border:          oklch(0.88 0.02 265)
  --input:           oklch(0.88 0.02 265)
  --ring:            oklch(0.52 0.22 264)

.dark
  --background:      oklch(0.10 0.025 265)   /* deep navy */
  --foreground:      oklch(0.97 0.005 265)
  --primary:         oklch(0.62 0.22 264)    /* soft violet */
  --primary-foreground: oklch(0.10 0.025 265)
  --muted:           oklch(0.18 0.03 265)
  --muted-foreground: oklch(0.62 0.04 265)
  --border:          oklch(1 0 0 / 12%)
  --input:           oklch(1 0 0 / 16%)
```

### Font stack

The font stack is already correct in `globals.css`:
```css
--font-sans: var(--font-public-sans), var(--font-noto-devanagari), 'Noto Sans Devanagari', ...
```
`Noto_Sans_Devanagari` is already loaded in `layout.tsx`. No changes needed here.

### Default theme

Change `defaultTheme` in `ThemeProvider` from `"system"` to `"dark"` so the product defaults to the deep navy immersive look.

---

## 2. Welcome View Redesign (`components/app/welcome-view.tsx`)

Complete rewrite of the component retaining the same props interface (`startButtonText`, `onStartCall`).

### Layout

```
Desktop (≥1024px): two-column grid
  Left (55%):  badge + headline + desc + language line + tagline + CTA + feature cards + prompt chips
  Right (45%): VoiceOrb + particle background

Mobile (<1024px): single column, orb first, then text/CTA
```

### VoiceOrb component (CSS-only, no WebGL dependency)

State-driven animations using Tailwind + `motion` (already installed):

| State | Animation | Label |
|-------|-----------|-------|
| idle | Slow breathing scale (2.5s ease-in-out loop) + soft glow ring | Ready to learn |
| connecting | Rotating dashed ring (1.2s linear) | Connecting to Vidya... |
| listening | Faster ring pulse (0.8s) | Listening to you... |
| speaking | Outward radiating rings (1s stagger) | Vidya is speaking... |
| ended | Animation stops, dim glow | Session ended |

The orb visual: layered `div`s — outer glow ring → animated ring → main orb body (indigo gradient) → inner icon (SVG book/mic). No canvas, no WebGL.

### Navigation header

Replace the existing `layout.tsx` header with a cleaner product nav:
- Left: `Vidya` wordmark + `AI Learning Assistant` sub-label
- Right: desktop shows "How it works" anchor + "Languages" anchor + "Start Learning" link (scrolls to CTA)
- Mobile: just `Vidya` wordmark centered

The existing `<header>` in `layout.tsx` is replaced (it currently just shows the Murf logo + "Vidya — Learning Assistant" text).

### Feature cards / prompt chips

Retain existing logic, update styling to match new design system (glass cards with border, subtle hover lift).

### Connecting state

When `connecting === true`:
- Hide feature cards and prompt chips (clean focus on connection)
- Show spinner in CTA button
- Show orb in connecting animation state
- Show status text "Getting your learning session ready..."

---

## 3. Active Session UI

### `agent-session-block.tsx` — make transcript always visible

Currently the transcript is hidden behind a chat toggle (`chatOpen` state). For Vidya's voice-first UX, **the transcript should be visible by default** — a learner needs to see what they said in Hindi/Hinglish confirmed in real time.

Change: initialise `chatOpen` to `true` (the chat panel is the transcript, not an optional feature).

### `VidyaSessionStatus` — already well-implemented

The `VidyaSessionStatus` component (`components/app/vidya-session-status.tsx`) already handles all states. Only cosmetic updates needed: align with new color palette (primary color tokens already in use).

### Session header

In `agent-session-block.tsx`, update the top status bar to show:
```
Vidya                              ● LIVE
                [state label]
```
This is already partially implemented. Ensure the "Vidya" label is visible on mobile and the LIVE indicator pulses green when speaking.

---

## 4. Hindi Transcription Investigation & Fix

### Current STT configuration (agent.py)
```python
stt=deepgram.STT(model="nova-3", language="multi")
```
This is **already the correct configuration** for multilingual Hindi/English support. Deepgram Nova-3 with `language="multi"` supports automatic language detection including Hindi in Devanagari and Romanized Hinglish.

### Frontend transcript rendering

The `AgentChatTranscript` renders `{message}` directly as React children. There is no sanitization, translation, or rewriting of the transcript content. The transcript should display whatever Deepgram returns.

### Root cause assessment

The most likely cause of any Hindi rendering issue is:
1. **Browser/OS glyph fallback** — if the device lacks a Devanagari font, the browser falls back to boxes. The fix is to ensure `Noto Sans Devanagari` is loaded and in the CSS font stack. ✅ Already implemented in `layout.tsx` and `globals.css`.
2. **Deepgram returning Romanized Hindi** — Nova-3 with `language="multi"` may return Romanized transliteration rather than Devanagari for some inputs. This is a provider limitation, not a frontend bug. Document in test file.

### Verification steps (manual, cannot be automated)

1. Load the app, click Start Learning, wait for connection.
2. Speak: `"Can you explain photosynthesis?"` → verify English transcript.
3. Speak: `"मुझे गणित समझने में थोड़ी परेशानी हो रही है।"` → check if Devanagari renders or if Romanized text appears.
4. Speak: `"Mujhe photosynthesis samajh nahi aa raha, can you explain?"` → verify Hinglish mixed transcript.
5. Document results in `DAY_3_FRONTEND_TEST.md`.

### No backend changes needed

The `language="multi"` setting is already correct. Do NOT change the Deepgram model or language config as this risks breaking existing STT functionality.

---

## 5. App Metadata & Layout

### `layout.tsx`

- Update `<html lang="en">` — keep as-is (content is multilingual but UI language is English).
- Update `<header>` to use the new Vidya nav design.
- Ensure `Noto_Sans_Devanagari` font includes `weight: ['400', '500', '600', '700']` and `subsets: ['devanagari']` — already correct.
- Keep `ThemeProvider` — change `defaultTheme` to `"dark"`.

### `app-config.ts`

Update:
- `audioVisualizerType`: `'aura'` — already set, keep.
- `accent`: `'#6366F1'` — already set, keep.

---

## 6. Component Change Summary

| File | Change Type | Description |
|------|------------|-------------|
| `styles/globals.css` | Modify | Replace neutral palette with indigo/navy design system |
| `app/layout.tsx` | Modify | New Vidya nav header, dark default theme |
| `components/app/welcome-view.tsx` | Rewrite | Two-column hero, new VoiceOrb, improved copy/layout |
| `components/agents-ui/blocks/agent-session-view-01/components/agent-session-block.tsx` | Modify | Default `chatOpen: true` for always-visible transcript |
| `DAY_3_FRONTEND_TEST.md` | Create | Test documentation |

### Files NOT changed

- `backend/src/agent.py` — STT is already correctly configured
- `components/app/vidya-mic-error.tsx` — already correct
- `components/app/vidya-session-status.tsx` — already correct, only color tokens change
- `components/app/app.tsx` — already correct
- `components/app/view-controller.tsx` — already correct
- `components/agents-ui/agent-chat-transcript.tsx` — already correct
- All other agent-ui components

---

## 7. New Dependencies

No new dependencies required. All needed tools are already installed:
- `motion` — animations
- `lucide-react` — icons
- `@phosphor-icons/react` — icons (already used in app.tsx)
- `next/font/google` — Noto Sans Devanagari (already loaded)
- `tailwindcss` v4 — styling

If 3D is added in a future iteration, `three`, `@react-three/fiber`, `@react-three/drei` would be added — but this is **not in scope for this task** to avoid risk of breaking the build or performance.

---

## 8. Performance Strategy

- The CSS-only orb has zero impact on bundle size.
- `Noto_Sans_Devanagari` is loaded with `display: 'swap'` — no render blocking.
- The motion library is already in the bundle.
- No new heavy dependencies.

---

## 9. Accessibility

- ARIA `role="status"` + `aria-live="polite"` already on `VidyaSessionStatus`.
- CTA button has `aria-label`.
- Mic error screen has `role="alert"` + `aria-live="assertive"`.
- Orb animations are hidden from screen readers (`aria-hidden="true"`).
- State labels are visible text, not just animations.
- `prefers-reduced-motion` is respected via the existing `globals.css` rule.

---

## 10. Mobile Breakpoints

| Viewport | Layout |
|---------|--------|
| 320–767px | Single column, orb centered above text, stacked CTA, compact feature cards |
| 768–1023px | Single column, larger orb, 2-col feature cards |
| 1024px+ | Two-column hero (55/45 split) |
