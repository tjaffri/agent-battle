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
    DebateRequest,
    DebateResponse,
    HealthResponse,
    StopResponse,
)

# Global state
debate_graph: DebateGraph | None = None
active_sessions: dict[str, str] = {}  # session_id -> question


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

    # Initialize debate graph
    debate_graph = DebateGraph(settings)

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


@app.post("/debate/start", response_model=DebateResponse)
async def start_debate(request: DebateRequest) -> DebateResponse:
    """Start a new debate session."""
    session_id = request.session_id or str(uuid.uuid4())

    # Store the session
    active_sessions[session_id] = request.question

    return DebateResponse(session_id=session_id, question=request.question)


@app.get("/debate/{session_id}/stream")
async def stream_debate(session_id: str) -> EventSourceResponse:
    """Stream debate responses via SSE."""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Debate session not found")

    if debate_graph is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    question = active_sessions[session_id]

    async def event_generator() -> AsyncGenerator[dict, None]:
        async for event in debate_graph.run_debate(session_id, question):
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
