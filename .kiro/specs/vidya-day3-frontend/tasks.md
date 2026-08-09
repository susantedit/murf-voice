# Implementation Plan: Vidya Day 3 Frontend Personalisation + Hindi Transcription Fix

## Overview

Transform the existing Vidya AI Voice Learning Assistant frontend into a polished Learning & Literacy product. All changes are incremental and preserve existing Day 2 functionality. The STT pipeline (Deepgram Nova-3, `language="multi"`) is already correctly configured for Hindi/multilingual support — this plan focuses on the design system, hero redesign, always-visible transcript, and font verification.

## Tasks

- [x] 1. Update design system colors in globals.css
  - Replace `:root` neutral gray CSS custom properties with indigo/navy palette: `--background: oklch(0.98 0.005 265)`, `--foreground: oklch(0.12 0.02 265)`, `--primary: oklch(0.52 0.22 264)`, `--primary-foreground: oklch(0.98 0 0)`, `--muted: oklch(0.93 0.015 265)`, `--muted-foreground: oklch(0.48 0.04 265)`, `--accent: oklch(0.90 0.04 265)`, `--accent-foreground: oklch(0.20 0.04 265)`, `--border: oklch(0.86 0.03 265)`, `--input: oklch(0.86 0.03 265)`, `--ring: oklch(0.52 0.22 264)`, `--card: oklch(0.98 0.005 265)`, `--card-foreground: oklch(0.12 0.02 265)`, `--popover: oklch(0.98 0.005 265)`, `--popover-foreground: oklch(0.12 0.02 265)`, `--secondary: oklch(0.93 0.03 265)`, `--secondary-foreground: oklch(0.20 0.04 265)`
  - Replace `.dark` neutral gray tokens with deep navy palette: `--background: oklch(0.10 0.025 265)`, `--foreground: oklch(0.97 0.005 265)`, `--primary: oklch(0.65 0.22 264)`, `--primary-foreground: oklch(0.10 0.025 265)`, `--muted: oklch(0.20 0.04 265)`, `--muted-foreground: oklch(0.62 0.04 265)`, `--accent: oklch(0.28 0.06 265)`, `--accent-foreground: oklch(0.95 0.01 265)`, `--border: oklch(1 0 0 / 12%)`, `--input: oklch(1 0 0 / 16%)`, `--ring: oklch(0.50 0.15 264)`, `--card: oklch(0.14 0.03 265)`, `--card-foreground: oklch(0.97 0.005 265)`, `--popover: oklch(0.18 0.03 265)`, `--popover-foreground: oklch(0.97 0.005 265)`, `--secondary: oklch(0.20 0.04 265)`, `--secondary-foreground: oklch(0.95 0.01 265)`
  - Keep `--destructive`, `--radius`, chart colors, sidebar colors, and all `@theme inline` block unchanged
  - Keep `@import`, font stack, and `@media (prefers-reduced-motion: reduce)` block unchanged
  - **File:** `frontend/styles/globals.css`

- [x] 2. Update layout.tsx: dark default theme and new nav header
  - In `ThemeProvider`, change `defaultTheme="system"` to `defaultTheme="dark"`
  - Replace the `<header>` inner content: left side shows "Vidya" bold wordmark + "AI Learning Assistant" small uppercase subtitle; right side shows desktop-only nav links "How it works" (href="#how-it-works") and "Languages" (href="#languages") as muted text links; remove the Murf logo `<img>` tags from the header
  - Keep all font imports, `<head>` meta tags, `ThemeToggle`, and body structure unchanged
  - **File:** `frontend/app/layout.tsx`

