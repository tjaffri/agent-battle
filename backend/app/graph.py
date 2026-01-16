"""LangGraph debate flow implementation."""

import asyncio
import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Annotated, Any, TypedDict

from langchain_core.messages import AIMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages

from .config import Settings
from .models import LLMProvider, Message, StreamEvent


class DebateState(TypedDict):
    """State for the debate graph."""

    session_id: str
    question: str
    openai_messages: Annotated[list, add_messages]
    gemini_messages: Annotated[list, add_messages]
    debate_history: list[Message]
    round_number: int
    should_continue: bool
    latest_openai_response: str
    latest_gemini_response: str


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
        self.graph = self._build_graph()
        self._stop_signals: dict[str, bool] = {}

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow."""

        async def respond_parallel(state: DebateState) -> dict[str, Any]:
            """Both LLMs respond in parallel."""
            round_num = state["round_number"]
            is_first_round = round_num == 0

            # Prepare prompts based on round
            if is_first_round:
                openai_prompt = state["question"]
                gemini_prompt = state["question"]
            else:
                # Critique prompts
                openai_prompt = (
                    f"The other AI (Gemini) responded:\n\n"
                    f'"{state["latest_gemini_response"]}"\n\n'
                    f"Please critique this response, point out any flaws or "
                    f"missing perspectives, and provide your improved answer "
                    f"to the original question: {state['question']}"
                )
                gemini_prompt = (
                    f"The other AI (GPT-4o) responded:\n\n"
                    f'"{state["latest_openai_response"]}"\n\n'
                    f"Please critique this response, point out any flaws or "
                    f"missing perspectives, and provide your improved answer "
                    f"to the original question: {state['question']}"
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

            # Create message records
            openai_msg = Message(
                id=str(uuid.uuid4()),
                provider=LLMProvider.OPENAI,
                content=openai_response.content,
                timestamp=datetime.now(UTC),
                is_critique=not is_first_round,
                round_number=round_num,
            )

            gemini_msg = Message(
                id=str(uuid.uuid4()),
                provider=LLMProvider.GEMINI,
                content=gemini_response.content,
                timestamp=datetime.now(UTC),
                is_critique=not is_first_round,
                round_number=round_num,
            )

            return {
                "openai_messages": [AIMessage(content=openai_response.content)],
                "gemini_messages": [AIMessage(content=gemini_response.content)],
                "debate_history": [openai_msg, gemini_msg],
                "latest_openai_response": openai_response.content,
                "latest_gemini_response": gemini_response.content,
                "round_number": round_num + 1,
            }

        def check_continue(state: DebateState) -> str:
            """Check if debate should continue."""
            if not state.get("should_continue", True):
                return END
            # Continue to next round
            return "respond"

        # Build graph
        workflow = StateGraph(DebateState)
        workflow.add_node("respond", respond_parallel)
        workflow.set_entry_point("respond")
        workflow.add_conditional_edges("respond", check_continue)

        return workflow.compile()

    def stop_debate(self, session_id: str) -> None:
        """Signal a debate to stop."""
        self._stop_signals[session_id] = True

    def is_stopped(self, session_id: str) -> bool:
        """Check if debate is stopped."""
        return self._stop_signals.get(session_id, False)

    def clear_stop_signal(self, session_id: str) -> None:
        """Clear stop signal for a session."""
        self._stop_signals.pop(session_id, None)

    async def run_debate(
        self, session_id: str, question: str
    ) -> AsyncGenerator[StreamEvent, None]:
        """Run the debate and yield events."""
        initial_state: DebateState = {
            "session_id": session_id,
            "question": question,
            "openai_messages": [],
            "gemini_messages": [],
            "debate_history": [],
            "round_number": 0,
            "should_continue": True,
            "latest_openai_response": "",
            "latest_gemini_response": "",
        }

        current_state = initial_state
        max_rounds = 100  # Safety limit

        try:
            while current_state["round_number"] < max_rounds:
                # Check for stop signal
                if self.is_stopped(session_id):
                    yield StreamEvent(
                        event_type="debate_end",
                        content="Debate stopped by user",
                        round_number=current_state["round_number"],
                    )
                    break

                round_num = current_state["round_number"]

                # Signal round start
                yield StreamEvent(
                    event_type="round_start",
                    content=f"Round {round_num + 1}",
                    round_number=round_num,
                )

                # Run one step of the graph
                result = await self.graph.ainvoke(current_state)

                # Extract new messages from this round
                new_messages = result.get("debate_history", [])

                # Yield messages
                for msg in new_messages:
                    if isinstance(msg, Message):
                        yield StreamEvent(
                            event_type="message",
                            provider=msg.provider,
                            content=msg.content,
                            message_id=msg.id,
                            round_number=msg.round_number,
                        )

                # Signal round end
                yield StreamEvent(
                    event_type="round_end",
                    content=f"Round {round_num + 1} complete",
                    round_number=round_num,
                )

                # Update state for next iteration
                current_state = {
                    **current_state,
                    "openai_messages": result["openai_messages"],
                    "gemini_messages": result["gemini_messages"],
                    "debate_history": result["debate_history"],
                    "round_number": result["round_number"],
                    "latest_openai_response": result["latest_openai_response"],
                    "latest_gemini_response": result["latest_gemini_response"],
                }

                # Small delay between rounds
                await asyncio.sleep(0.5)

        except Exception as e:
            yield StreamEvent(
                event_type="error",
                content=str(e),
                round_number=current_state.get("round_number", 0),
            )
        finally:
            self.clear_stop_signal(session_id)
