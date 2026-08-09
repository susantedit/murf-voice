# Requirements — Vidya Day 3 Frontend Personalisation + Hindi Transcription Fix

## Overview

Transform the existing Vidya AI Voice Learning Assistant frontend from a generic LiveKit starter UI into a polished, premium Learning & Literacy voice product. All existing Day 2 functionality (agent persona, guardrails, Murf Falcon TTS, LiveKit) must be preserved. The Hindi transcription pipeline (Deepgram Nova-3, `language="multi"`) is already correctly configured — the work here focuses on ensuring the font stack, CSS, and transcript UI correctly handle and display Devanagari/multilingual text.

---

## Requirement 1 — Brand Design System

**User story:** As a learner, I want the app to feel like a real educational product, not a generic developer starter, so that I trust it and feel engaged.

### Acceptance criteria

1. WHEN the page loads THEN the background is a deep navy/midnight color (`oklch(0.07 0.02 265)` or equivalent), replacing the plain white/black defaults.
2. WHEN the page loads THEN the primary accent color is electric indigo/violet (`oklch(0.55 0.22 264)` light, `oklch(0.65 0.22 264)` dark), visible on buttons, badges, and the orb.
3. WHEN the page loads THEN the body font stack is `Public Sans → Noto Sans Devanagari → system-ui` so Hindi Devanagari renders without boxes or missing glyphs.
4. WHEN Hindi text such as `मुझे गणित समझने में थोड़ी परेशानी हो रही है।` is displayed THEN it renders correctly with no squares, question marks, or broken glyphs.
5. WHEN the user has `prefers-reduced-motion: reduce` set THEN all animations are suppressed and the UI remains fully usable via text and icons alone.

---

## Requirement 2 — Premium Hero / Welcome View

**User story:** As a first-time visitor, I want to see a compelling hero that immediately communicates "voice-first AI learning assistant" so that I understand the product and feel confident clicking Start Learning.

### Acceptance criteria

1. WHEN the welcome view loads on desktop (≥1024px) THEN it shows a two-column layout: left column contains headline, description, CTA; right column contains the voice orb.
2. WHEN the welcome view loads on mobile (<768px) THEN the layout stacks vertically (orb above text and CTA) with no horizontal scrolling.
3. WHEN the welcome view loads THEN the following copy is present:
   - Badge: `AI VOICE LEARNING ASSISTANT`
   - Headline: `Learn Smarter. Just Talk.`
   - Description: `Understand concepts, practice questions, and revise lessons through natural voice conversations.`
   - Language line: `Hindi • English • Hinglish`
   - Hinglish tagline: `Apni language mein baat karo.`
   - CTA button: `🎙️ Start Learning`
4. WHEN the welcome view loads THEN four feature cards are shown: Understand, Practice, Revise, Learn Naturally.
5. WHEN the welcome view loads THEN four prompt chips are shown: Explain, Quiz (algebra), Revise (physics), Hinglish example.
6. WHEN the user has not clicked Start Learning THEN the CTA button is enabled and clearly visible as the primary action.
7. WHEN the page loads THEN a minimal navigation header shows `Vidya` (left) and `AI Learning Assistant` label (right / center on mobile).

---

## Requirement 3 — Animated Voice Orb (CSS-first)

**User story:** As a learner, I want a distinctive animated visual centerpiece that reacts to the session state, so that I always know what Vidya is doing.

### Acceptance criteria

1. WHEN the orb is in the **idle** state THEN it shows a slow breathing pulse animation and a glow, with the label "Ready to learn".
2. WHEN the user clicks Start Learning THEN the orb transitions to a **connecting** state with a rotating ring animation and label "Connecting to Vidya...".
3. WHEN the session is connected and Vidya is **listening** THEN the orb shows a distinct animation (ring pulse) and label "Listening to you...".
4. WHEN Vidya is **speaking** THEN the orb shows an outward-radiating pulse and label "Vidya is speaking...".
5. WHEN the session ends THEN the orb returns to a calm idle state and label "Session ended".
6. WHEN WebGL/canvas is unavailable THEN the orb falls back to a CSS-only animated version (no broken canvas).
7. WHEN `prefers-reduced-motion: reduce` is active THEN orb animations stop but state labels remain visible.
8. WHEN the orb is in listening state THEN if real audio-level data is accessible from LiveKit, the orb reacts to microphone volume; otherwise state-based animation is used (no fake audio visualisation claimed as real).

---

## Requirement 4 — Connecting / Loading State

**User story:** As a learner, when I click Start Learning, I want clear visual feedback that the system is connecting, so I don't click the button repeatedly.

### Acceptance criteria

1. WHEN the user clicks Start Learning THEN the button becomes disabled immediately (no duplicate connection attempts).
2. WHEN connecting THEN the hero shows "Connecting to Vidya..." and "Getting your learning session ready...".
3. WHEN connecting THEN no raw technical errors (LiveKit room IDs, WebSocket URLs, stack traces) are shown.
4. WHEN the connection takes longer than expected THEN the UI remains in the connecting state without crashing or reverting to idle.

---

## Requirement 5 — Active Session UI

**User story:** As a learner during a session, I want a clean session interface that keeps the voice orb front and center, shows who is speaking, and shows a live transcript.

### Acceptance criteria

1. WHEN a session is active THEN the header shows `Vidya • Live Session` with a green live indicator dot.
2. WHEN a session is active THEN the voice orb / audio visualiser is the dominant visual element.
3. WHEN a session is active THEN the current speaker state (Listening / Speaking / Thinking) is displayed as a text label alongside an icon.
4. WHEN Vidya is **listening** THEN the display shows `🎙️ Listening to you...`.
5. WHEN Vidya is **speaking** THEN the display shows `🔊 Vidya is speaking...`.
6. WHEN Vidya is **thinking** THEN the display shows `💭 Thinking...`.
7. WHEN a session is active THEN a live transcript panel is visible and scrolls automatically.
8. WHEN the transcript updates THEN user messages are visually distinct from Vidya messages (different alignment, icon, or color).
9. WHEN the user clicks End Session THEN the session ends cleanly.
10. WHEN the user is on mobile THEN the End Session button remains accessible and the transcript is readable.

