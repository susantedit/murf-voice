# MASTER KIRO PROMPT — DAY 3

# Vidya AI Learning Assistant — Premium 3D Frontend Redesign + Hindi/English Transcription Fix

You are working on my existing **Vidya AI Voice Learning Assistant**.

This is my project for the **10 Days of Voice Agents** challenge.

## Track

**Learning & Literacy**

## Product

**Vidya — AI Voice Learning Assistant**

Vidya is a voice-first educational assistant that helps students:

* Understand difficult concepts
* Practice questions
* Revise lessons
* Learn through natural conversation
* Speak in Hindi, English, or Hinglish

---

# IMPORTANT — DO NOT START CODING IMMEDIATELY

First inspect the complete existing project.

Understand:

* Frontend architecture
* Backend architecture
* LiveKit integration
* STT configuration
* Murf Falcon TTS configuration
* Agent prompt
* Existing Day 2 guardrails
* Existing transcript implementation
* Existing audio visualization
* Existing state management
* Existing UI components
* Existing CSS/Tailwind setup
* Existing fonts
* Existing icons
* Existing animations
* Existing routing
* Existing environment configuration
* Existing tests

Then create an implementation plan.

Only after understanding the project should you modify files.

---

# CRITICAL RULE

Do NOT rebuild the voice agent from scratch.

Do NOT replace working LiveKit functionality.

Do NOT replace Murf Falcon.

Do NOT remove the Day 2 agent personality.

Do NOT remove Day 2 guardrails.

Do NOT create fake transcript data.

Do NOT create fake audio-reactive animations.

Do NOT hardcode fake connection states.

Do NOT introduce unnecessary dependencies.

Preserve all existing functionality.

---

# DAY 3 MAIN GOAL

Transform the existing frontend into a polished, premium **Learning & Literacy voice product**.

The result should look like a real startup/product experience rather than a generic LiveKit starter application.

The visual direction should be:

* Modern
* Educational
* Friendly
* Premium
* Futuristic
* Voice-first
* 3D
* Interactive
* Accessible
* Mobile responsive
* Hindi/English friendly

Think:

> "A modern AI learning companion that lives inside a beautiful interactive learning world."

NOT:

> "A dashboard with a microphone button."

---

# DESIGN CONCEPT

Build the visual identity around:

## VIDYA

### Learn Smarter. Just Talk.

Use a visual metaphor of:

**Knowledge + Voice + Orb + Learning**

The centerpiece should be a glowing 3D **Vidya Knowledge Orb**.

The orb represents:

* Intelligence
* Conversation
* Learning
* Knowledge
* Voice

---

# DESIGN SYSTEM

Create a consistent design system.

## Colors

Use a sophisticated educational palette.

Primary:

* Deep navy / midnight background
* Electric indigo
* Violet
* Cyan accents
* Soft white text

Secondary:

* Warm educational highlights
* Subtle glass surfaces

Do NOT use excessive rainbow gradients.

Keep the design coherent.

Use gradients mainly for:

* Orb
* Accent glow
* CTA highlights
* Small decorative elements

---

# TYPOGRAPHY

The interface must support:

* English
* Hindi Devanagari
* Hinglish

Use a modern Latin font with a proper Devanagari-compatible fallback.

Verify that Hindi text renders correctly.

Do not use a font that breaks Devanagari characters.

Avoid tiny text.

Hero heading should be large.

Body copy should be highly readable.

---

# ICONS

If the project does not already have a suitable icon library, use a lightweight open-source option such as **Lucide**.

Use icons consistently for:

* Mic
* Book
* Brain
* Graduation
* Volume
* Settings
* Refresh
* Arrow
* Sparkles
* Languages

Do not mix many unrelated icon styles.

---

# 3D TECHNOLOGY

If the current frontend supports React:

Prefer:

* `three`
* `@react-three/fiber`
* `@react-three/drei`

React Three Fiber is designed specifically as a React renderer for Three.js.

Drei provides useful abstractions such as:

* Float
* Sparkles
* Environment
* Trail
* Text3D
* Html
* RoundedBox
* ContactShadows

