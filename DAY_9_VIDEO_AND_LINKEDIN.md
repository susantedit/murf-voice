# Day 9 Video Script & LinkedIn Post: Multi-Persona Voice AI with Murf Falcon

---

## 🎬 Part 1: Video Script (60–90 Seconds)

### Pre-Recording Setup:
1. Terminal 1: `cd backend && uv run python src/agent.py dev`
2. Terminal 2: `cd backend && uv run python -m src.api.memory_server`
3. Terminal 3: `cd frontend && pnpm dev`
4. Open **http://localhost:3000** in browser and click **Connect**.

---

### Exact Script to Speak:

#### [0:00 - 0:15] Intro (Speak to Camera / Screen)
> *"Hey everyone! Welcome to Day 9 of the 10 Days of AI Voice Agents with Murf AI. Today's challenge is all about **Multi-Agent Handoff** with **Distinct Persona Voices**! Instead of a single generic voice, we've implemented 3 distinct personas powered by Murf Falcon streaming voices: **Vidya (voiced by Anisha)** for primary tutoring, **Srinivasa Ramanujan (voiced by Samar)** for step-by-step Maths, and **Pooja (voiced by Pooja)** for energetic quizzes! Let's see them in action!"*

---

#### [0:15 - 0:35] Step 1: Normal Query (Vidya • Voice: Anisha)
* **You speak to Vidya**:
  > *"Hi Vidya, can you explain how photosynthesis works?"*
* **Vidya responds (Warm, friendly voice — Anisha)**:
  > *"Photosynthesis is the process where plants use sunlight, water, and carbon dioxide to create food and oxygen. Would you like to practice a question on this, or explore another concept?"*
* **Your Voiceover**:
  > *"General science and concepts stay directly with Vidya using her warm conversational Anisha voice."*

---

#### [0:35 - 1:05] Step 2: Math Specialist Handoff (Srinivasa Ramanujan • Voice: Samar)
* **You speak to Vidya**:
  > *"Can you help me solve 3x + 7 = 22 step by step?"*
* **Vidya announces handoff**:
  > *"I'll connect you to our Maths specialist, Srinivasa Ramanujan, to solve this step by step."*
* **Srinivasa Ramanujan takes over (Analytical, enthusiastic male voice — Samar)**:
  > *"नमस्ते! I'm Srinivasa Ramanujan, your Maths specialist. I see you'd like to work on '3x + 7 = 22'. Let's solve it step by step! What do you think our first step should be?"*
* **You respond**:
  > *"We should subtract 7 from both sides so 3x = 15."*
* **Srinivasa Ramanujan responds**:
  > *"Spot on! Now divide both sides by 3. What do you get for x?"*

---

#### [1:05 - 1:25] Step 3: Quiz Master Transfer (Pooja • Voice: Pooja)
* **You speak**:
  > *"x is 5! Can we do a fun quiz challenge with Pooja now?"*
* **Srinivasa Ramanujan announces transfer**:
  > *"Let's connect you to Pooja, our Quiz Master, for an exciting quiz challenge!"*
* **Pooja takes over (High-energy, vibrant female voice — Pooja)**:
  > *"नमस्ते! I'm Pooja, your Quiz Master! Ready for a quick quiz challenge? Say 'ready' whenever you're set!"*

---

#### [1:25 - 1:35] Outro
> *"Seamless multi-agent handoff with live voice switching powered by LiveKit Agents and ultra-low latency Murf Falcon TTS (Anisha, Samar, Pooja). See you on Day 10!"*

---

## 📱 Part 2: LinkedIn Post Caption

```text
Day 9 of 10 — Different Personas, Different Voices! Multi-Agent Handoff with Murf Falcon TTS. 🤝🎙️📐

I’m building Vidya as part of the @Murf AI Voice Agent Challenge (#10DaysofAIVoiceAgents) in the Learning & Literacy track. 

Today’s milestone: Multi-Agent Handoff where each persona has its own unique voice and pedagogical personality, powered by LiveKit Agents and Murf Falcon TTS!

Following the feedback to give each persona a distinct personality and voice, here is our 3-Persona Voice Team:

1️⃣ Vidya (Voice: Anisha) 🌸
Warm, empathetic, nurturing tutor for concept explanations, literacy, revision, and learner memory.

2️⃣ Srinivasa Ramanujan (Voice: Samar) 📐
Sharp, articulate, and encouraging male voice for in-depth Socratic step-by-step math problem solving without giving away final answers.

3️⃣ Pooja (Voice: Pooja) ⚡
High-energy, cheerful, vibrant female voice for interactive rapid-fire quiz challenges and science exploration.

⚡ How It Works Under the Hood:
In LiveKit Agents ~1.4, returning a new `Agent` instance from a `@function_tool` dynamically transfers the live session. By attaching distinct `murf.TTS(voice=...)` configurations to each Agent subclass, LiveKit switches audio synthesis on the fly with zero buffering delay! Context like student name and active topics are smoothly preserved across handoffs.

Stack: LiveKit Agents ~1.4 • Groq LLM (Llama 3.3 70B) • Deepgram Nova-3 • Murf Falcon TTS (Anisha, Samar, Pooja) • SQLite Memory

One day left! 🚀

#10DaysofAIVoiceAgents #MurfFalcon #VoiceForBharat #MurfAI #VoiceAI #EdTech #LiveKit #AIAgents #BuildInPublic
```
