"""Vercel serverless function for the Agent Battle API."""

import json
import os
import traceback
import uuid
from collections.abc import AsyncGenerator
from enum import Enum

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field


# Configure LangSmith tracing
def setup_langsmith():
    """Configure LangSmith tracing from environment variables."""
    langsmith_api_key = os.environ.get("LANGSMITH_API_KEY")
    if langsmith_api_key:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_API_KEY"] = langsmith_api_key
        os.environ["LANGCHAIN_PROJECT"] = os.environ.get("LANGSMITH_PROJECT", "agent-battle")


setup_langsmith()


# Enums and constants
class LLMProvider(str, Enum):
    OPENAI = "openai"
    GEMINI = "gemini"
    ANTHROPIC = "anthropic"


# Available models configuration - Updated January 2025
AVAILABLE_MODELS: dict[str, list[dict]] = {
    "openai": [
        {"id": "o3", "name": "o3", "description": "Most intelligent reasoning model"},
        {"id": "o4-mini", "name": "o4-mini", "description": "Fast, cost-efficient reasoning"},
        {"id": "gpt-4.1", "name": "GPT-4.1", "description": "Smartest non-reasoning model"},
        {"id": "gpt-4.1-mini", "name": "GPT-4.1 Mini", "description": "Fast and affordable"},
        {"id": "gpt-4o", "name": "GPT-4o", "description": "Great all-rounder"},
    ],
    "gemini": [
        {"id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro", "description": "Advanced reasoning model"},
        {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash", "description": "Fast and efficient"},
        {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash", "description": "Multimodal workhorse"},
    ],
    "anthropic": [
        {"id": "claude-opus-4-5-20251124", "name": "Claude Opus 4.5", "description": "Most intelligent, best for coding"},
        {"id": "claude-sonnet-4-5-20250929", "name": "Claude Sonnet 4.5", "description": "Best coding model"},
        {"id": "claude-haiku-4-5-20251015", "name": "Claude Haiku 4.5", "description": "Fast and cost-efficient"},
    ],
}


def get_model_display_name(provider: str, model_id: str) -> str:
    """Get the display name for a model."""
    if provider in AVAILABLE_MODELS:
        for model in AVAILABLE_MODELS[provider]:
            if model["id"] == model_id:
                return model["name"]
    return model_id


# Models
class SelectedModel(BaseModel):
    provider: LLMProvider
    model_id: str


class DebateRequest(BaseModel):
    question: str
    session_id: str | None = None
    max_rounds: int = Field(default=2, ge=1, le=20)
    models: list[SelectedModel] | None = None


class DebateResponse(BaseModel):
    session_id: str
    question: str
    max_rounds: int
    models: list[SelectedModel]


class ModelInfo(BaseModel):
    id: str
    name: str
    description: str
    provider: LLMProvider


class AvailableModelsResponse(BaseModel):
    models: dict[str, list[ModelInfo]]
    available_providers: list[str]


class HealthResponse(BaseModel):
    status: str


class StopResponse(BaseModel):
    session_id: str
    status: str


# Initialize FastAPI app
app = FastAPI(
    title="Agent Battle API",
    description="Multi-LLM debate backend",
    version="1.0.0",
)

# Configure CORS for Vercel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (note: serverless functions are stateless)
active_sessions: dict[str, dict] = {}


def create_llm(selected_model: SelectedModel):
    """Create a single LLM instance."""
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_openai import ChatOpenAI

    provider = selected_model.provider
    model_id = selected_model.model_id

    if provider == LLMProvider.OPENAI:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not configured")
        return ChatOpenAI(
            model=model_id,
            api_key=api_key,
            temperature=0.7,
            max_tokens=8192,
        )
    elif provider == LLMProvider.GEMINI:
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not configured")
        return ChatGoogleGenerativeAI(
            model=model_id,
            google_api_key=api_key,
            temperature=0.7,
            max_output_tokens=8192,
        )
    elif provider == LLMProvider.ANTHROPIC:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not configured")
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=model_id,
            api_key=api_key,
            temperature=0.7,
            max_tokens=8192,
        )
    else:
        raise ValueError(f"Unsupported provider: {provider}")


def get_llms():
    """Lazily create default LLM instances (for backwards compatibility)."""
    default_models = [
        SelectedModel(provider=LLMProvider.OPENAI, model_id="gpt-4.1"),
        SelectedModel(provider=LLMProvider.GEMINI, model_id="gemini-2.5-flash"),
    ]
    return [create_llm(m) for m in default_models]


@app.get("/api/health")
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(status="healthy")


@app.get("/api/models")
async def get_available_models() -> AvailableModelsResponse:
    """Get available models based on configured API keys."""
    available_providers = []
    models: dict[str, list[ModelInfo]] = {}

    if os.environ.get("OPENAI_API_KEY"):
        available_providers.append("openai")
        models["openai"] = [
            ModelInfo(provider=LLMProvider.OPENAI, **m)
            for m in AVAILABLE_MODELS["openai"]
        ]

    if os.environ.get("GOOGLE_API_KEY"):
        available_providers.append("gemini")
        models["gemini"] = [
            ModelInfo(provider=LLMProvider.GEMINI, **m)
            for m in AVAILABLE_MODELS["gemini"]
        ]

    if os.environ.get("ANTHROPIC_API_KEY"):
        available_providers.append("anthropic")
        models["anthropic"] = [
            ModelInfo(provider=LLMProvider.ANTHROPIC, **m)
            for m in AVAILABLE_MODELS["anthropic"]
        ]

    return AvailableModelsResponse(models=models, available_providers=available_providers)


@app.get("/api/test-llm")
async def test_llm():
    """Test LLM connectivity."""
    from langchain_core.messages import HumanMessage

    try:
        openai_llm, gemini_llm = get_llms()

        # Test OpenAI
        openai_response = await openai_llm.ainvoke([HumanMessage(content="Say 'OpenAI works!' in 3 words.")])

        # Test Gemini
        gemini_response = await gemini_llm.ainvoke([HumanMessage(content="Say 'Gemini works!' in 3 words.")])

        return {
            "status": "success",
            "openai": openai_response.content,
            "gemini": gemini_response.content,
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc(),
        }


@app.post("/api/debate/start")
async def start_debate(request: DebateRequest) -> DebateResponse:
    """Start a new debate session."""
    session_id = request.session_id or str(uuid.uuid4())

    # Default models if not specified
    if request.models is None or len(request.models) < 2:
        models = [
            SelectedModel(provider=LLMProvider.OPENAI, model_id="gpt-4.1"),
            SelectedModel(provider=LLMProvider.GEMINI, model_id="gemini-2.5-flash"),
        ]
    else:
        models = request.models

    active_sessions[session_id] = {
        "question": request.question,
        "max_rounds": request.max_rounds,
        "models": models,
    }

    return DebateResponse(
        session_id=session_id,
        question=request.question,
        max_rounds=request.max_rounds,
        models=models,
    )


@app.get("/api/debate/{session_id}/stream")
async def stream_debate(session_id: str):
    """Stream debate responses via SSE."""
    import asyncio
    from datetime import UTC, datetime

    from langchain_core.messages import HumanMessage

    session_config = active_sessions.get(session_id)
    if not session_config:
        raise HTTPException(status_code=404, detail="Session not found")

    question = session_config["question"]
    max_rounds = session_config["max_rounds"]
    models: list[SelectedModel] = session_config["models"]

    # Create LLM instances
    try:
        llms = [(m, create_llm(m)) for m in models]
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

    async def generate_events() -> AsyncGenerator[str, None]:
        round_num = 0
        latest_responses: dict[str, str] = {}

        try:
            while round_num < max_rounds:
                # Round start event
                event = {
                    "event_type": "round_start",
                    "content": f"Round {round_num + 1}",
                    "round_number": round_num,
                    "max_rounds": max_rounds,
                }
                yield f"event: round_start\ndata: {json.dumps(event)}\n\n"

                # Get responses from each model
                for i, (selected_model, llm) in enumerate(llms):
                    model_key = f"{selected_model.provider.value}_{selected_model.model_id}"
                    model_name = get_model_display_name(
                        selected_model.provider.value, selected_model.model_id
                    )

                    # Prepare prompt
                    if round_num == 0:
                        prompt = question
                    else:
                        # Get the other model's response to critique
                        other_index = (i + 1) % len(llms)
                        other_model = llms[other_index][0]
                        other_name = get_model_display_name(
                            other_model.provider.value, other_model.model_id
                        )
                        other_key = f"{other_model.provider.value}_{other_model.model_id}"
                        other_response = latest_responses.get(other_key, "")

                        prompt = (
                            f'The other AI ({other_name}) responded:\n\n"{other_response}"\n\n'
                            f"Please critique this response and provide your improved answer to: {question}"
                        )

                    # Get response
                    try:
                        response = await llm.ainvoke([HumanMessage(content=prompt)])
                        content = response.content
                    except Exception as e:
                        content = f"[{model_name} Error: {str(e)}]"

                    latest_responses[model_key] = content

                    # Yield message event
                    msg_event = {
                        "event_type": "message",
                        "provider": selected_model.provider.value,
                        "content": content,
                        "message_id": str(uuid.uuid4()),
                        "round_number": round_num,
                        "max_rounds": max_rounds,
                        "model_id": selected_model.model_id,
                        "is_critique": round_num > 0,
                        "timestamp": datetime.now(UTC).isoformat(),
                    }
                    yield f"event: message\ndata: {json.dumps(msg_event)}\n\n"

                # Round end event
                end_event = {
                    "event_type": "round_end",
                    "content": f"Round {round_num + 1} complete",
                    "round_number": round_num,
                    "max_rounds": max_rounds,
                }
                yield f"event: round_end\ndata: {json.dumps(end_event)}\n\n"

                round_num += 1

                # Check if debate is complete
                if round_num >= max_rounds:
                    complete_event = {
                        "event_type": "debate_end",
                        "content": "Debate completed",
                        "round_number": round_num - 1,
                        "max_rounds": max_rounds,
                    }
                    yield f"event: debate_end\ndata: {json.dumps(complete_event)}\n\n"
                    break

                # Delay between rounds
                await asyncio.sleep(1.0)

        except Exception as e:
            error_event = {
                "event_type": "error",
                "content": f"{type(e).__name__}: {str(e)}",
                "round_number": round_num,
            }
            yield f"event: error\ndata: {json.dumps(error_event)}\n\n"

    return StreamingResponse(
        generate_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/debate/{session_id}/stop")
async def stop_debate(session_id: str) -> StopResponse:
    """Stop an active debate."""
    active_sessions.pop(session_id, None)
    return StopResponse(session_id=session_id, status="stopped")
