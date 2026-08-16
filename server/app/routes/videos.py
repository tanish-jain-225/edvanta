"""YouTube Video Search proxy route.

Proxies YouTube Data API requests securely on the backend without exposing API keys to the client,
with graceful curated educational recommendations when API keys are not configured.
"""
from flask import Blueprint, request, jsonify
import requests
import time
import logging
from app.config import Config

logger = logging.getLogger(__name__)

videos_bp = Blueprint("videos", __name__)

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"

# In-memory TTL cache: key -> (timestamp, data)
_video_cache = {}
CACHE_TTL_SECONDS = 900  # 15 minutes

CURATED_EDUCATIONAL_VIDEOS = [
    {
        "id": {"videoId": "8jLOx1hD3_o"},
        "snippet": {
            "title": "CS50 2024 - Lecture 0 - Computational Thinking",
            "description": "Introduction to computer science and the art of programming by Harvard University.",
            "channelTitle": "CS50",
            "thumbnails": {"medium": {"url": "https://i.ytimg.com/vi/8jLOx1hD3_o/mqdefault.jpg"}},
        },
        "statistics": {"viewCount": "2150000"},
        "contentDetails": {"duration": "PT2H14M32S"},
        "tags": ["cs50", "computer science", "programming", "algorithms", "harvard", "basics", "videos"]
    },
    {
        "id": {"videoId": "_uQrJ0TkZlc"},
        "snippet": {
            "title": "Python for Beginners - Full Course [Programming Tutorial]",
            "description": "Learn Python programming from scratch with hands-on exercises and real-world examples.",
            "channelTitle": "Programming with Mosh",
            "thumbnails": {"medium": {"url": "https://i.ytimg.com/vi/_uQrJ0TkZlc/mqdefault.jpg"}},
        },
        "statistics": {"viewCount": "41000000"},
        "contentDetails": {"duration": "PT6H14M07S"},
        "tags": ["python", "programming", "coding", "backend", "beginner", "videos"]
    },
    {
        "id": {"videoId": "PkZNo7MFNFg"},
        "snippet": {
            "title": "JavaScript Programming - Full Course for Beginners",
            "description": "Learn modern JavaScript (ES6+) through practical examples and interactive coding challenges.",
            "channelTitle": "freeCodeCamp.org",
            "thumbnails": {"medium": {"url": "https://i.ytimg.com/vi/PkZNo7MFNFg/mqdefault.jpg"}},
        },
        "statistics": {"viewCount": "8900000"},
        "contentDetails": {"duration": "PT7H45M12S"},
        "tags": ["javascript", "js", "web", "frontend", "programming", "videos"]
    },
    {
        "id": {"videoId": "bMknfKXIFA8"},
        "snippet": {
            "title": "React Course - Beginner's Tutorial for React JavaScript",
            "description": "Master React with functional components, hooks, props, and modern state management.",
            "channelTitle": "freeCodeCamp.org",
            "thumbnails": {"medium": {"url": "https://i.ytimg.com/vi/bMknfKXIFA8/mqdefault.jpg"}},
        },
        "statistics": {"viewCount": "4200000"},
        "contentDetails": {"duration": "PT11H55M27S"},
        "tags": ["react", "reactjs", "frontend", "web", "javascript", "videos"]
    },
    {
        "id": {"videoId": "8hly31xKli0"},
        "snippet": {
            "title": "Algorithms and Data Structures Tutorial - Full Course",
            "description": "Comprehensive guide to sorting, searching, trees, graphs, and algorithmic complexity.",
            "channelTitle": "freeCodeCamp.org",
            "thumbnails": {"medium": {"url": "https://i.ytimg.com/vi/8hly31xKli0/mqdefault.jpg"}},
        },
        "statistics": {"viewCount": "3800000"},
        "contentDetails": {"duration": "PT5H22M08S"},
        "tags": ["algorithms", "data structures", "dsa", "leetcode", "computer science", "videos"]
    },
    {
        "id": {"videoId": "aircAruvnKk"},
        "snippet": {
            "title": "But what is a neural network? | Deep learning, chapter 1",
            "description": "What are the neurons, why are there layers, and what does the math underlying deep learning look like?",
            "channelTitle": "3Blue1Brown",
            "thumbnails": {"medium": {"url": "https://i.ytimg.com/vi/aircAruvnKk/mqdefault.jpg"}},
        },
        "statistics": {"viewCount": "19400000"},
        "contentDetails": {"duration": "PT19M13S"},
        "tags": ["neural networks", "ai", "machine learning", "deep learning", "math", "3blue1brown", "videos"]
    },
    {
        "id": {"videoId": "fNk_zzaMoEs"},
        "snippet": {
            "title": "Vectors, what even are they? | Essence of linear algebra, chapter 1",
            "description": "Visualizing vectors and linear combinations geometrically for mathematics and physics.",
            "channelTitle": "3Blue1Brown",
            "thumbnails": {"medium": {"url": "https://i.ytimg.com/vi/fNk_zzaMoEs/mqdefault.jpg"}},
        },
        "statistics": {"viewCount": "6800000"},
        "contentDetails": {"duration": "PT9M52S"},
        "tags": ["math", "linear algebra", "vectors", "calculus", "geometry", "videos"]
    },
    {
        "id": {"videoId": "RGOj5yH7evk"},
        "snippet": {
            "title": "Git and GitHub for Beginners - Crash Course",
            "description": "Learn Git version control, repositories, branches, merges, and GitHub collaboration.",
            "channelTitle": "freeCodeCamp.org",
            "thumbnails": {"medium": {"url": "https://i.ytimg.com/vi/RGOj5yH7evk/mqdefault.jpg"}},
        },
        "statistics": {"viewCount": "5600000"},
        "contentDetails": {"duration": "PT1H08M25S"},
        "tags": ["git", "github", "version control", "devops", "tools", "videos"]
    },
    {
        "id": {"videoId": "HXV3zeRR3h4"},
        "snippet": {
            "title": "SQL Tutorial - Full Database Course for Beginners",
            "description": "Master relational databases, SQL queries, schemas, and database management.",
            "channelTitle": "freeCodeCamp.org",
            "thumbnails": {"medium": {"url": "https://i.ytimg.com/vi/HXV3zeRR3h4/mqdefault.jpg"}},
        },
        "statistics": {"viewCount": "12000000"},
        "contentDetails": {"duration": "PT4H20M02S"},
        "tags": ["sql", "database", "postgres", "mysql", "data", "backend", "videos"]
    },
    {
        "id": {"videoId": "i_LwzRVP7bg"},
        "snippet": {
            "title": "Machine Learning for Everybody – Full Course",
            "description": "Learn Machine Learning concepts, models, classification, regression, and practical Python implementation.",
            "channelTitle": "freeCodeCamp.org",
            "thumbnails": {"medium": {"url": "https://i.ytimg.com/vi/i_LwzRVP7bg/mqdefault.jpg"}},
        },
        "statistics": {"viewCount": "4900000"},
        "contentDetails": {"duration": "PT3H53M14S"},
        "tags": ["machine learning", "ml", "ai", "artificial intelligence", "data science", "videos"]
    }
]


