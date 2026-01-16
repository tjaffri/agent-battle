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


class DebateResponse(BaseModel):
    """Response when starting a debate."""

    session_id: str
    question: str


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