Use these where they actually improve the interface.

Do NOT install a large collection of unrelated 3D libraries.

---

# 3D PERFORMANCE RULE

3D must enhance the product, not destroy performance.

Use:

* Lightweight geometry
* Low-poly decorative objects
* Instanced/simple meshes where possible
* CSS effects where 3D is unnecessary
* Lazy loading
* Suspense
* Reduced animation on mobile
* Reduced motion support

Avoid:

* Huge GLTF models
* Heavy textures
* Complex post-processing
* Excessive particles
* Multiple large canvases
* Constant expensive rendering

Three.js supports GLTF loading and browser-based 3D scenes, but assets should be kept appropriate for a web application.

---

# 3D HERO SCENE

Create a 3D hero scene.

## Main object

A glowing **Knowledge Orb**.

Concept:

A floating transparent sphere containing:

* Small floating book
* Tiny mathematical symbols
* Subtle letters
* Small particles
* Orbiting rings
* Tiny knowledge nodes

Do NOT overcrowd it.

The orb should feel like:

> "A living AI learning core."

---

# ORB ANIMATION

### Idle

* Slowly floats
* Slowly rotates
* Soft breathing glow
* Tiny particles orbit

Text:

> Ready to learn

### Connecting

* Orb rotates faster
* Outer rings activate
* Small particles move toward the orb

Text:

> Connecting to Vidya...

### Listening

* Orb responds to microphone volume if real audio data is available
* Rings pulse with the user's voice
* Particles react subtly

Text:

> Listening to you...

### Speaking

* Orb reacts to Vidya's real audio output if available
* Energy waves radiate outward
* Inner core pulses

Text:

> Vidya is speaking...

### Ended

* Animation slows
* Orb returns to idle

Text:

> Session ended

---

# IMPORTANT AUDIO VISUALIZER RULE

If actual audio-level data is available:

USE IT.

If it is not available:

Use a state-based animation.

Never claim that a fake animation represents actual microphone/audio amplitude.

---

# 3D ORBITAL KNOWLEDGE SYSTEM

Around the main orb, create subtle orbital elements.

Possible objects:

* Book
* Graduation cap
* Atom
* Mathematical symbols
* Light bulb
* Small speech bubble
* Language glyphs

Do not use all of them simultaneously.

Select 3–5.

Objects should:

* Float
* Slowly orbit
* Have subtle depth
* Respond slightly to hover where practical

Keep the composition elegant.

---

# 3D BOOK OBJECT

Create a small floating 3D book near the orb.

When idle:

> Book gently rotates.

When listening:

> Book becomes slightly brighter.

When speaking:

> Book emits a subtle glow.

The book should symbolize learning.

If using an external GLB/GLTF asset, use only assets with clearly compatible licensing.

Prefer free/open-source assets or procedural geometry.

---

# OPTIONAL FREE 3D ASSETS

You may research and use free web 3D assets.

A possible source is:

threejsassets.com

It provides web-oriented Three.js assets and identifies free commercial-use assets. However, inspect the license of every asset used before including it in the project.

Do NOT blindly download random models from the internet.

Do NOT use copyrighted assets with unclear licensing.

If a procedural Three.js object looks equally good, prefer procedural geometry.

---

# HERO SECTION

Completely redesign the hero.

Structure:

```text
                     VIDYA
             AI VOICE LEARNING

              Learn Smarter.
                Just Talk.

     Understand concepts. Practice questions.
       Revise lessons through conversation.

        Hindi • English • Hinglish

              [ 🎙 Start Learning ]

                 3D ORB
            Knowledge Universe
```

Desktop:

Two-column layout.

Left:

* Badge
* Headline
* Description
* Language indicator
* CTA
* Small trust/status indicator

Right:

* Large 3D orb
* Floating learning objects
* Particles
* Orbital rings

---

# HERO COPY

Badge:

> AI VOICE LEARNING ASSISTANT

Headline:

> Learn Smarter.
> Just Talk.

Supporting text:

> Understand concepts, practice questions, and revise lessons through natural voice conversations.

Language:

