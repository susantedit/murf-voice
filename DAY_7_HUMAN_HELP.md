# Day 7 — Know When to Ask for Human Help (Vidya Learning & Literacy Agent)

This document describes the design, architecture, privacy safeguards, consent flow, and usage of the **Human Escalation / Teacher Support** system implemented for Vidya.

---

## 1. Overview & Objectives

Vidya is an AI learning assistant designed to help Indian students with concept explanations, practice questions, and revision. However, an AI assistant should not attempt to solve every problem alone — when a learner becomes frustrated, stuck, or explicitly requests a human teacher, Vidya must gracefully pause and create a structured **Teacher Support Request**.

### Primary Escalation Conditions
1. **Learner is Upset / Frustrated**: Repeated confusion or expressing desire to give up ("I'm frustrated and don't understand anything", "I keep getting everything wrong", "I don't want to study anymore").
2. **Learner Needs a Teacher**: Explicit requests for human or teacher assistance ("Can I talk to my teacher?", "I need help from a real teacher", "This is too difficult, can someone explain it?").

---

## 2. Architecture & Data Flow

```
[ Learner Speaks / Asks for Help ]
               │
               ▼
[ Vidya Detects Escalation Trigger ]
               │
               ▼
[ Vidya Asks Explicit Consent in Native Script ]
               │
         ┌─────┴─────┐
        YES          NO
         │           │
         ▼           ▼
[ call create_escalation ]   [ Respect Decision & ]
         │                   [ Continue Helping   ]
         ▼
[ Generate Reference ID: VID-XXXXXX ]
[ Sanitize Privacy/Secrets          ]
[ Store in SQLite DB (escalations)  ]
[ Emit Data Channel Event           ]
               │
               ▼
[ Vidya Speaks Reference ID & Next Steps ]
[ Teacher Support Panel Updates Live     ]
```

---

## 3. Database Schema

The escalation requests are persisted in the existing SQLite database (`backend/data/vidya.db`) inside table `escalations`:

```sql
CREATE TABLE IF NOT EXISTS escalations (
    reference_id      TEXT PRIMARY KEY,  -- Unique ID e.g. VID-7A42K9
    user_id           TEXT NOT NULL,     -- Learner user ID
    name              TEXT,              -- Student name
    reason            TEXT NOT NULL,     -- Reason code (e.g. learner_frustrated, explicit_teacher_request)
    summary           TEXT NOT NULL,     -- Privacy-safe summary of issue
    what_was_checked  TEXT,              -- Concepts/exercises checked by Vidya
    urgency           TEXT DEFAULT 'medium', -- low | medium | high
    language          TEXT,              -- Preferred language e.g. Hindi-English
    follow_up_method  TEXT,              -- teacher_callback | app_dashboard | phone
    status            TEXT DEFAULT 'open', -- open | in_progress | resolved
    created_at        TEXT NOT NULL,     -- ISO 8601 UTC timestamp
    FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_escalations_user ON escalations(user_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
```

---

## 4. Privacy Safeguards

As mandated by Step 3, Vidya enforces strict privacy rules:
- **No Credentials/Secrets**: Passwords, OTPs, PINs, bank accounts, card numbers, or secret tokens are automatically redacted via `sanitize_summary()`.
- **Concise Educational Summaries**: Summaries capture only relevant learning details (topic, attempt count, confusion point, preferred language).
- **Explicit Consent**: Consent is mandatory before any data is sent or saved.

---

## 5. Explicit Consent Flow

Vidya **never assumes consent**. Before creating an escalation, Vidya explicitly asks the student for permission in native script:

- **Hindi**: `"मैं आपकी मदद के लिए एक teacher-support request बना सकती हूँ। इसमें आपका नाम, समस्या का छोटा summary और आपकी preferred language share होगी। क्या मैं इसे भेज दूँ?"`
- **English**: `"I can create a teacher-support request for you. It will share your name, a short summary of the issue, and your preferred language. May I send this?"`

- **If User Says YES**: Vidya calls `create_escalation`, obtains the unique reference ID, and speaks it clearly to the user.
- **If User Says NO**: Vidya respects the decision, does NOT create any request, and continues helping as best as possible.

---

## 6. REST API Endpoints

The REST API server (`backend/src/api/memory_server.py`) exposes endpoints for dashboard integration:

- `GET /escalations` — List all escalations (supports `?status=open|in_progress|resolved`).
- `GET /escalations/{user_id}` — List escalations for a specific student.
- `POST /escalations` or `PATCH /escalations/{reference_id}` — Update request status (`open` -> `in_progress` -> `resolved`).

---

## 7. Frontend Integration

1. **`EscalationCard`**: In-session live card rendered in `VidyaLearningRoom` when a request is preparing, created (showing `VID-XXXXXX` and copy button), or failed.
2. **`TeacherSupportPanel`**: Teacher/Admin dashboard on the main page listing all support requests with urgency badges, details, and status toggle buttons (`Set Open`, `In Progress`, `Resolve`).

---

## 8. Native Script Rule

ALL Hindi output is written exclusively in **Devanagari script** (e.g. `"नमस्ते"`, `"टीचर"`). Romanized Hindi (such as `"namaste, main aapki madad..."`) is strictly prohibited across agent responses, system prompts, consent messages, and UI text.

---

## 9. Demonstration Scenarios

### Demo Flow A — Normal Conversation (No Escalation)
- **User**: "Explain quadratic equations."
- **Vidya**: Explains the concept normally. No escalation requested or created.

### Demo Flow B — Teacher Request + Consent Granted
- **User**: "मुझे algebra बिल्कुल समझ नहीं आ रहा। मैं teacher से बात करना चाहता हूँ।"
- **Vidya**: "मैं आपकी मदद के लिए एक teacher-support request बना सकती हूँ... क्या मैं इसे भेज दूँ?"
- **User**: "हाँ, भेज दो।"
- **Vidya**: Calls `create_escalation()`, receives `VID-7A42K9`, speaks the ID, and shows the status card in the UI.

### Demo Flow C — Teacher Request + Consent Denied
- **User**: "I need help from a real teacher."
- **Vidya**: Explains what will be shared and asks for permission.
- **User**: "No."
- **Vidya**: "कोई बात नहीं। Let's try to understand this together..." (No request created).

---

## 10. Automated Tests

Run the test suite via:
```bash
uv run pytest tests/test_escalation.py
```
All 9 test cases pass cleanly, covering reference ID formatting, privacy sanitization, consent granted vs denied, status updates, graceful database failure, memory preservation, and native Devanagari script rules.