- [x] 3. Rewrite welcome-view.tsx with premium hero and CSS voice orb
  - Keep the same exported component name `WelcomeView` and props interface (`startButtonText: string`, `onStartCall: () => void`)
  - Create internal `AmbientBackground` component: three large blurred radial gradient div orbs positioned absolutely (`pointer-events-none`) using `bg-primary/8`, `bg-violet-400/6`, `bg-indigo-400/6` colors with blur; add a very subtle dot-grid via `backgroundImage` CSS with 1px dots at low opacity
  - Create internal `VoiceOrb` component accepting `state: 'idle' | 'connecting' | 'listening' | 'speaking' | 'ended'`; implement as layered CSS divs: outer glow ring (large blurred circle, color varies by state), animated ring (rotating dashed border or pulsing ring, varies by state), main orb body (indigo radial-gradient, 120px mobile / 160px desktop), inner SVG book icon (reuse existing SVG from current implementation), state label text below orb; idle: `animate-pulse` 3s glow + slow rotating dashed border, label "Ready to learn"; connecting: `animate-spin` 1.2s dashed border-t-primary, label "Connecting to Vidya..."; listening: fast 0.8s ring pulse + `bg-cyan-400/15` glow, label "Listening to you..."; speaking: outward scale pulse 1s + `bg-violet-500/20` glow, label "Vidya is speaking..."; ended: no animation, dim glow, label "Session ended"; mark orb div `aria-hidden="true"`, keep state label as visible text; use `motion-safe:` Tailwind variant on all animation classes for reduced-motion support
  - Implement two-column layout: outer div uses `min-h-svh w-full overflow-hidden relative`; inner content wrapper centers content; grid is `grid-cols-1 lg:grid-cols-[55fr_45fr]` with `items-center gap-12 lg:gap-8`; left column (text/CTA) is `order-2 lg:order-1` with `items-center text-center lg:items-start lg:text-left`; right column (orb) is `order-1 lg:order-2 flex items-center justify-center`
  - Add badge: `inline-flex` pill with `bg-primary/10 text-primary rounded-full px-3 py-1 text-[11px] font-semibold tracking-widest uppercase`; shows animated dot + "AI Voice Learning Assistant" when idle, "Connecting to Vidya..." when connecting; has `role="status" aria-live="polite"`
  - Add headline `<h1>` at `text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]`; idle shows "Learn Smarter." + "Just Talk." with "Just Talk." in `text-primary`; connecting shows "Getting your" + "session ready..." with second line in `text-primary`
  - Add description `<p>` (hidden when connecting): "Understand concepts, practice questions, and revise lessons through natural voice conversations." at `text-muted-foreground text-base leading-relaxed mb-2 max-w-md`
  - Add language line (hidden when connecting): "Hindi • English • Hinglish" at `text-muted-foreground text-sm font-medium tracking-wide mb-2`
  - Add Hinglish tagline (hidden when connecting): `<p lang="hi">Apni language mein baat karo.</p>` at `text-muted-foreground text-sm font-medium mb-6`
  - Add CTA Button: `size="lg" rounded-full font-mono text-xs font-bold tracking-widest uppercase shadow-lg shadow-primary/25 hover:scale-105 hover:shadow-primary/40 active:scale-95 transition-all duration-200`; disabled + cursor-wait when connecting; shows spinner icon + "Connecting..." text when connecting; shows "🎙️ {startButtonText}" when idle; has proper `aria-label`
  - Add microcopy "No typing. Just speak." below CTA (hidden when connecting)
  - Add 4-column feature card grid (hidden when connecting): `grid-cols-2 sm:grid-cols-4 gap-2`; cards: 💡 Understand, 📝 Practice, 🔄 Revise, 🗣️ Learn Naturally; card styling: `bg-background/60 backdrop-blur-sm border border-foreground/8 hover:border-primary/30 hover:bg-background/80 rounded-2xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`
  - Add prompt chips section (hidden when connecting) with `id="how-it-works"` anchor and `id="languages"` anchor nearby: chips for "Explain photosynthesis simply.", "Quiz me on algebra.", "Help me revise physics.", "Mujhe quadratic equations samjhao."
  - Add footer at `absolute bottom-4` with Murf Falcon TTS and LiveKit Agents links
  - Map `connecting` boolean to VoiceOrb `state` prop: `connecting ? 'connecting' : 'idle'`
  - **File:** `frontend/components/app/welcome-view.tsx`