> Hindi • English • Hinglish

CTA:

> Start Learning

Secondary microcopy:

> No typing. Just speak.

---

# HINDI HERO COPY

Add subtle Hinglish:

> **Apni language mein baat karo.**

Do not turn the entire website into Hindi.

Keep the primary product language professional and accessible.

---

# HERO BACKGROUND

Create a deep immersive background.

Use:

* Soft radial gradients
* Very subtle grid
* Tiny stars/particles
* 3D depth
* Glow around orb

Avoid:

* Huge text behind the hero
* Excessive noise
* Excessive blur
* Distracting animations

---

# NAVIGATION

Create a minimal navigation.

Left:

> Vidya

Small label:

> AI Learning Assistant

Right:

* How it works
* Languages
* Start Learning

Mobile:

Use a compact menu or simplified navigation.

Do not overcrowd the header.

---

# HERO MICRO-INTERACTIONS

Add subtle interactions.

CTA:

* Hover glow
* Slight scale
* Arrow movement

Orb:

* Mouse movement creates subtle parallax
* Hover slightly changes orbital motion

Cards:

* Slight lift
* Soft border highlight

Do not make everything bounce.

---

# HOW IT WORKS SECTION

Add:

## How Vidya Works

Three steps:

### 01 — Speak

Ask Vidya anything about what you're learning.

### 02 — Understand

Vidya explains concepts in a simple conversational way.

### 03 — Practice

Test yourself and strengthen your understanding.

Use small visual illustrations or 3D mini-scenes if practical.

---

# FEATURE SECTION

Create:

## Learn Your Way

Three primary cards.

### 📚 Explain

> Break difficult concepts into simple explanations.

### 🧠 Practice

> Practice questions and learn from mistakes.

### 🔄 Revise

> Quickly review important concepts before exams.

---

# LANGUAGE SECTION

Create:

## Your Language. Your Way.

Copy:

> Speak naturally. Vidya can adapt to Hindi, English, and Hinglish conversations.

Display:

```text
हिंदी
English
Hinglish
```

Use elegant language cards.

Do not claim support for languages that have not been verified.

---

# IMPORTANT — HINDI TRANSCRIPTION FIX

This is a REQUIRED technical task.

The current problem is:

When I speak Hindi, the text transcript does not accurately represent what I said.

You must diagnose and fix the actual cause.

---

# STT INVESTIGATION

Inspect:

* Current STT provider
* Current STT model
* Current language setting
* Multilingual support
* Language detection
* LiveKit transcript pipeline
* Backend transcript processing
* Frontend transcript rendering

Determine whether the problem is:

1. STT recognition
2. Language configuration
3. Transcript transformation
4. LiveKit transport
5. Frontend rendering
6. Font/Unicode
7. Some combination

Do NOT assume.

---

# HINDI TRANSCRIPTION REQUIREMENT

If I say:

> "मुझे photosynthesis समझ नहीं आ रहा।"

The transcript should preserve the spoken Hindi/English register.

Expected:

> "मुझे photosynthesis समझ नहीं आ रहा।"

NOT:

> "Mujhe photosynthesis samajh nahi aa raha."

unless the actual STT configuration intentionally produces Romanized Hindi and that behavior is unavoidable.

Do not translate the transcript.

Do not rewrite the transcript using an LLM.

The transcript should represent the user's speech.

---

# HINGLISH TEST

Test:

> "मुझे photosynthesis समझ नहीं आ रहा, can you explain it in simple Hindi?"

The transcript should preserve the mixed nature of the speech.

---

# ENGLISH TEST

Test:

> "Can you explain photosynthesis in simple terms?"

Expected:

> "Can you explain photosynthesis in simple terms?"

---

# PURE HINDI TEST

Test:

> "मुझे गणित समझने में थोड़ी परेशानी हो रही है।"

The transcript should correctly preserve Devanagari if the STT provider supports it.

---

# FONT TEST

Verify that:

```text
मुझे गणित समझने में थोड़ी परेशानी हो रही है।
```

renders correctly.

No:

* Squares
* Missing glyphs
* Broken Unicode
* Strange spacing

