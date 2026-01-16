"""Tests for Pydantic models."""

from datetime import datetime

from app.models import (
    DebateRequest,
    DebateResponse,
    LLMProvider,
    Message,
    StreamEvent,
)


def test_llm_provider_enum():
    """Test LLMProvider enum values."""
    assert LLMProvider.OPENAI == "openai"
    assert LLMProvider.GEMINI == "gemini"


def test_message_creation():
    """Test Message model creation."""
    msg = Message(
        id="test-123",
        provider=LLMProvider.OPENAI,
        content="Hello world",
        is_critique=False,
        round_number=0,
    )
    assert msg.id == "test-123"
    assert msg.provider == LLMProvider.OPENAI
    assert msg.content == "Hello world"
    assert msg.is_critique is False
    assert msg.round_number == 0
    assert isinstance(msg.timestamp, datetime)


def test_message_critique():
    """Test Message model with critique flag."""
    msg = Message(
        id="test-456",
        provider=LLMProvider.GEMINI,
        content="I disagree because...",
        is_critique=True,
        round_number=1,
    )
    assert msg.is_critique is True
    assert msg.round_number == 1


def test_debate_request():
    """Test DebateRequest model."""
    request = DebateRequest(question="What is AI?")
    assert request.question == "What is AI?"
    assert request.session_id is None


def test_debate_request_with_session():
    """Test DebateRequest with custom session ID."""
    request = DebateRequest(question="What is AI?", session_id="custom-session")
    assert request.session_id == "custom-session"


def test_debate_response():
    """Test DebateResponse model."""
    response = DebateResponse(session_id="sess-123", question="What is AI?")
    assert response.session_id == "sess-123"
    assert response.question == "What is AI?"


def test_stream_event():
    """Test StreamEvent model."""
    event = StreamEvent(
        event_type="message",
        provider=LLMProvider.OPENAI,
        content="AI is...",
        message_id="msg-123",
        round_number=0,
    )
    assert event.event_type == "message"
    assert event.provider == LLMProvider.OPENAI
    assert event.content == "AI is..."
    assert event.message_id == "msg-123"
    assert event.round_number == 0


def test_stream_event_minimal():
    """Test StreamEvent with minimal fields."""
    event = StreamEvent(event_type="round_start")
    assert event.event_type == "round_start"
    assert event.provider is None
    assert event.content == ""
