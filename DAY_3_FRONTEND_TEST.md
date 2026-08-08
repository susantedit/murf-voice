# DAY 3 FRONTEND TEST — Vidya AI Voice Learning Assistant

## 1. Run Commands

### Backend

```bash
cd backend
uv sync
uv run python src/agent.py download-files   # first time only
uv run python src/agent.py dev
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

---

## 2. Build & Lint Results

| Check | Command | Result |
|-------|---------|--------|
| ESLint | `pnpm lint` | PASS (0 errors) |
| TypeScript / Next.js build | `pnpm build` | PASS (clean TypeScript compile, Next.js build succeeded) |
| Python ruff | `uv run ruff check .` | PASS (All checks passed!) |

---

## 3. Required Tests

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Ready | CTA visible, "Start Learning" button present | — | NOT VERIFIED |
| Connecting | Connecting state shown, button disabled | — | NOT VERIFIED |
| Listening | "Listening to you..." label visible | — | NOT VERIFIED |
| Speaking | "Vidya is speaking..." label visible | — | NOT VERIFIED |
| Call ended | "Session ended" + "Start Again" button | — | NOT VERIFIED |
| Speaker identification | User vs Vidya clearly distinguished | — | NOT VERIFIED |
| Mic denied | Friendly error, "Try Again" button | — | NOT VERIFIED |
| Full conversation | Complete voice conversation works | — | NOT VERIFIED |
| Restart | New session starts after ending | — | NOT VERIFIED |

> All runtime tests require a live browser session with valid API keys (`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `MURF_API_KEY`, `DEEPGRAM_API_KEY`, `GOOGLE_API_KEY`). They cannot be automated and are marked NOT VERIFIED.

---

## 4. Hindi / Multilingual Transcription

### STT Configuration

- **Provider:** Deepgram Nova-3
- **Config in `backend/src/agent.py`:** `deepgram.STT(model="nova-3", language="multi")`
- `language="multi"` enables automatic language detection supporting Hindi (Devanagari), English, and Hinglish (mixed).
- **No backend changes required** — this configuration is already correct.

### Font Stack

- `Public Sans` → `Noto Sans Devanagari` → `system-ui`
- Loaded in `frontend/app/layout.tsx` via `next/font/google`:
  - `subsets: ['devanagari']`
  - `weight: ['400', '500', '600', '700']`
  - `display: 'swap'`
- CSS variable `--font-noto-devanagari` is included in `<html className>` and in the `--font-sans` stack in `frontend/styles/globals.css`.

### Multilingual Transcription Test Results

| Test | Speech | Expected | Actual | Status |
|------|--------|----------|--------|--------|
| English STT | "Can you explain photosynthesis?" | Accurate English transcript | — | NOT VERIFIED |
| Hindi STT | "मुझे गणित समझने में थोड़ी परेशानी हो रही है।" | Devanagari text rendered correctly | — | NOT VERIFIED |
| Hinglish STT | "Mujhe quadratic equations samajh nahi aa rahi hain, can you explain?" | Mixed language preserved | — | NOT VERIFIED |
| Mixed STT | "मुझे photosynthesis समझ नहीं आ रहा, can you explain it in simple Hindi?" | Mixed Devanagari + English preserved | — | NOT VERIFIED |
| Hindi rendering | "मुझे गणित समझने में थोड़ी परेशानी हो रही है।" displayed in UI | No boxes/squares/question marks | — | NOT VERIFIED |

### Note on Romanized Hindi

If Deepgram Nova-3 with `language="multi"` returns Romanized Hindi (e.g. `"Mujhe gaanit samajhne mein..."`) rather than Devanagari, this is a **provider-side behavior** and is **not a frontend bug**. The frontend renders whatever transcript the STT provider returns without sanitisation or transliteration. This limitation should be documented as a known Deepgram constraint, not a UI defect.

---

## 5. Voice Orb / CSS Orb

### Implementation Notes

- **Type:** CSS-only animated orb — no WebGL, no canvas dependency.
- **Component:** `VoiceOrb` in `frontend/components/app/welcome-view.tsx`
- **Orb structure:** Layered `div`s — outer ambient glow → outer animated ring → mid ring → main orb body (indigo radial-gradient) → inner SVG book+sparkle icon → state label.
- **State label:** Visible text element below the orb (not hidden, not animation-only).
- **Accessibility:** Orb visual layers are marked `aria-hidden="true"`; the state label is visible text outside the hidden region; badge uses `role="status" aria-live="polite"`.
- **Reduced motion:** All animation classes use the `motion-safe:` Tailwind variant (e.g. `motion-safe:animate-pulse`, `motion-safe:animate-spin`). Additionally `globals.css` contains a `@media (prefers-reduced-motion: reduce)` rule that sets `animation-duration: 0.01ms !important` on all elements.

### States Implemented

| State | Trigger | Animation | Label |
|-------|---------|-----------|-------|
| `idle` | Default on page load | Slow `animate-pulse` glow (3s) + slow `animate-ping` outer ring (3s) | "Ready to learn" |
| `connecting` | After clicking Start Learning | `animate-spin` dashed border-t-primary (1.2s) + mid ring spin (2s) | "Connecting to Vidya..." |
| `listening` | Session active, user speaking | Fast `animate-ping` cyan ring (0.8s) + cyan glow | "Listening to you..." |
| `speaking` | Session active, agent speaking | `animate-ping` violet ring (1s) + violet glow | "Vidya is speaking..." |
| `ended` | Session ended | No animation, dim glow | "Session ended" |

