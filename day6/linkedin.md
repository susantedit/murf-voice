# Day 6 LinkedIn Caption

---

Day 6 of 10 — Vidya now calls you. 📞

I'm building **Vidya**, an AI learning companion for Indian school students, as part of the **Murf AI Voice Agent Challenge** (#10DaysofAIVoiceAgents).

Days 1–5 were about Vidya listening and responding. Day 6 flips the model: **Vidya places the call.**

Here's how it works:

Students open the app, set a daily practice time, and enter their SIP URI. At that time, an asyncio scheduler wakes up, checks that a call hasn't already happened today, and dispatches a LiveKit SIP outbound call — no PSTN, no Twilio, no phone number required. The call rings on **Linphone**, a free softphone app, over SIP via `sip.linphone.org`.

Vidya's opening is non-negotiable. Because the student didn't ask for this call, the first thing they hear is exactly who is calling, why, and how to stop it:

*"नमस्ते Riya, मैं Vidya AI Learning Assistant हूँ। मैं आपके daily learning practice session के लिए call कर रही हूँ। अगर आप future calls बंद करना चाहते हैं तो मुझे बता सकते हैं।"*

All Hindi is in Devanagari — no romanized transliteration anywhere in the codebase.

From there, Vidya picks up right where Day 4 memory left off — the student's name, class level, and the topic they were practicing last. If a student says **"बंद करो"**, Vidya calls a `set_call_opt_out` tool, confirms in Hindi, and gracefully ends the session. No future calls.

**The full stack for Day 6:**
Scheduler → LiveKit SIP Dispatch → Linphone SIP → Vidya Agent → Deepgram STT (multilingual) → Gemini LLM → **Murf Falcon TTS** → Student

The voice is still **Murf Falcon** (Anisha, Conversation style). An outbound AI tutor that greets you in Hindi, remembers your algebra struggles from last week, and only exists because Falcon sounds like a person and not a system announcement.

5 days left. Vidya is starting to feel like a real product.

#10DaysofAIVoiceAgents #MurfFalcon #VoiceForBharat #MurfAI #VoiceAI #EdTech #LiveKit #AIAgents #BuildInPublic