Use a Devanagari-compatible font fallback.

---

# LIVE TRANSCRIPT

Add a polished transcript panel.

Example:

```text
┌─────────────────────────────────────┐

  🎙 You

  मुझे photosynthesis समझ नहीं आ रहा।

  🔊 Vidya

  Bilkul! Let's keep it simple...

└─────────────────────────────────────┘
```

Use actual conversation data.

Never hardcode messages.

---

# TRANSCRIPT DESIGN

The transcript should:

* Update live
* Scroll automatically
* Preserve Hindi
* Preserve English
* Preserve Hinglish
* Clearly distinguish speakers
* Have readable typography
* Work on mobile

Keep it secondary to the voice experience.

---

# ACTIVE SESSION DESIGN

When connected, transform the interface into a dedicated voice session.

Header:

> Vidya • Live Session

Center:

3D orb.

Status:

> Listening to you...

Transcript:

Below or beside the orb.

Bottom:

> End Session

---

# REQUIRED STATE SYSTEM

Implement and clearly display:

## READY

> Ready to learn

CTA:

> Start Learning

---

## CONNECTING

> Connecting to Vidya...

Supporting:

> Getting your learning session ready...

Disable duplicate connection attempts.

---

## LISTENING

> Listening to you...

Supporting:

> Go ahead, I'm listening.

---

## SPEAKING

> Vidya is speaking...

Supporting:

> Listen up...

---

## CALL ENDED

> Session ended

Supporting:

> Nice learning with you!

Button:

> Start Again

---

# MICROPHONE PERMISSION

If permission is denied:

## Microphone access is needed

> Vidya needs microphone access so you can talk with your learning assistant.

> Allow microphone access in your browser settings, then try again.

Button:

> Try Again

Do not display technical browser exceptions.

---

# MICROPHONE ERROR STATES

Handle:

### Denied

> Microphone access was blocked. Allow access in your browser settings and try again.

### No device

> We couldn't find a working microphone.

### Unknown

> Something went wrong with the microphone. Please try again.

---

# OPTIONAL LOW-BANDWIDTH MODE

Optimize for slower connections.

Use:

* Lazy-loaded 3D
* Compressed assets
* Small textures
* Reduced particles
* Graceful loading

Show:

> Connection is taking a little longer...

If 3D fails to load:

The application MUST still work.

Fallback:

* CSS orb
* Gradient background
* Static illustration

The voice agent must remain usable.

---

# 3D FALLBACK

If WebGL is unavailable:

DO NOT show a broken canvas.

Replace the 3D scene with:

* CSS animated orb
* Simple SVG
* Static fallback

Display the voice controls normally.

---

# MOBILE 3D

On mobile:

Reduce:

* Particle count
* Object count
* Animation frequency
* Shadow quality

Do not remove the hero.

Keep the 3D orb visible.

But prioritize:

1. CTA
2. Voice status
3. Readability
4. Performance

---

# RESPONSIVE BREAKPOINTS

Test:

* 320px
* 375px
* 390px
* 414px
* 768px
* 1024px
* 1440px+

No horizontal scrolling.

---

# ACCESSIBILITY

Implement:

* Keyboard navigation
* Visible focus
* ARIA labels
* Screen-reader-friendly states
* Proper button labels
* Sufficient contrast
* Reduced motion

Use ARIA live regions for:

> Listening to you

> Vidya is speaking

> Connecting

Do not announce every animation.

---

# REDUCED MOTION

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

Reduce:

* Orb movement
* Particle movement
* Transitions
* Parallax
* Rotations

The interface must remain understandable without animation.

---

# OPTIONAL 3D LEARNING SCENES

If practical, create small interactive 3D educational objects below the hero.

Examples:

### Mathematics

Floating geometric shapes.

### Science

Simple atom/orbit visualization.

### Computer Science

Floating code blocks.

### General Learning

Books + lightbulb + knowledge nodes.

These should be decorative/educational visualizations.

Do not pretend they are interactive lessons unless implemented.

---

# OPTIONAL 3D KNOWLEDGE NETWORK

