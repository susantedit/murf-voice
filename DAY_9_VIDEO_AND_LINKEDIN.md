# Day 9 Video Script & LinkedIn Post

---

## 🎬 Part 1: Video Script (60–90 Seconds)

### Pre-Recording Setup:
1. Terminal 1: `cd backend && uv run python src/agent.py start`
2. Terminal 2: `cd backend && uv run python -m src.api.memory_server`
3. Terminal 3: `cd frontend && pnpm dev`
4. Open **http://localhost:3000** in browser and click **Connect**.

---

### Exact Script to Speak:

#### [0:00 - 0:15] Intro (Speak to Camera / Screen)
> *"Hey everyone! Welcome to Day 9 of the 10 Days of AI Voice Agents with Murf AI. Today's challenge is all about **Agent Handoff** — letting our primary AI learning tutor, Vidya, hand off complex mathematical problem solving to our specialized Indian mathematics mentor, **Srinivasa Arya bhatta**! Let's see it in action!"*

---

#### [0:15 - 0:35] Step 1: Normal Query (Stays with Vidya)
* **You speak to Vidya**:
  > *"Hi Vidya, can you explain how photosynthesis works?"*
* **Vidya responds**:
  > *"Photosynthesis is the process where plants use sunlight, water, and carbon dioxide to create food and oxygen. Would you like to practice a question on this, or explore another concept?"*
* **Your Voiceover**:
  > *"As you can see, general science and concept questions stay directly with Vidya without any unnecessary handoff."*

---

#### [0:35 - 1:05] Step 2: Math Specialist Handoff (Hands off to Srinivasa Arya bhatta)
* **You speak to Vidya**:
  > *"Can you help me solve 3x + 7 = 22 step by step?"*
* **Vidya announces handoff**:
  > *"I'll connect you to our Maths specialist, Srinivasa Arya bhatta, to solve this step by step."*
* **Srinivasa Arya bhatta takes over & speaks**:
  > *"नमस्ते! I'm Srinivasa Arya bhatta, your Maths specialist. I see you'd like to work on '3x + 7 = 22'. Let's solve it step by step! What do you think our first step should be?"*
* **You respond**:
  > *"We should subtract 7 from both sides to get 3x = 15."*
* **Srinivasa Arya bhatta responds**:
  > *"Spot on! Now divide both sides by 3. What do you get for x?"*

---

#### [1:05 - 1:20] Step 3: Hand Back (Bonus)
* **You speak**:
  > *"x is 5! Now can we go back to studying science?"*
* **Srinivasa Arya bhatta**:
  > *"I'll connect you back to Vidya now."*
* **Vidya**:
  > *"Welcome back! What science topic would you like to explore next?"*

---

#### [1:20 - 1:30] Outro
> *"Seamless multi-agent handoff powered by LiveKit Agents and ultra-low latency voice with Murf Falcon TTS. See you on Day 10!"*

---

## 📱 Part 2: LinkedIn Post Caption

```text
Day 9 of 10 — One agent shouldn’t try to do everything. Today, Vidya hands off to Srinivasa Arya bhatta. 🤝📐

I’m building Vidya as part of the @Murf AI Voice Agent Challenge (#10DaysofAIVoiceAgents) in the Learning & Literacy track. 

Today’s milestone: Multi-Agent Handoff inspired by India's greatest intellectual luminaries, powered by LiveKit Agents and Murf Falcon TTS.

Here’s why handoff matters in voice tutoring:
A general learning assistant is great for concept explanations and quizzes. But when a student needs deep, step-by-step mathematical problem solving, they don’t need an answer generator — they need Socratic guidance inspired by masters like Srinivasa Arya bhatta.

Here's how Day 9 works:
1️⃣ Vidya handles general science, revision, and curriculum questions directly.
2️⃣ When the student asks for detailed algebra/equation practice ("Help me solve 3x + 7 = 22 step by step"), Vidya verbally announces the handoff and calls `transfer_to_maths_specialist`.
3️⃣ Arya bhatta (Maths Specialist) seamlessly takes over with full context — student name, grade level, and the forwarded problem — without asking the student to repeat themselves.
4️⃣ Arya bhatta uses the Socratic method: guiding step-by-step with patience instead of blurting out the answer.
5️⃣ Once math practice is done, Arya bhatta calls `hand_back_to_vidya` to return control to Vidya.

⚡ The Voice Engine:
The entire pipeline runs on Murf Falcon TTS (the fastest streaming TTS API). The zero-latency streaming and natural conversational pacing make the handoff between agents feel completely organic, just like a teacher bringing in a subject expert into the classroom.

Stack: LiveKit Agents ~1.4 • Groq LLM • Deepgram Nova-3 • Murf Falcon TTS • SQLite Memory

One day left! 🚀

#10DaysofAIVoiceAgents #MurfFalcon #VoiceForBharat #MurfAI #VoiceAI #EdTech #LiveKit #AIAgents #BuildInPublic
```
