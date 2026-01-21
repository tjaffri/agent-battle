"""Pydantic models for the API."""

from datetime import UTC, datetime
from enum import Enum

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    """Get current UTC time with timezone info."""
    return datetime.now(UTC)


class LLMProvider(str, Enum):
    """Supported LLM providers."""

    OPENAI = "openai"
    GEMINI = "gemini"
    ANTHROPIC = "anthropic"


# Available models configuration - Updated January 2025
AVAILABLE_MODELS: dict[str, list[dict]] = {
    "openai": [
        {
            "id": "o3",
            "name": "o3",
            "description": "Most intelligent reasoning model",
        },
        {
            "id": "o4-mini",
            "name": "o4-mini",
            "description": "Fast, cost-efficient reasoning",
        },
        {
            "id": "gpt-4.1",
            "name": "GPT-4.1",
            "description": "Smartest non-reasoning model",
        },
        {
            "id": "gpt-4.1-mini",
            "name": "GPT-4.1 Mini",
            "description": "Fast and affordable",
        },
        {
            "id": "gpt-4o",
            "name": "GPT-4o",
            "description": "Great all-rounder",
        },
    ],
    "gemini": [
        {
            "id": "gemini-2.5-pro",
            "name": "Gemini 2.5 Pro",
            "description": "Advanced reasoning model",
        },
        {
            "id": "gemini-2.5-flash",
            "name": "Gemini 2.5 Flash",
            "description": "Fast and efficient",
        },
        {
            "id": "gemini-2.0-flash",
            "name": "Gemini 2.0 Flash",
            "description": "Multimodal workhorse",
        },
    ],
    "anthropic": [
        {
            "id": "claude-opus-4-5-20251124",
            "name": "Claude Opus 4.5",
            "description": "Most intelligent, best for coding",
        },
        {
            "id": "claude-sonnet-4-5-20250929",
            "name": "Claude Sonnet 4.5",
            "description": "Best coding model",
        },
        {
            "id": "claude-haiku-4-5-20251015",
            "name": "Claude Haiku 4.5",
            "description": "Fast and cost-efficient",
        },
    ],
}


class ModelInfo(BaseModel):
    """Information about an available model."""

    id: str
    name: str
    description: str
    provider: LLMProvider


class AvailableModelsResponse(BaseModel):
    """Response containing available models grouped by provider."""

    models: dict[str, list[ModelInfo]]
    available_providers: list[str]


class SelectedModel(BaseModel):
    """A model selected for the debate."""

    provider: LLMProvider
    model_id: str


class Message(BaseModel):
    """A single message in the debate."""

    id: str
    provider: LLMProvider
    content: str
    timestamp: datetime = Field(default_factory=utc_now)
    is_critique: bool = False
    round_number: int = 0


class DebateRequest(BaseModel):
    """Request to start a new debate."""

    question: str
    session_id: str | None = None
    max_rounds: int = Field(
        default=2, ge=1, le=20, description="Maximum number of debate rounds"
    )
    models: list[SelectedModel] | None = Field(
        default=None,
        description="Models to use in the debate. If not provided, defaults to GPT-4o and Gemini 2.0",
    )


class DebateResponse(BaseModel):
    """Response when starting a debate."""

    session_id: str
    question: str
    max_rounds: int
    models: list[SelectedModel]


class StopResponse(BaseModel):
    """Response when stopping a debate."""

    session_id: str
    status: str = "stopped"


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "healthy"


class StreamEvent(BaseModel):
    """Event sent via SSE stream."""

    event_type: str  # "round_start", "message", "round_end", "debate_end", "error"
    provider: LLMProvider | None = None
    content: str = ""
    message_id: str | None = None
    round_number: int = 0
    max_rounds: int | None = None
    model_id: str | None = None  # The specific model used for this message
