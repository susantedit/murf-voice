"""
Day 9 — Multi-Agent Multi-Persona Handoff Test Suite
Tests:
1. Normal learning query (Science / General) stays with Vidya (Voice: Anisha).
2. Specialized math problem solving triggers transfer_to_maths_specialist (Voice: Samar).
3. Quiz / Rapid fire practice triggers transfer_to_quiz_master (Voice: Pooja).
4. MathsSpecialistAssistant preserves student context (name, topic query) on enter.
5. QuizMasterAssistant preserves student context (name, topic) on enter.
6. MathsSpecialistAssistant provides Socratic guidance rather than immediate direct answers.
7. MathsSpecialistAssistant hand_back_to_vidya returns Assistant instance.
8. QuizMasterAssistant hand_back_to_vidya returns Assistant instance.
9. Cross-specialist handoff (Ramanujan <-> Pooja) operates smoothly.
10. Persona voice constants (Anisha, Samar, Pooja) are properly configured.
"""

from __future__ import annotations

import pytest
from livekit.agents import AgentSession, inference, llm

from agent import (
    VOICE_MATHS_SPECIALIST,
    VOICE_QUIZ_MASTER,
    VOICE_VIDYA,
    Assistant,
    MathsSpecialistAssistant,
    QuizMasterAssistant,
)


def _llm() -> llm.LLM:
    return inference.LLM(model="openai/gpt-4.1-mini")


def test_persona_voices_configuration() -> None:
    """Test 0: Verify distinct recommended Murf Falcon voices for all 3 personas."""
    assert VOICE_VIDYA == "Anisha"
    assert VOICE_MATHS_SPECIALIST == "Samar"
    assert VOICE_QUIZ_MASTER == "Pooja"


@pytest.mark.asyncio
async def test_normal_query_stays_with_vidya() -> None:
    """Test 1: Normal non-math question is answered directly by Vidya without handoff."""
    async with (
        _llm() as test_llm,
        AgentSession(llm=test_llm) as session,
    ):
        await session.start(Assistant())
        result = await session.run(
            user_input="Can you explain how photosynthesis works in plants?"
        )
        await (
            result.expect.next_event()
            .is_message(role="assistant")
            .judge(
                test_llm,
                intent="""
                The agent:
                - Answers the science question about photosynthesis directly
                - Does NOT attempt to hand off to the maths specialist or quiz master
                - Maintains the persona of Vidya, the learning assistant
                """,
            )
        )
        result.expect.no_more_events()


@pytest.mark.asyncio
async def test_math_query_triggers_handoff() -> None:
    """Test 2: Detailed math problem solving triggers transfer_to_maths_specialist tool."""
    async with (
        _llm() as test_llm,
        AgentSession(llm=test_llm) as session,
    ):
        await session.start(Assistant())
        result = await session.run(
            user_input="Can you help me solve 3x + 9 = 21 step by step in algebra?"
        )
        await (
            result.expect.next_event()
            .is_message(role="assistant")
            .judge(
                test_llm,
                intent="""
                The agent:
                - Recognizes the request as in-depth math problem solving
                - Informs the user that it will connect/transfer them to the Maths specialist (Srinivasa Ramanujan)
                - Hands off the problem step by step
                """,
            )
        )


@pytest.mark.asyncio
async def test_quiz_query_triggers_handoff() -> None:
    """Test 3: Interactive quiz challenge triggers transfer_to_quiz_master tool."""
    async with (
        _llm() as test_llm,
        AgentSession(llm=test_llm) as session,
    ):
        await session.start(Assistant())
        result = await session.run(
            user_input="I want to do a fun rapid-fire quiz challenge on solar system with Pooja!"
        )
        await (
            result.expect.next_event()
            .is_message(role="assistant")
            .judge(
                test_llm,
                intent="""
                The agent:
                - Recognizes the request for a quiz challenge with Pooja
                - Informs the user that it will connect/transfer them to Pooja, the Quiz Master
                """,
            )
        )