- [x] 4. Make transcript visible by default in active session
  - Change `const [chatOpen, setChatOpen] = useState(false)` to `const [chatOpen, setChatOpen] = useState(true)` so the live transcript is immediately visible when a session starts
  - Keep all other logic unchanged: scroll behaviour, AgentControlBar toggle, TileLayout, VidyaSessionStatus, animations
  - **File:** `frontend/components/agents-ui/blocks/agent-session-view-01/components/agent-session-block.tsx`

- [x] 5. Verify Hindi font rendering in layout.tsx
  - Confirm `Noto_Sans_Devanagari` is imported with `subsets: ['devanagari']` and `weight: ['400', '500', '600', '700']` and `display: 'swap'` — already present, no change needed
  - Confirm CSS variable `--font-noto-devanagari` is in the `className` of `<html>` — already present
  - Confirm `globals.css` `--font-sans` in `@theme inline` includes `var(--font-noto-devanagari)` — already present
  - Confirm `AgentChatTranscript` renders `{message}` without sanitisation — already correct
  - If any of the above are missing, add them; if all present, document as verified with no code change
  - **Files:** `frontend/app/layout.tsx` (verify), `frontend/styles/globals.css` (verify), `frontend/components/agents-ui/agent-chat-transcript.tsx` (verify)

- [x] 6. Run build and lint validation
  - Run `pnpm lint` in `frontend/` and fix any ESLint errors introduced by Tasks 1–5 (common: unused imports, missing key props, `any` types)
  - Run `pnpm build` in `frontend/` and fix any TypeScript compilation errors (common: VoiceOrb state union type, missing React imports if any)
  - Run `uv run ruff check .` in `backend/` to confirm backend is unchanged and lint passes
  - **Working directory:** `frontend/` for pnpm commands, `backend/` for uv commands
  - Dependencies: Tasks 1, 2, 3, 4, 5

- [x] 7. Create DAY_3_FRONTEND_TEST.md
  - Create file at workspace root `f:/murf-voice/DAY_3_FRONTEND_TEST.md`
  - Include Run Commands section with exact backend and frontend startup commands
  - Include Required Tests table: pnpm build (fill in actual result), pnpm lint (fill in actual result), Ready state, Connecting state, Listening state, Speaking state, Call ended, Speaker identification, Mic denied, Full conversation, Restart — all runtime tests marked NOT VERIFIED
  - Include Hindi/Multilingual Transcription section: document STT config (Deepgram nova-3, language=multi), font stack, test results table for English/Hindi/Hinglish/mixed, notes that Romanized Hindi output is a provider behavior not a frontend bug
  - Include 3D/Orb section: document CSS orb implementation, mark all as NOT VERIFIED (requires live browser)
  - Include Day 2 Regression table: fill in ruff check result, mark all agent behavior tests as NOT VERIFIED
  - Include Optional Features table showing what was and was not implemented
  - Include Remaining Known Issues section
  - **File:** `f:/murf-voice/DAY_3_FRONTEND_TEST.md`
  - Dependencies: Task 6

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1, 2, 3, 4, 5] },
    { "wave": 2, "tasks": [6] },
    { "wave": 3, "tasks": [7] }
  ]
}
```

Tasks 1–5 are independent of each other and can be executed in any order or in parallel. Task 6 must run after Tasks 1–5. Task 7 must run after Task 6.

## Notes

- **No backend changes**: `agent.py` already has correct STT config (`deepgram.STT(model="nova-3", language="multi")`). Do not modify it.
- **No new npm dependencies**: All required libraries (motion, lucide-react, @phosphor-icons/react, next/font/google) are already installed.
- **3D orb deferred**: The CSS orb in Task 3 is the implementation for this iteration. Adding `@react-three/fiber` 3D is a future iteration that can be done without breaking anything.
- **Transcript always visible**: Task 4 is a one-line change that significantly improves the learner experience for Hindi/Hinglish users.
- **Hindi transcription root cause**: The font stack already supports Devanagari. If the STT returns Romanized Hindi, that is a Deepgram provider behavior — not fixable in the frontend without faking transcription (which is explicitly forbidden).
