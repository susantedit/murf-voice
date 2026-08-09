# VIDYA — DAY 4 PRODUCT REQUIREMENTS DOCUMENT (FINAL)

**Product:** Vidya — AI Voice Learning Companion  
**Track:** Learning & Literacy  
**Challenge:** 10 Days of Voice Agents  
**Day:** 4 — Memory, Privacy & Premium UI  
**Status:** Implementation — UI redesign phase

---

## 1. Product Vision

Vidya is a persistent AI learning companion that remembers learners with their consent.

> **Vidya remembers you — only what you choose, only for learning.**

Day 4 turns a functional voice agent into a product a judge would want to use.

---

## 2. What Is Already Built and Working

### Backend (complete — do not change)
- SQLite database at `backend/data/vidya.db`, three tables: `users`, `learner_facts`, `learning_topics`
- `database.py` — connection manager, `init_db()`, parameterized queries
- `learner_repository.py` — all CRUD with allowed-field validation
- `memory_service.py` — `get_learner_memory`, `save_learner_memory`, `forget_learner_memory`
- `memory_server.py` — REST API on port 8888 (`GET /memory/{id}`, `DELETE /memory/{id}`)
- `agent.py` — three memory tools, multilingual STT/TTS, consent rules in system prompt

### Frontend (complete)
- `NavBar` — brand, links (Learn / Memory / About), Start Learning CTA, mobile hamburger
- `WelcomeView` — hero with VoiceOrb, returning-user detection, topic chips, privacy section
- `VidyaLearningRoom` — centered orb, state badge, inspiration chips, memory card, controls
- `AIActivityPanel` — real LiveKit event feed
- `LearningContextPanel` — live SQLite memory during session
- `SessionSummary` — post-session recap
- `/memory` page — full dashboard, `MemoryCard`, `ForgetConfirmModal`, error and empty states
- `useLearnerMemory` hook
- `getUserId()` — stable anonymous UUID

---

## 3. What This Document Covers — The UI Redesign

All Day 4 feature requirements are complete. This document specifies the **premium UI/UX redesign** that makes Vidya look and feel like a real EdTech product for the hackathon demo.

### P0 — Required for judge demo

| # | Requirement | Target file(s) |
|---|---|---|
| 1 | Replace ALL emoji used as UI icons with Phosphor SVG icons | All components |
| 2 | Hero headline minimum 56px desktop (72px ideal) with "remembers you." in accent color | `welcome-view.tsx` |
| 3 | Hero section: 2-column layout (text left, animated orb right) on desktop | `welcome-view.tsx` |
| 4 | Navbar: fixed, backdrop-blur, logo with subtitle, Book SVG icon, memory indicator | `nav-bar.tsx` |
| 5 | "What would you like to practice?" — polished topic cards with SVG icons, not just chips | `welcome-view.tsx` |
| 6 | Privacy & Memory section with Lock, Shield, Trash SVG icons and clear copy | `welcome-view.tsx` |
| 7 | Learning Room: current agent state (LISTENING / THINKING / SPEAKING / CONNECTING) shown prominently at top center, large and color-coded | `vidya-learning-room.tsx` |
| 8 | AI Activity panel: productized event items with icon + label + timestamp, "Technical Details" collapsible drawer | `ai-activity-panel.tsx` |
| 9 | Transcript: slide-in right panel on desktop, bottom sheet on mobile, collapsible | `vidya-learning-room.tsx` |
| 10 | Memory journey card renders ONLY when SQLite has real consented data — never fabricated | `vidya-learning-room.tsx` |
| 11 | Session summary: three CTAs — Continue Learning, View My Memory, New Topic | `session-summary.tsx` |
| 12 | All Hindi text renders in Devanagari in transcript (verified in browser) | Font stack, transcript |
| 13 | Orb rings animate differently per agent state using CSS only (no JS animation loops) | `welcome-view.tsx`, `vidya-learning-room.tsx` |

### P1 — Strongly recommended

| # | Requirement | Target file(s) |
|---|---|---|
| 14 | Memory toast notification when agent confirms a save ("Saved to your learning memory.") | `ai-activity-panel.tsx` + Sonner |
| 15 | Topic chip click passes selected topic to agent as session opening context | `welcome-view.tsx`, `vidya-learning-room.tsx` |
| 16 | Returning user card on hero ("Continue where you left off — Last topic: Fractions") | `welcome-view.tsx` |
| 17 | Forget modal shows what will be deleted before confirming | `forget-confirm-modal.tsx` |
| 18 | `prefers-reduced-motion` respected — all animate-ping/spin/pulse become opacity-only | `globals.css` |

### P2 — Optional polish

| # | Requirement | Target file(s) |
|---|---|---|
| 19 | Memory nodes orbiting orb on `/memory` page | `memory-card.tsx` |
| 20 | Mobile layout: all panels collapse cleanly below 640px | All session components |

---

## 4. What Must NOT Be Changed

- Backend logic, database schema, agent tools, system prompt — fully complete
- LiveKit session lifecycle — do not break connect / disconnect flow
- `useLearnerMemory` hook, `getUserId()`, token route — complete and correct
- Day 2 guardrails (no diagnoses, no shame, refusals) — must continue working
- Day 3 states (Connecting, Listening, Thinking, Speaking, Ended) — must continue working

---

## 5. Non-Functional Requirements

- No horizontal scroll at any viewport from 320px to 1920px
- Touch targets minimum 44×44px
- No `any` TypeScript types introduced
- No `console.log` with user data
- No fabricated events in AI Activity panel
- No hardcoded user names or memory values in JSX
- `pnpm build` must pass with zero TypeScript and ESLint errors after redesign

---

## 6. Definition of Done for UI Redesign

```
[ ] No emojis as primary UI icons anywhere
[ ] Hero headline ≥ 56px desktop, "remembers you." visually distinct
[ ] Hero 2-column layout renders correctly at 1280px
[ ] Topic cards show SVG icons (not emoji)
[ ] Privacy section uses SVG icons
[ ] Navbar: Book SVG logo, backdrop-blur, memory indicator
[ ] Learning Room: prominent state badge at top center
[ ] AI Activity: icon + label + time per item, Technical Details drawer
[ ] Transcript: slide-in panel on desktop, accordion on mobile
[ ] Memory journey card: only shown when data is real
[ ] Session summary: 3 CTA buttons all functional
[ ] Orb ring CSS animations match state (listening = fast cyan ping, thinking = slow violet spin, speaking = green pulse)
[ ] Hindi Devanagari renders correctly in transcript
[ ] pnpm build → 0 errors
[ ] Mobile 375px: usable, no horizontal scroll
```
