"""LangGraph debate flow implementation."""

import asyncio
import uuid
from collections.abc import AsyncGenerator

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

from .config import Settings
from .models import AVAILABLE_MODELS, LLMProvider, SelectedModel, StreamEvent


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

    def _build_prompt(
        self,
        question: str,
        round_num: int,
        model_index: int,
        latest_responses: dict[str, str],
        llms: list[tuple[SelectedModel, BaseChatModel]],
    ) -> str:
        """Build the prompt for a model based on the round."""
        if round_num == 0:
            return question

        # Get the other model's response to critique
        other_index = (model_index + 1) % len(llms)
        other_model = llms[other_index][0]
        other_name = get_model_display_name(other_model.provider, other_model.model_id)
        other_response = latest_responses.get(
            f"{other_model.provider.value}_{other_model.model_id}", ""
        )

        return (
            f"The other AI ({other_name}) responded:\n\n"
            f'"{other_response}"\n\n'
            f"Please critique this response, point out any flaws or "
            f"missing perspectives, and provide your improved answer "
            f"to the original question: {question}"
        )

    async def _stream_response(
        self,
        llm: BaseChatModel,
        prompt: str,
        selected_model: SelectedModel,
        round_num: int,
        max_rounds: int,
    ) -> AsyncGenerator[StreamEvent, None]:
        """Stream a single model's response, yielding events for each chunk."""
        message_id = str(uuid.uuid4())

        # Signal stream start
        yield StreamEvent(
            event_type="stream_start",
            provider=selected_model.provider,
            content="",
            message_id=message_id,
            round_number=round_num,
            max_rounds=max_rounds,
            model_id=selected_model.model_id,
        )

        full_content = ""
        try:
            async for chunk in llm.astream([HumanMessage(content=prompt)]):
                chunk_content = (
                    chunk.content if hasattr(chunk, "content") else str(chunk)
                )
                if chunk_content:
                    full_content += chunk_content
                    yield StreamEvent(
                        event_type="stream_chunk",
                        provider=selected_model.provider,
                        content=chunk_content,
                        message_id=message_id,
                        round_number=round_num,
                        max_rounds=max_rounds,
                        model_id=selected_model.model_id,
                    )
        except Exception as e:
            full_content = f"[Error: {str(e)}]"
            yield StreamEvent(
                event_type="stream_chunk",
                provider=selected_model.provider,
                content=full_content,
                message_id=message_id,
                round_number=round_num,
                max_rounds=max_rounds,
                model_id=selected_model.model_id,
            )

        # Signal stream end with full content
        yield StreamEvent(
            event_type="stream_end",
            provider=selected_model.provider,
            content=full_content,
            message_id=message_id,
            round_number=round_num,
            max_rounds=max_rounds,
            model_id=selected_model.model_id,
        )

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

                # Stream responses from each model sequentially
                for i, (selected_model, llm) in enumerate(llms):
                    # Check for stop signal between models
                    if self.is_stopped(session_id):
                        break

                    # Build the prompt for this model
                    prompt = self._build_prompt(
                        question, round_num, i, latest_responses, llms
                    )

                    # Stream the response
                    full_content = ""
                    async for event in self._stream_response(
                        llm, prompt, selected_model, round_num, max_rounds
                    ):
                        yield event
                        # Capture the full content from stream_end
                        if event.event_type == "stream_end":
                            full_content = event.content

                    # Store the response for the next round's critique
                    model_key = (
                        f"{selected_model.provider.value}_{selected_model.model_id}"
                    )
                    latest_responses[model_key] = full_content

                # Check if stopped mid-round
                if self.is_stopped(session_id):
                    yield StreamEvent(
                        event_type="debate_end",
                        content="Debate stopped by user",
                        round_number=round_num,
                        max_rounds=max_rounds,
                    )
                    break

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
                await asyncio.sleep(0.5)

        except Exception as e:
            yield StreamEvent(
                event_type="error",
                content=str(e),
                round_number=round_num,
            )
        finally:
            self.clear_stop_signal(session_id)