---

## Requirement 6 — Hindi / Multilingual Transcript Display

**User story:** As a learner who speaks Hindi or Hinglish, I want the transcript to correctly show what I said (including Devanagari script), so I can verify Vidya understood me.

### Acceptance criteria

1. WHEN the user speaks English and the transcript is displayed THEN it correctly shows the English text.
2. WHEN the user speaks Hindi in Devanagari (e.g. `मुझे गणित समझने में थोड़ी परेशानी हो रही है।`) and the transcript is displayed THEN Devanagari characters render correctly (no squares, no random transliteration).
3. WHEN the user speaks Hinglish (mixed Hindi + English) THEN the transcript preserves the mixed-language nature of the utterance.
4. WHEN the transcript container renders THEN it has the `lang` attribute set or a font stack that includes `Noto Sans Devanagari` so the browser selects correct glyphs.
5. WHEN the STT returns a transcript THEN the frontend does NOT translate, rewrite, or sanitize it before display.
6. IF the STT provider (Deepgram Nova-3, `language="multi"`) returns Romanized Hindi rather than Devanagari THEN this limitation is documented in `DAY_3_FRONTEND_TEST.md` — the frontend is not to be blamed for STT provider limitations.

---

## Requirement 7 — Call Ended State

**User story:** As a learner, when the session ends, I want a friendly confirmation and an easy way to start again, so I'm never left on a blank or broken screen.

### Acceptance criteria

1. WHEN a session ends THEN the UI shows a "Session ended" screen with the message "Nice learning with you!".
2. WHEN the session ended screen shows THEN a `🔄 Start Again` button is present and functional.
3. WHEN the user clicks Start Again THEN a new session can be started normally (same flow as initial Start Learning).
4. WHEN the session ended screen shows THEN no technical details (room names, tokens, error codes) are exposed.

---

## Requirement 8 — Microphone Error Handling

**User story:** As a learner who denies microphone access or has no microphone, I want a clear, friendly explanation of what went wrong and how to fix it.

### Acceptance criteria

1. WHEN microphone access is denied THEN the UI shows: title "Microphone access is needed", message "Microphone access was blocked. Allow microphone access in your browser settings, then try again.", and a "Try Again" button.
2. WHEN no microphone is found THEN the UI shows: "We couldn't find a working microphone. Check your microphone and try again."
3. WHEN an unknown microphone error occurs THEN the UI shows: "Something went wrong with the microphone. Please try again."
4. WHEN any microphone error is displayed THEN no raw browser error names (`NotAllowedError`, `getUserMedia`) or stack traces are visible.

---

## Requirement 9 — Performance and Accessibility

**User story:** As a learner on any device or with accessibility needs, I want the app to load quickly, work well on mobile, and be usable with keyboard or screen reader.

### Acceptance criteria

1. WHEN the page loads on mobile (375px viewport) THEN there is no horizontal scrolling and all UI elements are reachable.
2. WHEN navigating with keyboard THEN all interactive elements (CTA, End Session, Try Again) are focusable with visible focus rings.
3. WHEN the session state changes THEN an ARIA live region announces the change (e.g. "Vidya is now listening", "Vidya is now speaking").
4. WHEN 3D features are added THEN they are lazy-loaded and do not block the initial render or voice functionality.
5. WHEN 3D fails to load or WebGL is unavailable THEN the app falls back to CSS animations and the voice functionality works normally.
6. WHEN the app is built THEN `pnpm build` completes without TypeScript errors or ESLint errors.

---

## Requirement 10 — Day 2 Regression

**User story:** As the project owner, I want all Day 2 agent behaviours to remain intact after the Day 3 frontend redesign.

### Acceptance criteria

1. WHEN the agent greets THEN it says "Hi! I'm Vidya, your learning assistant. I can help you understand concepts, practice questions, or revise a topic. What would you like to learn today?"
2. WHEN the user speaks Hindi/Hinglish THEN Vidya responds in the same language register.
3. WHEN the user answers a practice question incorrectly THEN Vidya does not shame them, provides a hint, and explains the correct answer.
4. WHEN the user asks "Do I have dyscalculia?" or similar THEN Vidya refuses to diagnose and escalates to a qualified professional.
5. WHEN the user asks for something outside education (medical, legal, financial) THEN Vidya refuses and escalates.
6. WHEN the user is silent twice THEN Vidya uses gentle prompts.
7. WHEN the backend runs THEN `uv run ruff check .` passes with no errors.
8. WHEN the backend runs THEN `uv run pytest` passes (or is unchanged from Day 2 baseline).

---

## Requirement 11 — Test Documentation

**User story:** As the project owner, I want a clear test document that records what was actually tested and whether it passed, failed, or was not verified.

### Acceptance criteria

1. WHEN Day 3 work is complete THEN `DAY_3_FRONTEND_TEST.md` exists at the workspace root.
2. WHEN the test document is created THEN it includes all required test cases from the Day 3 spec (Ready, Connecting, Listening, Speaking, Call ended, Mic denied, English STT, Hindi STT, Hinglish STT, Hindi rendering, Full conversation, Restart).
3. WHEN a test cannot be automated THEN its status is marked `NOT VERIFIED` rather than `PASS`.
4. WHEN a test was actually run and passed THEN it is marked `PASS`.
