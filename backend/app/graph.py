"""LangGraph debate flow implementation."""

import asyncio
import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Any

from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

from .config import Settings
from .models import LLMProvider, Message, StreamEvent


def create_llms(settings: Settings) -> tuple[ChatOpenAI, ChatGoogleGenerativeAI]:
    """Create LLM instances."""
    openai_llm = ChatOpenAI(
        model="gpt-4o",
        api_key=settings.openai_api_key,
        temperature=0.7,
        max_tokens=1024,
    )

    gemini_llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=settings.google_api_key,
        temperature=0.7,
        max_output_tokens=1024,
    )

    return openai_llm, gemini_llm


class DebateGraph:
    """Manages the debate flow between two LLMs."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.openai_llm, self.gemini_llm = create_llms(settings)
        self._stop_signals: dict[str, bool] = {}

    def stop_debate(self, session_id: str) -> None:
        """Signal a debate to stop."""
        self._stop_signals[session_id] = True

    def is_stopped(self, session_id: str) -> bool:
        """Check if debate is stopped."""
        return self._stop_signals.get(session_id, False)

    def clear_stop_signal(self, session_id: str) -> None:
        """Clear stop signal for a session."""
        self._stop_signals.pop(session_id, None)

    async def _get_responses(
        self, question: str, round_num: int, latest_openai: str, latest_gemini: str
    ) -> tuple[str, str]:
        """Get responses from both LLMs in parallel."""
        is_first_round = round_num == 0

        if is_first_round:
            openai_prompt = question
            gemini_prompt = question
        else:
            openai_prompt = (
                f"The other AI (Gemini) responded:\n\n"
                f'"{latest_gemini}"\n\n'
                f"Please critique this response, point out any flaws or "
                f"missing perspectives, and provide your improved answer "
                f"to the original question: {question}"
            )
            gemini_prompt = (
                f"The other AI (GPT-4o) responded:\n\n"
                f'"{latest_openai}"\n\n'
                f"Please critique this response, point out any flaws or "
                f"missing perspectives, and provide your improved answer "
                f"to the original question: {question}"
            )

        # Run both LLMs in parallel
        openai_task = asyncio.create_task(
            self.openai_llm.ainvoke([HumanMessage(content=openai_prompt)])
        )
        gemini_task = asyncio.create_task(
            self.gemini_llm.ainvoke([HumanMessage(content=gemini_prompt)])
        )

        openai_response, gemini_response = await asyncio.gather(
            openai_task, gemini_task
        )

        return openai_response.content, gemini_response.content

    async def run_debate(
        self, session_id: str, question: str
    ) -> AsyncGenerator[StreamEvent, None]:
        """Run the debate and yield events."""
        round_num = 0
        latest_openai = ""
        latest_gemini = ""
        max_rounds = 100

        try:
            while round_num < max_rounds:
                # Check for stop signal
                if self.is_stopped(session_id):
                    yield StreamEvent(
                        event_type="debate_end",
                        content="Debate stopped by user",
                        round_number=round_num,
                    )
                    break

                # Signal round start
                yield StreamEvent(
                    event_type="round_start",
                    content=f"Round {round_num + 1}",
                    round_number=round_num,
                )

                # Get responses from both LLMs
                openai_content, gemini_content = await self._get_responses(
                    question, round_num, latest_openai, latest_gemini
                )

                # Create and yield OpenAI message
                openai_msg = Message(
                    id=str(uuid.uuid4()),
                    provider=LLMProvider.OPENAI,
                    content=openai_content,
                    timestamp=datetime.now(UTC),
                    is_critique=round_num > 0,
                    round_number=round_num,
                )
                yield StreamEvent(
                    event_type="message",
                    provider=LLMProvider.OPENAI,
                    content=openai_content,
                    message_id=openai_msg.id,
                    round_number=round_num,
                )

                # Create and yield Gemini message
                gemini_msg = Message(
                    id=str(uuid.uuid4()),
                    provider=LLMProvider.GEMINI,
                    content=gemini_content,
                    timestamp=datetime.now(UTC),
                    is_critique=round_num > 0,
                    round_number=round_num,
                )
                yield StreamEvent(
                    event_type="message",
                    provider=LLMProvider.GEMINI,
                    content=gemini_content,
                    message_id=gemini_msg.id,
                    round_number=round_num,
                )

                # Signal round end
                yield StreamEvent(
                    event_type="round_end",
                    content=f"Round {round_num + 1} complete",
                    round_number=round_num,
                )

                # Update state for next round
                latest_openai = openai_content
                latest_gemini = gemini_content
                round_num += 1

                # Small delay between rounds
                await asyncio.sleep(1.0)

        except Exception as e:
            yield StreamEvent(
                event_type="error",
                content=str(e),
                round_number=round_num,
            )
        finally:
            self.clear_stop_signal(session_id)
