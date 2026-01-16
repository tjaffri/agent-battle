"""Vercel serverless function for the Agent Battle API."""

import json
import os
import uuid
from collections.abc import AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel


# Models
class DebateRequest(BaseModel):
    question: str
    session_id: str | None = None


class DebateResponse(BaseModel):
    session_id: str
    question: str


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
    allow_origins=["*"],  # Vercel handles this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (note: serverless functions are stateless)
active_sessions: dict[str, str] = {}


def get_llms():
    """Lazily create LLM instances."""
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_openai import ChatOpenAI

    openai_api_key = os.environ.get("OPENAI_API_KEY")
    google_api_key = os.environ.get("GOOGLE_API_KEY")

    if not openai_api_key or not google_api_key:
        raise HTTPException(
            status_code=503,
            detail="API keys not configured. Set OPENAI_API_KEY and GOOGLE_API_KEY environment variables.",
        )

    openai_llm = ChatOpenAI(
        model="gpt-4o",
        api_key=openai_api_key,
        temperature=0.7,
        max_tokens=1024,
    )

    gemini_llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=google_api_key,
        temperature=0.7,
        max_output_tokens=1024,
    )

    return openai_llm, gemini_llm


@app.get("/api/health")
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(status="healthy")


@app.post("/api/debate/start")
async def start_debate(request: DebateRequest) -> DebateResponse:
    """Start a new debate session."""
    session_id = request.session_id or str(uuid.uuid4())
    active_sessions[session_id] = request.question
    return DebateResponse(session_id=session_id, question=request.question)


@app.get("/api/debate/{session_id}/stream")
async def stream_debate(session_id: str):
    """Stream debate responses via SSE."""
    import asyncio
    from datetime import UTC, datetime

    from langchain_core.messages import HumanMessage

    question = active_sessions.get(session_id)
    if not question:
        raise HTTPException(status_code=404, detail="Session not found")

    openai_llm, gemini_llm = get_llms()

    async def generate_events() -> AsyncGenerator[str, None]:
        round_num = 0
        latest_openai = ""
        latest_gemini = ""
        max_rounds = 100

        try:
            while round_num < max_rounds:
                # Round start event
                event = {
                    "event_type": "round_start",
                    "content": f"Round {round_num + 1}",
                    "round_number": round_num,
                }
                yield f"event: round_start\ndata: {json.dumps(event)}\n\n"

                # Prepare prompts
                if round_num == 0:
                    openai_prompt = question
                    gemini_prompt = question
                else:
                    openai_prompt = (
                        f'The other AI (Gemini) responded:\n\n"{latest_gemini}"\n\n'
                        f"Please critique this response and provide your improved answer to: {question}"
                    )
                    gemini_prompt = (
                        f'The other AI (GPT-4o) responded:\n\n"{latest_openai}"\n\n'
                        f"Please critique this response and provide your improved answer to: {question}"
                    )

                # Get responses in parallel
                openai_task = asyncio.create_task(
                    openai_llm.ainvoke([HumanMessage(content=openai_prompt)])
                )
                gemini_task = asyncio.create_task(
                    gemini_llm.ainvoke([HumanMessage(content=gemini_prompt)])
                )

                openai_response, gemini_response = await asyncio.gather(
                    openai_task, gemini_task
                )

                openai_content = openai_response.content
                gemini_content = gemini_response.content

                # Yield OpenAI message
                openai_event = {
                    "event_type": "message",
                    "provider": "openai",
                    "content": openai_content,
                    "message_id": str(uuid.uuid4()),
                    "round_number": round_num,
                    "is_critique": round_num > 0,
                    "timestamp": datetime.now(UTC).isoformat(),
                }
                yield f"event: message\ndata: {json.dumps(openai_event)}\n\n"

                # Yield Gemini message
                gemini_event = {
                    "event_type": "message",
                    "provider": "gemini",
                    "content": gemini_content,
                    "message_id": str(uuid.uuid4()),
                    "round_number": round_num,
                    "is_critique": round_num > 0,
                    "timestamp": datetime.now(UTC).isoformat(),
                }
                yield f"event: message\ndata: {json.dumps(gemini_event)}\n\n"

                # Round end event
                end_event = {
                    "event_type": "round_end",
                    "content": f"Round {round_num + 1} complete",
                    "round_number": round_num,
                }
                yield f"event: round_end\ndata: {json.dumps(end_event)}\n\n"

                # Update for next round
                latest_openai = openai_content
                latest_gemini = gemini_content
                round_num += 1

                # Delay between rounds
                await asyncio.sleep(1.0)

        except Exception as e:
            error_event = {
                "event_type": "error",
                "content": str(e),
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
