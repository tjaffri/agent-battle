"""Pytest configuration and fixtures."""

from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture
def mock_settings():
    """Mock settings for testing."""
    mock = MagicMock()
    mock.openai_api_key = "test-openai-key"
    mock.google_api_key = "test-google-key"
    mock.langsmith_api_key = "test-langsmith-key"
    mock.langsmith_project = "test-project"
    mock.langsmith_tracing = False
    mock.cors_origins = ["http://localhost:5173"]
    mock.backend_host = "0.0.0.0"
    mock.backend_port = 8000
    return mock


@pytest.fixture
def mock_get_settings(mock_settings):
    """Patch get_settings to return mock settings."""
    with patch("app.config.get_settings", return_value=mock_settings):
        yield mock_settings


@pytest.fixture
def client(mock_get_settings):
    """Create test client with mocked settings."""
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as client:
        yield client
