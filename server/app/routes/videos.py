"""YouTube Video Search proxy route.

Proxies YouTube Data API requests securely on the backend without exposing API keys to the client.
"""
from flask import Blueprint, request, jsonify
import requests
import time
from app.config import Config

videos_bp = Blueprint("videos", __name__)

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"

# In-memory TTL cache: key -> (timestamp, data)
_video_cache = {}
CACHE_TTL_SECONDS = 900  # 15 minutes


@videos_bp.route("/api/videos/search", methods=["GET"])
def search_videos():
    """Search YouTube videos for educational content with caching."""
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "Search query parameter 'q' is required"}), 400

    max_results = request.args.get("max_results", 12)
    try:
        max_results = min(max(int(max_results), 1), 50)
    except (ValueError, TypeError):
        max_results = 12

    cache_key = f"{query.lower()}:{max_results}"
    now = time.time()
    if cache_key in _video_cache:
        cached_time, cached_items = _video_cache[cache_key]
        if now - cached_time < CACHE_TTL_SECONDS:
            return jsonify({"success": True, "items": cached_items, "cached": True}), 200

    api_key = Config.YOUTUBE_API_KEY
    if not api_key:
        return jsonify({
            "error": "YouTube API key not configured on the server. Set YOUTUBE_API_KEY in server environment."
        }), 503


    try:
        # 1. Search for video IDs and snippets
        search_params = {
            "part": "snippet",
            "maxResults": max_results,
            "q": query,
            "type": "video",
            "key": api_key,
        }
        search_resp = requests.get(YOUTUBE_SEARCH_URL, params=search_params, timeout=10)
        
        if search_resp.status_code != 200:
            return jsonify({
                "error": f"YouTube API returned status {search_resp.status_code}",
                "details": search_resp.json() if search_resp.headers.get("content-type", "").startswith("application/json") else search_resp.text
            }), search_resp.status_code

        search_data = search_resp.json()
        items = search_data.get("items", [])
        if not items:
            return jsonify({"success": True, "items": []}), 200

        # 2. Fetch statistics and duration details for found videos
        video_ids = [item["id"]["videoId"] for item in items if "id" in item and "videoId" in item["id"]]
        if video_ids:
            stats_params = {
                "part": "statistics,contentDetails",
                "id": ",".join(video_ids),
                "key": api_key,
            }
            stats_resp = requests.get(YOUTUBE_VIDEOS_URL, params=stats_params, timeout=10)
            if stats_resp.status_code == 200:
                stats_data = stats_resp.json()
                stats_map = {
                    stat["id"]: stat
                    for stat in stats_data.get("items", [])
                }
                for item in items:
                    v_id = item.get("id", {}).get("videoId")
                    stat_item = stats_map.get(v_id, {})
                    item["statistics"] = stat_item.get("statistics", {})
                    item["contentDetails"] = stat_item.get("contentDetails", {})

        _video_cache[cache_key] = (now, items)
        return jsonify({"success": True, "items": items}), 200

    except requests.exceptions.Timeout:
        return jsonify({"error": "YouTube API request timed out"}), 504
    except Exception as e:
        return jsonify({"error": f"Failed to search videos: {str(e)}"}), 500
