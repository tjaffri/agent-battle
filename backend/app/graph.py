"""LangGraph debate flow implementation."""

import asyncio
import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

from .config import Settings
from .models import AVAILABLE_MODELS, LLMProvider, Message, SelectedModel, StreamEvent


def get_model_display_name(provider: LLMProvider, model_id: str) -> str:
    """Get the display name for a model."""
    provider_key = provider.value
    if provider_key in AVAILABLE_MODELS:
        for model in AVAILABLE_MODELS[provider_key]:
            if model["id"] == model_id:
                return model["name"]
    return model_id


def create_llm(settings: Settings, selected_model: SelectedModel) -> BaseChatModel:
    """Create a single LLM instance based on provider and model selection."""
    provider = selected_model.provider
    model_id = selected_model.model_id

    if provider == LLMProvider.OPENAI:
        if not settings.openai_api_key:
            raise ValueError("OpenAI API key not configured")
        return ChatOpenAI(
            model=model_id,
            api_key=settings.openai_api_key,
            temperature=0.7,
            max_tokens=8192,
        )
    elif provider == LLMProvider.GEMINI:
        if not settings.google_api_key:
            raise ValueError("Google API key not configured")
        return ChatGoogleGenerativeAI(
            model=model_id,
            google_api_key=settings.google_api_key,
            temperature=0.7,
            max_output_tokens=8192,
        )
    elif provider == LLMProvider.ANTHROPIC:
        if not settings.anthropic_api_key:
            raise ValueError("Anthropic API key not configured")
        # Import here to avoid dependency if not used
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(
            model=model_id,
            api_key=settings.anthropic_api_key,
            temperature=0.7,
            max_tokens=8192,
        )
    else:
        raise ValueError(f"Unsupported provider: {provider}")


class DebateGraph:
    """Manages the debate flow between two LLMs."""

    def __init__(self, settings: Settings):
        self.settings = settings
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
        self,
        question: str,
        round_num: int,
        latest_responses: dict[str, str],
        llms: list[tuple[SelectedModel, BaseChatModel]],
    ) -> list[tuple[SelectedModel, str]]:
        """Get responses from all LLMs in parallel."""
        is_first_round = round_num == 0
        tasks = []

        for i, (selected_model, llm) in enumerate(llms):
            if is_first_round:
                prompt = question
            else:
                # Get the other model's response to critique
                other_index = (i + 1) % len(llms)
                other_model = llms[other_index][0]
                other_name = get_model_display_name(
                    other_model.provider, other_model.model_id
                )
                other_response = latest_responses.get(
                    f"{other_model.provider.value}_{other_model.model_id}", ""
                )

                prompt = (
                    f"The other AI ({other_name}) responded:\n\n"
                    f'"{other_response}"\n\n'
                    f"Please critique this response, point out any flaws or "
                    f"missing perspectives, and provide your improved answer "
                    f"to the original question: {question}"
                )

            tasks.append(
                asyncio.create_task(llm.ainvoke([HumanMessage(content=prompt)]))
            )

        responses = await asyncio.gather(*tasks, return_exceptions=True)

        results = []
        for i, (selected_model, _) in enumerate(llms):
            response = responses[i]
            if isinstance(response, Exception):
                content = f"[Error: {str(response)}]"
            else:
                content = response.content
            results.append((selected_model, content))

        return results

    async def run_debate(
        self,
        session_id: str,
        question: str,
        max_rounds: int = 5,
        models: list[SelectedModel] | None = None,
    ) -> AsyncGenerator[StreamEvent, None]:
        """Run the debate and yield events."""
        # Default models if not specified
        if models is None or len(models) < 2:
            models = [
                SelectedModel(provider=LLMProvider.OPENAI, model_id="gpt-4.1"),
                SelectedModel(provider=LLMProvider.GEMINI, model_id="gemini-2.5-flash"),
            ]

        # Create LLM instances
        llms: list[tuple[SelectedModel, BaseChatModel]] = []
        for selected_model in models:
            try:
                llm = create_llm(self.settings, selected_model)
                llms.append((selected_model, llm))
            except Exception as e:
                yield StreamEvent(
                    event_type="error",
                    content=f"Failed to initialize {selected_model.provider.value}: {e}",
                    round_number=0,
                )
                return

        round_num = 0
        latest_responses: dict[str, str] = {}

        try:
            while round_num < max_rounds:
                # Check for stop signal
                if self.is_stopped(session_id):
                    yield StreamEvent(
                        event_type="debate_end",
                        content="Debate stopped by user",
                        round_number=round_num,
                        max_rounds=max_rounds,
                    )
                    break

                # Signal round start
                yield StreamEvent(
                    event_type="round_start",
                    content=f"Round {round_num + 1}",
                    round_number=round_num,
                    max_rounds=max_rounds,
                )

                # Get responses from all LLMs
                responses = await self._get_responses(
                    question, round_num, latest_responses, llms
                )

                # Yield messages for each model
                for selected_model, content in responses:
                    model_key = (
                        f"{selected_model.provider.value}_{selected_model.model_id}"
                    )
                    latest_responses[model_key] = content

                    msg = Message(
                        id=str(uuid.uuid4()),
                        provider=selected_model.provider,
                        content=content,
                        timestamp=datetime.now(UTC),
                        is_critique=round_num > 0,
                        round_number=round_num,
                    )
                    yield StreamEvent(
                        event_type="message",
                        provider=selected_model.provider,
                        content=content,
                        message_id=msg.id,
                        round_number=round_num,
                        max_rounds=max_rounds,
                        model_id=selected_model.model_id,
                    )

                # Signal round end
                yield StreamEvent(
                    event_type="round_end",
                    content=f"Round {round_num + 1} complete",
                    round_number=round_num,
                    max_rounds=max_rounds,
                )

                round_num += 1

                # Check if this was the last round
                if round_num >= max_rounds:
                    yield StreamEvent(
                        event_type="debate_end",
                        content="Debate completed",
                        round_number=round_num - 1,
                        max_rounds=max_rounds,
                    )
                    break

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