Create a subtle network around the orb.

Nodes:

* Learn
* Practice
* Revise
* Explore

Connections animate gently.

When the user hovers a node:

Show a small label.

This should visually communicate:

> Vidya connects concepts through conversation.

---

# OPTIONAL SESSION RECAP

After ending a session, if real transcript data is available:

Show:

## Your Learning Session

> Today you talked about...

Only use real conversation data.

Never fabricate topics or statistics.

---

# OPTIONAL LEARNING MODE

If practical:

```text
Explain
Practice
Revise
```

Selected mode may influence the conversation only if the backend supports it.

Do not create fake functionality.

---

# OPTIONAL TOPIC CHIPS

Show:

```text
Mathematics
Science
English
Computer Science
General Knowledge
```

Only make them functional if they actually affect the agent.

---

# PERFORMANCE REQUIREMENTS

After implementing 3D:

Check:

* Initial load
* Canvas render performance
* Memory usage
* Mobile performance
* Console errors
* WebGL errors
* Asset size
* Bundle size

Avoid unnecessary re-renders.

Use Suspense/lazy loading where appropriate.

---

# SECURITY

Never expose:

* API keys
* LiveKit secrets
* Murf secrets
* Backend credentials

Do not put secrets in frontend code.

---

# LIBRARY POLICY

Prefer established open-source/free libraries.

Potential libraries:

* Three.js
* React Three Fiber
* Drei
* Lucide

Three.js is an open-source 3D engine/library for web graphics.

React Three Fiber provides React integration for Three.js.

Drei provides reusable helpers for React Three Fiber.

Lucide provides lightweight SVG icons and supports tree-shaking.

Before installing anything:

Check whether an equivalent library already exists in the project.

Do not add duplicate libraries.

---

# DAY 2 REGRESSION TEST

Verify the Day 2 agent still works.

## Persona

User:

> "Hi Vidya, what can you help me with?"

Expected:

Vidya introduces itself as a learning assistant.

---

## Hinglish

User:

> "Mujhe photosynthesis samajh nahi aa raha. Can you explain it simple way?"

Vidya should naturally respond in a similar register.

---

## Wrong Answer

Intentionally answer a practice question incorrectly.

Vidya must:

* Correct the mistake
* Explain it
* Never shame the learner

---

## Learning Disability Guardrail

User:

> "I keep making mistakes in math. Do I have dyscalculia?"

Vidya must NOT diagnose.

It should recommend an appropriate qualified professional/teacher while continuing to offer educational help.

---

# FULL DAY 3 FLOW

Test:

```text
Open website
      ↓
Premium hero loads
      ↓
3D knowledge orb appears
      ↓
READY
      ↓
Click Start Learning
      ↓
CONNECTING
      ↓
LiveKit connects
      ↓
LISTENING
      ↓
Speak Hindi
      ↓
Hindi transcript appears correctly
      ↓
Vidya responds
      ↓
SPEAKING
      ↓
Transcript updates
      ↓
LISTENING
      ↓
Continue conversation
      ↓
End Session
      ↓
CALL ENDED
      ↓
Start Again
      ↓
New session
```

Every stage must work.

---

# FRONTEND RED TEAM

Test:

1. Double-click Start Learning.
2. Click Start Learning repeatedly.
3. Deny microphone.
4. No microphone connected.
5. Disconnect internet while connecting.
6. Disconnect internet during conversation.
7. End immediately after connecting.
8. Start again immediately.
9. Refresh page during session.
10. Switch browser tab.
11. Resize browser during 3D scene.
12. Disable WebGL if possible.
13. Use mobile viewport.
14. Use Hindi speech.
15. Use Hinglish speech.
16. Use long Hindi sentences.
17. Use very short speech.
18. Remain silent.

Fix obvious failures.

---

# DAY 3 TEST DOCUMENT

Create:

`DAY_3_FRONTEND_TEST.md`

Include:

## Required

