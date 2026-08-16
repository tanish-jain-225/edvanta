from unittest.mock import patch, MagicMock
from app import create_app
from app.config import Config


def test_videos_search_missing_query():
    """Test /api/videos/search with no query parameter."""
    app = create_app()
    client = app.test_client()
    response = client.get("/api/videos/search")
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


def test_videos_search_missing_api_key():
    """Test /api/videos/search when YouTube API key is missing returns curated educational fallback."""
    with patch.object(Config, 'YOUTUBE_API_KEY', None):
        app = create_app()
        client = app.test_client()
        response = client.get("/api/videos/search?q=python")
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data.get("fallback") is True
        assert len(data["items"]) > 0


@patch('app.routes.videos.requests.get')
def test_videos_search_success(mock_get):
    """Test successful YouTube video search with statistics."""
    # Mock search response
    mock_search_resp = MagicMock()
    mock_search_resp.status_code = 200
    mock_search_resp.json.return_value = {
        "items": [
            {
                "id": {"videoId": "test_video_123"},
                "snippet": {
                    "title": "Learn Python in 10 Minutes",
                    "description": "A quick Python tutorial.",
                    "thumbnails": {"medium": {"url": "https://img.youtube.com/vi/test_video_123/mqdefault.jpg"}}
                }
            }
        ]
    }

    # Mock statistics response
    mock_stats_resp = MagicMock()
    mock_stats_resp.status_code = 200
    mock_stats_resp.json.return_value = {
        "items": [
            {
                "id": "test_video_123",
                "statistics": {"viewCount": "10500", "likeCount": "850"},
                "contentDetails": {"duration": "PT10M15S"}
            }
        ]
    }

    mock_get.side_effect = [mock_search_resp, mock_stats_resp]

    with patch.object(Config, 'YOUTUBE_API_KEY', 'dummy_yt_key'):
        app = create_app()
        client = app.test_client()
        response = client.get("/api/videos/search?q=python+tutorial")
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert len(data["items"]) == 1
        item = data["items"][0]
        assert item["id"]["videoId"] == "test_video_123"
        assert item["statistics"]["viewCount"] == "10500"