### Orb Test Results

| Test | Expected | Status |
|------|----------|--------|
| Orb loads | Visible and centered on welcome screen | NOT VERIFIED |
| Idle animation | Slow pulse + glow ring | NOT VERIFIED |
| Connecting animation | Spinning dashed ring (1.2s) | NOT VERIFIED |
| Listening animation | Fast cyan ring pulse (0.8s) | NOT VERIFIED |
| Speaking animation | Violet outward pulse (1s) | NOT VERIFIED |
| Ended state | Dim, no animation | NOT VERIFIED |
| Mobile | Orb visible and sized correctly (120px mobile / 160px desktop) | NOT VERIFIED |
| Reduced motion | Animations suppressed, all state labels remain visible | NOT VERIFIED |

---

## 6. Day 2 Regression

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `uv run ruff check .` | All checks passed | All checks passed | PASS |
| `uv run pytest` | Unchanged from Day 2 baseline | — | NOT VERIFIED (requires LiveKit env) |
| Agent greeting | "Hi! I'm Vidya..." | — | NOT VERIFIED |
| Hinglish response | Responds in same register as user | — | NOT VERIFIED |
| Wrong answer behavior | No shaming, provides hint, explains correct answer | — | NOT VERIFIED |
| Disability guardrail | Refuses to diagnose, escalates to qualified professional | — | NOT VERIFIED |
| Out-of-scope guardrail | Refuses, escalates | — | NOT VERIFIED |
| Silence handling | Gentle prompts after 2 silences | — | NOT VERIFIED |
| Murf Falcon TTS | Audio output works | — | NOT VERIFIED |
| LiveKit connection | Session connects and voice pipeline runs | — | NOT VERIFIED |

---

## 7. Optional Features

| Feature | Implemented | Notes |
|---------|-------------|-------|
| CSS voice orb (5 states) | ✅ Yes | `VoiceOrb` component in `welcome-view.tsx` — idle, connecting, listening, speaking, ended |
| Two-column hero layout | ✅ Yes | Desktop `grid-cols-[55fr_45fr]` with left text/CTA, right orb |
| Premium ambient background | ✅ Yes | `AmbientBackground` component — three radial gradient blobs + dot grid |
| Always-visible transcript | ✅ Yes | `chatOpen` defaults to `true` in `agent-session-block.tsx` |
| Dark theme default | ✅ Yes | `defaultTheme="dark"` in `ThemeProvider` in `layout.tsx` |
| Indigo/navy design system | ✅ Yes | `globals.css` updated with full indigo/navy palette (light + dark) |
| Noto Sans Devanagari font | ✅ Yes | Loaded in `layout.tsx` with `subsets: ['devanagari']`, `weight: ['400','500','600','700']`, `display: 'swap'` |
| Hinglish UI copy | ✅ Yes | "Apni language mein baat karo." tagline with `lang="hi"` |
| Feature cards | ✅ Yes | 4 cards: Understand, Practice, Revise, Learn Naturally |
| Prompt chips | ✅ Yes | 4 chips including Hinglish example: "Mujhe quadratic equations samjhao." |
| Vidya wordmark nav | ✅ Yes | Header replaced with Vidya wordmark + "AI Learning Assistant" subtitle + desktop nav links |
| 3D orb (React Three Fiber) | ❌ Not implemented | Deferred — CSS orb used instead to avoid build/performance risk |
| Session recap | ❌ Not implemented | Requires real transcript data post-session |
| Learning mode selector | ❌ Not implemented | Backend doesn't support mode switching |
| Topic chips (functional) | ❌ Not implemented | Backend doesn't support topic injection |
| Connection quality indicator | ❌ Not implemented | LiveKit quality data not exposed in current integration |

---

## 8. Remaining Known Issues

1. **Romanized Hindi output:** If Deepgram returns `"Mujhe gaanit samajhne mein..."` instead of Devanagari script, this is a provider limitation of `language="multi"` for certain accents or dialects. It is not fixable in the frontend without faking or rewriting transcription, which is explicitly out of scope. Document the actual Deepgram output when testing manually.

2. **3D orb deferred:** React Three Fiber / WebGL 3D orb was not implemented in this iteration to avoid risk to build stability and performance on low-end or mobile devices. The CSS-only orb is the current implementation and covers all 5 states with full accessibility support.

3. **Runtime tests require live environment:** All tests involving Connecting, Listening, Speaking, Call ended, Speaker identification, Mic denied, Full conversation, and Restart states require a live browser with valid API keys for LiveKit, Murf, Deepgram, and Google Gemini. These are marked NOT VERIFIED and must be manually validated before sign-off.

4. **pytest requires LiveKit environment:** `uv run pytest` uses LLM-as-judge evaluation against a real LiveKit room. It cannot be run in a CI environment without the full set of cloud credentials. Marked NOT VERIFIED in regression table.