def _get_curated_educational_videos(query: str, max_results: int = 12) -> list:
    """Filter curated educational videos by query keywords with relevance scoring."""
    q_words = [w.lower() for w in query.split() if w.strip()]
    if not q_words:
        return CURATED_EDUCATIONAL_VIDEOS[:max_results]

    def score_video(video):
        score = 0
        title = video["snippet"]["title"].lower()
        desc = video["snippet"]["description"].lower()
        tags = video.get("tags", [])
        
        for w in q_words:
            if w in title:
                score += 5
            if w in desc:
                score += 2
            if any(w in t for t in tags):
                score += 3
        return score

    scored = [(score_video(v), v) for v in CURATED_EDUCATIONAL_VIDEOS]
    if any(s > 0 for s, _ in scored):
        scored.sort(key=lambda x: x[0], reverse=True)

    return [v for _, v in scored][:max_results]


@videos_bp.route("/api/videos/search", methods=["GET"])
def search_videos():
    """Search YouTube videos for educational content with caching and curated fallback."""
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
        fallback_items = _get_curated_educational_videos(query, max_results)
        return jsonify({
            "success": True,
            "items": fallback_items,
            "fallback": True,
            "notice": "Serving curated educational video recommendations. Set YOUTUBE_API_KEY in server environment for live YouTube search."
        }), 200

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
            logger.warning(f"YouTube API returned status {search_resp.status_code}, serving curated fallback.")
            fallback_items = _get_curated_educational_videos(query, max_results)
            return jsonify({
                "success": True,
                "items": fallback_items,
                "fallback": True,
                "notice": f"YouTube API returned status {search_resp.status_code}. Serving curated educational recommendations."
            }), 200

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
        fallback_items = _get_curated_educational_videos(query, max_results)
        return jsonify({
            "success": True,
            "items": fallback_items,
            "fallback": True,
            "notice": "YouTube API request timed out. Serving curated educational recommendations."
        }), 200
    except Exception as e:
        logger.warning(f"YouTube search error: {e}, serving curated fallback.")
        fallback_items = _get_curated_educational_videos(query, max_results)
        return jsonify({
            "success": True,
            "items": fallback_items,
            "fallback": True,
            "notice": "Serving curated educational video recommendations."
        }), 200
