"""FastAPI application for the Agent Battle backend."""

import json
import os
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from .config import get_settings
from .graph import DebateGraph
from .models import (
    AVAILABLE_MODELS,
    AvailableModelsResponse,
    DebateRequest,
    DebateResponse,
    HealthResponse,
    LLMProvider,
    ModelInfo,
    SelectedModel,
    StopResponse,
)

# Global state
debate_graph: DebateGraph | None = None
# session_id -> {question, max_rounds, models}
active_sessions: dict[str, dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    global debate_graph

    settings = get_settings()

    # Configure LangSmith tracing
    if settings.langsmith_tracing and settings.langsmith_api_key:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_API_KEY"] = settings.langsmith_api_key
        os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project

    # Initialize debate graph (lazy - will fail on first use if no API keys)
    try:
        if settings.openai_api_key and settings.google_api_key:
            debate_graph = DebateGraph(settings)
        else:
            print(
                "Warning: API keys not configured. Set OPENAI_API_KEY and GOOGLE_API_KEY."
            )
    except Exception as e:
        print(f"Warning: Failed to initialize debate graph: {e}")

    yield

    # Cleanup
    debate_graph = None


app = FastAPI(
    title="Agent Battle API",
    description="Multi-LLM debate backend with LangGraph",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(status="healthy")


@app.get("/models", response_model=AvailableModelsResponse)
async def get_available_models() -> AvailableModelsResponse:
    """Get available models based on configured API keys."""
    settings = get_settings()

    available_providers = []
    models: dict[str, list[ModelInfo]] = {}

    # Check which providers have API keys configured
    if settings.openai_api_key:
        available_providers.append("openai")
        models["openai"] = [
            ModelInfo(provider=LLMProvider.OPENAI, **m)
            for m in AVAILABLE_MODELS["openai"]
        ]

    if settings.google_api_key:
        available_providers.append("gemini")
        models["gemini"] = [
            ModelInfo(provider=LLMProvider.GEMINI, **m)
            for m in AVAILABLE_MODELS["gemini"]
        ]

    if settings.anthropic_api_key:
        available_providers.append("anthropic")
        models["anthropic"] = [
            ModelInfo(provider=LLMProvider.ANTHROPIC, **m)
            for m in AVAILABLE_MODELS["anthropic"]
        ]

    return AvailableModelsResponse(
        models=models, available_providers=available_providers
    )


@app.post("/debate/start", response_model=DebateResponse)
async def start_debate(request: DebateRequest) -> DebateResponse:
    """Start a new debate session."""
    session_id = request.session_id or str(uuid.uuid4())

    # Default models if not specified
    if request.models is None or len(request.models) < 2:
        default_models = [
            SelectedModel(provider=LLMProvider.OPENAI, model_id="gpt-4.1"),
            SelectedModel(provider=LLMProvider.GEMINI, model_id="gemini-2.5-flash"),
        ]
        models = default_models
    else:
        models = request.models

    # Store the session config
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


@app.get("/debate/{session_id}/stream")
async def stream_debate(session_id: str) -> EventSourceResponse:
    """Stream debate responses via SSE."""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Debate session not found")

    if debate_graph is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    session_config = active_sessions[session_id]
    question = session_config["question"]
    max_rounds = session_config["max_rounds"]
    models = session_config["models"]

    async def event_generator() -> AsyncGenerator[dict, None]:
        async for event in debate_graph.run_debate(
            session_id, question, max_rounds=max_rounds, models=models
        ):
            yield {
                "event": event.event_type,
                "data": json.dumps(event.model_dump()),
            }

    return EventSourceResponse(event_generator())


@app.post("/debate/{session_id}/stop", response_model=StopResponse)
async def stop_debate(session_id: str) -> StopResponse:
    """Stop an active debate."""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Debate session not found")

    if debate_graph is not None:
        debate_graph.stop_debate(session_id)

    # Remove from active sessions
    active_sessions.pop(session_id, None)

    return StopResponse(session_id=session_id, status="stopped")


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=True,
    )
