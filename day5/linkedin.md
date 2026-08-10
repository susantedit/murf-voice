# Day 5 LinkedIn Caption

---

Day 5 of 10 — and Vidya just leveled up. 🎓

I'm building **Vidya** as part of the **Murf AI Voice Agent Challenge** (#10DaysofAIVoiceAgents), and today's milestone is one I'm genuinely proud of: **tool/function calling**.

Here's what that means in practice:

When a student says *"give me something to practice"* — Vidya doesn't just improvise. It calls `get_next_exercise`, pulls a **personalized exercise** from a curated local dataset (Classes 6–12, Indian school curriculum), and speaks it naturally in Hindi or English. When the learner answers, `score_answer` evaluates the response and Vidya gives warm, encouraging feedback — no shame, just learning.

What makes this powerful is **Day 4's persistent learner memory**. Vidya already knows the student's name, class level, and the topic they were last working on. So the exercise it fetches isn't random — it's tailored. A Class 9 student working on algebra gets an algebra question at the right difficulty. That's real personalization through memory + tool use working together.

The voice stays natural throughout — powered by **Murf Falcon** TTS (Anisha voice, Conversation style). The architecture underneath: **LiveKit Agents** orchestrating the pipeline, **Groq** (llama-3.3-70b) as the LLM making the tool decisions, and a local JSON dataset so Vidya never invents exercises.

**Today's stack in one line:**
Voice → Deepgram STT → Groq LLM → SQLite Memory → Local Exercise Dataset → Murf Falcon TTS → Learner

Vidya is built for **Learning & Literacy** — specifically for Indian school students who learn better when spoken to in their own language, at their own pace, with exercises that feel relevant. That's the whole point of **Voice for Bharat**.

5 days in. 5 to go. 🚀

@MurfAI — the Falcon TTS is what makes this feel like a real tutor, not a robot.

#10DaysofAIVoiceAgents #MurfFalcon #VoiceForBharat #MurfAI #VoiceAI #EdTech #LiveKit #AIAgents #BuildInPublic
