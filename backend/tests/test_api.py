"""Tests for API endpoints."""


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_start_debate(client):
    """Test starting a new debate."""
    response = client.post(
        "/debate/start",
        json={"question": "What is artificial intelligence?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["question"] == "What is artificial intelligence?"


def test_start_debate_with_custom_session_id(client):
    """Test starting a debate with a custom session ID."""
    response = client.post(
        "/debate/start",
        json={"question": "What is AI?", "session_id": "custom-123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "custom-123"


def test_stop_nonexistent_debate(client):
    """Test stopping a debate that doesn't exist."""
    response = client.post("/debate/nonexistent-session/stop")
    assert response.status_code == 404


def test_stream_nonexistent_debate(client):
    """Test streaming a debate that doesn't exist."""
    response = client.get("/debate/nonexistent-session/stream")
    assert response.status_code == 404


def test_stop_existing_debate(client):
    """Test stopping an existing debate."""
    # First start a debate
    start_response = client.post(
        "/debate/start",
        json={"question": "What is AI?"},
    )
    session_id = start_response.json()["session_id"]

    # Then stop it
    stop_response = client.post(f"/debate/{session_id}/stop")
    assert stop_response.status_code == 200
    assert stop_response.json()["status"] == "stopped"
