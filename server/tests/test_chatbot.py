import pytest
from unittest.mock import patch, MagicMock
from app import create_app
from bson import ObjectId
from datetime import datetime


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


@patch("app.routes.chatbot.chat_sessions_col")
def test_load_chat_sessions_success(mock_col, client):
    """Test loading chatbot sessions for a user successfully."""
    # Mock database results
    mock_session = {
        "_id": ObjectId("60c72b2f9b1d8e1f5c8b4568"),
        "name": "Test Session",
        "messages": [],
        "lastActivity": datetime.utcnow().isoformat(),
        "messageCount": 0
    }
    mock_col.find.return_value.sort.return_value = [mock_session]

    response = client.get("/api/chat/loadChat?userEmail=test@example.com")
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert len(data["sessions"]) == 1
    assert data["sessions"][0]["name"] == "Test Session"
    assert data["sessions"][0]["id"] == "60c72b2f9b1d8e1f5c8b4568"
    mock_col.find.assert_called_once_with({"userEmail": "test@example.com"})


def test_load_chat_sessions_missing_email(client):
    """Test loading chat sessions fails when missing user credentials."""
    response = client.get("/api/chat/loadChat")
    assert response.status_code == 400
    data = response.get_json()
    assert "userEmail or userId is required" in data["error"]


@patch("app.routes.chatbot.chat_sessions_col")
def test_create_chat_session_success(mock_col, client):
    """Test successfully creating a new chat session."""
    # Mock insert_one result
    mock_result = MagicMock()
    mock_result.inserted_id = ObjectId("60c72b2f9b1d8e1f5c8b4569")
    mock_col.insert_one.return_value = mock_result

    payload = {
        "sessionName": "New AI Doubt Chat",
        "userEmail": "test@example.com"
    }
    response = client.post("/api/chat/createChat", json=payload)
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert data["session"]["name"] == "New AI Doubt Chat"
    assert data["session"]["id"] == "60c72b2f9b1d8e1f5c8b4569"
    mock_col.insert_one.assert_called_once()


@patch("app.routes.chatbot.chat_sessions_col")
@patch("app.routes.chatbot.get_tutor_response")
def test_send_message_success(mock_tutor, mock_col, client):
    """Test successfully sending a message to get an AI reply."""
    # Mock AI response
    mock_tutor.return_value = {
        "success": True,
        "response": "Recursion is when a function calls itself to solve a smaller instance of the same problem."
    }

    payload = {
        "input": "Explain recursion",
        "userEmail": "test@example.com",
        "sessionId": "60c72b2f9b1d8e1f5c8b4568",
        "chatHistory": []
    }
    
    response = client.post("/api/chat/message", json=payload)
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert "Recursion is when a function" in data["message"]
    
    # Verify DB update was executed to store messages
    mock_col.update_one.assert_called_once()
    args = mock_col.update_one.call_args[0]
    assert args[0]["_id"] == ObjectId("60c72b2f9b1d8e1f5c8b4568")
    assert args[0]["userEmail"] == "test@example.com"


@patch("app.routes.chatbot.chat_sessions_col")
def test_delete_chat_session(mock_col, client):
    """Test deleting a chat session and returning remaining ones."""
    mock_col.find.return_value.sort.return_value = []
    
    response = client.delete("/api/chat/deleteChat/60c72b2f9b1d8e1f5c8b4568?userEmail=test@example.com")
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert len(data["remainingSessions"]) == 0
    mock_col.delete_one.assert_called_once_with({
        "_id": ObjectId("60c72b2f9b1d8e1f5c8b4568"),
        "userEmail": "test@example.com"
    })


def test_invalid_session_id_handling(client):
    """Test that invalid session IDs return 400 Bad Request instead of 500 error."""
    # Test delete with invalid hex/non-ObjectId string
    resp1 = client.delete("/api/chat/deleteChat/invalid-id-123?userEmail=test@example.com")
    assert resp1.status_code == 400
    assert "Invalid session ID" in resp1.get_json()["error"]

    # Test update with invalid hex string
    resp2 = client.put("/api/chat/updateMessages/invalid-id-123/messages", json={
        "userEmail": "test@example.com",
        "messages": []
    })
    assert resp2.status_code == 400
    assert "Invalid session ID" in resp2.get_json()["error"]