@pytest.mark.asyncio
async def test_math_specialist_initialization_context() -> None:
    """Test 4: MathsSpecialistAssistant retains learner details and query."""
    user_id = "test-student-aarav"
    name = "Aarav"
    topic = "solve 2x + 4 = 12"
    specialist = MathsSpecialistAssistant(
        user_id=user_id,
        student_name=name,
        grade_level="Class 8",
        initial_query=topic,
    )
    assert specialist._user_id == user_id
    assert specialist._student_name == name
    assert specialist._grade_level == "Class 8"
    assert specialist._initial_query == topic


@pytest.mark.asyncio
async def test_quiz_master_initialization_context() -> None:
    """Test 5: QuizMasterAssistant retains learner details and topic."""
    user_id = "test-student-pooja"
    name = "Meera"
    topic = "Periodic Table"
    quiz_master = QuizMasterAssistant(
        user_id=user_id,
        student_name=name,
        grade_level="Class 10",
        topic=topic,
    )
    assert quiz_master._user_id == user_id
    assert quiz_master._student_name == name
    assert quiz_master._grade_level == "Class 10"
    assert quiz_master._topic == topic


@pytest.mark.asyncio
async def test_specialist_socratic_guidance() -> None:
    """Test 6: Srinivasa Ramanujan uses Socratic questioning instead of blurting out the final answer."""
    async with (
        _llm() as test_llm,
        AgentSession(llm=test_llm) as session,
    ):
        specialist = MathsSpecialistAssistant(
            user_id="test-student-1",
            student_name="Priya",
            initial_query="5x = 25",
        )
        await session.start(specialist)
        result = await session.run(
            user_input="What is the answer to 5x = 25? Just give me the answer."
        )
        await (
            result.expect.next_event()
            .is_message(role="assistant")
            .judge(
                test_llm,
                intent="""
                The agent:
                - Follows Socratic guidance
                - Asks the student a guiding question (e.g. asking what operation cancels multiplication or what 25 divided by 5 is)
                - Encourages the student to take the step rather than simply stating x = 5
                """,
            )
        )
        result.expect.no_more_events()


@pytest.mark.asyncio
async def test_specialist_hand_back_tool() -> None:
    """Test 7: Maths specialist hand_back_to_vidya returns Assistant instance with user_id preserved."""
    specialist = MathsSpecialistAssistant(
        user_id="test-student-return",
        student_name="Rohan",
    )

    class FakeSession:
        async def say(self, text: str) -> None:
            pass

    specialist._session = FakeSession()
    returned_agent = await specialist.hand_back_to_vidya(reason="topic_completed")
    assert isinstance(returned_agent, Assistant)
    assert returned_agent._user_id == "test-student-return"


@pytest.mark.asyncio
async def test_quiz_master_hand_back_tool() -> None:
    """Test 8: Quiz Master hand_back_to_vidya returns Assistant instance with user_id preserved."""
    quiz_master = QuizMasterAssistant(
        user_id="test-student-quiz-return",
        student_name="Kavya",
    )

    class FakeSession:
        async def say(self, text: str) -> None:
            pass

    quiz_master._session = FakeSession()
    returned_agent = await quiz_master.hand_back_to_vidya(reason="quiz_completed")
    assert isinstance(returned_agent, Assistant)
    assert returned_agent._user_id == "test-student-quiz-return"


@pytest.mark.asyncio
async def test_cross_specialist_handoff() -> None:
    """Test 9: Cross-specialist handoff between Maths specialist and Quiz master."""
    specialist = MathsSpecialistAssistant(
        user_id="test-student-cross",
        student_name="Ananya",
    )

    class FakeSession:
        async def say(self, text: str) -> None:
            pass

    specialist._session = FakeSession()
    quiz_agent = await specialist.transfer_to_quiz_master(topic="Geometry")
    assert isinstance(quiz_agent, QuizMasterAssistant)
    assert quiz_agent._user_id == "test-student-cross"
    assert quiz_agent._student_name == "Ananya"

    quiz_agent._session = FakeSession()
    maths_agent = await quiz_agent.transfer_to_maths_specialist(topic="Algebra")
    assert isinstance(maths_agent, MathsSpecialistAssistant)
    assert maths_agent._user_id == "test-student-cross"
    assert maths_agent._student_name == "Ananya"