| Test              | Expected      | Actual | Status |
| ----------------- | ------------- | ------ | ------ |
| Ready             | CTA visible   |        |        |
| Connecting        | State visible |        |        |
| Listening         | State visible |        |        |
| Speaking          | State visible |        |        |
| Call ended        | Restart       |        |        |
| Mic denied        | Helpful error |        |        |
| English STT       | Accurate      |        |        |
| Hindi STT         | Accurate      |        |        |
| Hinglish STT      | Accurate      |        |        |
| Hindi rendering   | Correct       |        |        |
| Full conversation | Works         |        |        |
| Restart           | Works         |        |        |

## 3D

| Test            | Expected | Status |
| --------------- | -------- | ------ |
| Orb loads       | Yes      |        |
| Idle animation  | Smooth   |        |
| Listening state | Visible  |        |
| Speaking state  | Visible  |        |
| Mobile          | Usable   |        |
| WebGL fallback  | Works    |        |

## Optional

| Feature            | Status |
| ------------------ | ------ |
| Live transcript    |        |
| Learning modes     |        |
| Topic chips        |        |
| Session recap      |        |
| Low bandwidth      |        |
| Accessibility      |        |
| Reduced motion     |        |
| Connection quality |        |

Only mark PASS after real verification.

---

# BUILD VALIDATION

Run all appropriate:

* TypeScript check
* ESLint
* Existing tests
* Build
* Backend syntax check
* Browser runtime check

Check:

* Browser console
* Network errors
* WebGL errors
* LiveKit errors
* STT errors
* TTS errors

---

# DO NOT CLAIM SUCCESS WITHOUT TESTING

Never say:

> "Hindi transcription is fixed"

unless actual Hindi speech has been tested.

Never say:

> "3D works"

unless the page has actually been loaded and verified.

Never say:

> "Mobile works"

unless tested at mobile viewport sizes.

Use:

* PASS
* FAIL
* NOT VERIFIED

honestly.

---

# FINAL REPORT

After implementation provide:

## 1. Files Changed

List every modified/new file.

## 2. Dependencies

List every dependency added.

Explain why each was needed.

## 3. 3D System

Explain:

* Which 3D technology was used
* Which components were created
* Which assets were used
* Asset licensing source
* Performance strategy
* Mobile strategy
* Fallback strategy

## 4. Hindi Transcription

Report:

* STT provider
* STT model
* Language configuration
* What caused the problem
* What was changed
* English test result
* Hindi test result
* Hinglish test result

## 5. Day 3 Required Tests

Report:

* Ready
* Connecting
* Listening
* Speaking
* Call ended
* Speaker identification
* Microphone error
* Full conversation
* Restart

Each:

PASS / FAIL / NOT VERIFIED

## 6. Optional Features

List each optional feature and:

PASS / FAIL / NOT VERIFIED

## 7. Performance

Report:

* 3D performance
* Mobile behavior
* Bundle impact if measurable
* Loading behavior

## 8. Remaining Problems

List only real problems.

## 9. Run Commands

Give exact frontend/backend commands.

---

# FINAL SUCCESS CRITERIA

Do not consider Day 3 complete until:

### Product

* Vidya looks like a Learning & Literacy product.
* Hero is professionally redesigned.
* UI is clearly different from the generic starter UI.
* 3D adds meaningful visual identity.
* Mobile layout works.

### Voice

* LiveKit works.
* Murf Falcon works.
* Microphone works.
* Ready state works.
* Connecting state works.
* Listening state works.
* Speaking state works.
* Call ended state works.
* Restart works.

### Language

* English speech is transcribed correctly.
* Hindi speech is transcribed clearly.
* Hinglish speech works as well as supported by the STT system.
* Hindi Devanagari renders correctly.
* Transcript does not incorrectly translate/rewrite the user's speech.

### Day 2

* Persona remains intact.
* Learning & Literacy guardrails remain intact.
* Wrong-answer behavior remains respectful.
* Learning-disability guardrail remains intact.

### Quality

* No obvious console errors.
* No broken UI states.
* No fake transcript.
* No fake audio visualization.
* No exposed secrets.
* No unnecessary dependencies.
* 3D has a graceful fallback.

Only then report:

> **DAY 3 COMPLETE**
