import pytest
from unittest.mock import patch, MagicMock
from app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


@patch("app.routes.tutor.get_tutor_response")
@patch("app.routes.tutor.save_chat_message")
def test_tutor_ask_success(mock_save, mock_tutor, client):
    """Test asking tutor a question successfully."""
    mock_tutor.return_value = {
        "success": True,
        "response": "To declare a variable in Python, write variable_name = value."
    }

    payload = {
        "prompt": "How to declare variables in Python?",
        "mode": "tutor",
        "subject": "Python",
        "isVoiceInput": False,
        "userEmail": "test@example.com"
    }

    response = client.post("/api/tutor/ask", json=payload)
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert "To declare a variable" in data["response"]
    mock_save.assert_called_once()
    mock_tutor.assert_called_once_with(
        "How to declare variables in Python?", "Python", conversation_history=[]
    )


def test_tutor_ask_missing_params(client):
    """Test asking tutor fails with missing parameters."""
    payload = {"prompt": "Hello"} # Missing email
    response = client.post("/api/tutor/ask", json=payload)
    assert response.status_code == 400
    assert "User email is required" in response.get_json()["error"]


@patch("app.routes.tutor.get_active_session")
@patch("app.routes.tutor.get_tutor_response")
@patch("app.routes.tutor.save_active_session")
def test_start_session_new(mock_save, mock_tutor, mock_get_active, client):
    """Test starting a brand new tutoring session."""
    mock_get_active.return_value = None # No existing session
    mock_tutor.return_value = {
        "success": True,
        "response": "Welcome to Python class!"
    }

    payload = {
        "mode": "tutor",
        "subject": "Python",
        "userEmail": "test@example.com",
        "isVoiceInput": False
    }

    response = client.post("/api/tutor/session/start", json=payload)
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert "Welcome to Python class" in data["message"]
    assert data["is_resumed"] is False
    mock_save.assert_called_once()


@patch("app.routes.tutor.get_active_session")
def test_start_session_resumed(mock_get_active, client):
    """Test resuming an already active session."""
    mock_get_active.return_value = {
        "session_id": "active_tutor_Python_20260619",
        "mode": "tutor",
        "subject": "Python"
    }

    payload = {
        "mode": "tutor",
        "subject": "Python",
        "userEmail": "test@example.com"
    }

    response = client.post("/api/tutor/session/start", json=payload)
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert data["is_resumed"] is True
    assert data["session_id"] == "active_tutor_Python_20260619"


@patch("app.routes.tutor.end_active_session")
def test_end_session(mock_end, client):
    """Test ending a tutoring session."""
    payload = {
        "session_id": "session-123",
        "userEmail": "test@example.com"
    }
    response = client.post("/api/tutor/session/end", json=payload)
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    mock_end.assert_called_once_with("test@example.com")
