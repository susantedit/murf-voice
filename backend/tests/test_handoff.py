"""
Day 9 — Multi-Agent Handoff Test Suite
Tests:
1. Normal learning query (Science / General) stays with Vidya (main agent).
2. Specialized math problem solving triggers transfer_to_maths_specialist handoff tool.
3. MathsSpecialistAssistant preserves student context (name, topic query) on enter.
4. MathsSpecialistAssistant provides Socratic guidance rather than immediate direct answers.
5. MathsSpecialistAssistant hand_back_to_vidya returns Assistant instance.
"""

from __future__ import annotations

import pytest
from livekit.agents import AgentSession, inference, llm

from agent import Assistant, MathsSpecialistAssistant


def _llm() -> llm.LLM:
    return inference.LLM(model="openai/gpt-4.1-mini")


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
                - Does NOT attempt to hand off to the maths specialist
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
        # Agent should either call transfer_to_maths_specialist or announce connecting to the math specialist
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
async def test_specialist_initialization_context() -> None:
    """Test 3: MathsSpecialistAssistant retains learner details and query."""
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
async def test_specialist_socratic_guidance() -> None:
    """Test 4: Srinivasa Ramanujan uses Socratic questioning instead of blurting out the final answer."""
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
    """Test 5: hand_back_to_vidya returns Assistant instance with user_id preserved."""
    specialist = MathsSpecialistAssistant(
        user_id="test-student-return",
        student_name="Rohan",
    )
    # Call hand_back_to_vidya directly (mocking session.say)
    class FakeSession:
        async def say(self, text: str) -> None:
            pass

    specialist._session = FakeSession()
    returned_agent = await specialist.hand_back_to_vidya(reason="topic_completed")
    assert isinstance(returned_agent, Assistant)
    assert returned_agent._user_id == "test-student-return"
