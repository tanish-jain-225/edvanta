import pytest
from unittest.mock import patch, MagicMock
from app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


@patch("app.routes.roadmap.generate_roadmap_content")
def test_generate_roadmap_success(mock_ai, client):
    """Test generating a roadmap using AI and storing it in memory fallback."""
    mock_ai.return_value = {
        "success": True,
        "roadmap": {
            "nodes": [
                {"id": "1", "title": "Learn Git", "description": "Version control basic", "recommended_weeks": 1}
            ],
            "edges": []
        }
    }

    payload = {
        "goal": "Learn Git",
        "background": "Absolute beginner",
        "duration_weeks": 1,
        "user_email": "test@example.com"
    }

    # Temporarily force db connection to None to test the in-memory fallback
    with patch("app.routes.roadmap.db", None), \
         patch("app.routes.roadmap.connect_to_mongodb", return_value=(None, None, None)):
        response = client.post("/api/roadmap/generate", json=payload)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["roadmap"]["title"] == "Learn Git"
        assert len(data["roadmap"]["data"]["nodes"]) == 1
        mock_ai.assert_called_once_with("Learn Git", "Absolute beginner", 1)


def test_generate_roadmap_missing_payload(client):
    """Test generating a roadmap fails with missing parameters."""
    payload = {"goal": "Learn Git", "background": "Beginner"} # Missing email
    response = client.post("/api/roadmap/generate", json=payload)
    assert response.status_code == 400
    assert "Missing user email" in response.get_json()["error"]


@patch("app.routes.roadmap.connect_to_mongodb", return_value=(None, None, None))
@patch("app.routes.roadmap.db", None)
def test_get_user_roadmaps_fallback(mock_connect, client):
    """Test getting roadmaps for a user using in-memory store."""
    from app.routes.roadmap import _in_memory_roadmaps
    _in_memory_roadmaps.clear()
    
    # Pre-populate dummy roadmap
    _in_memory_roadmaps["mock-id-123"] = {
        "id": "mock-id-123",
        "user_email": "test@example.com",
        "title": "Machine Learning",
        "description": "Python dev",
        "duration_weeks": 8,
        "data": {"nodes": []}
    }

    response = client.get("/api/roadmap/user?user_email=test@example.com")
    
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["title"] == "Machine Learning"


@patch("app.routes.roadmap.connect_to_mongodb", return_value=(None, None, None))
@patch("app.routes.roadmap.db", None)
def test_delete_roadmap_success(mock_connect, client):
    """Test successfully deleting a roadmap from in-memory fallback."""
    from app.routes.roadmap import _in_memory_roadmaps
    _in_memory_roadmaps["mock-id-123"] = {
        "id": "mock-id-123",
        "user_email": "test@example.com",
        "title": "Roadmap to Delete"
    }

    response = client.delete("/api/roadmap/mock-id-123?user_email=test@example.com")
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert "deleted successfully" in data["message"]
    assert "mock-id-123" not in _in_memory_roadmaps
