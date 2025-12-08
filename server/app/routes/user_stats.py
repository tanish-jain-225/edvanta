from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from app.config import Config
from datetime import datetime

user_stats_bp = Blueprint('user_stats', __name__)

# MongoDB connection - GRACEFUL ERROR HANDLING
try:
    mongo_uri = Config.MONGODB_URI
    db_name = Config.MONGODB_DB_NAME
    quiz_history_collection_name = Config.MONGODB_QUIZ_HISTORY_COLLECTION
    roadmaps_collection_name = Config.MONGODB_ROADMAP_COLLECTION

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    # Test connection
    client.server_info()
    db = client[db_name]
    quiz_history_collection = db[quiz_history_collection_name]
    roadmaps_collection = db[roadmaps_collection_name]
    print(f"MongoDB connected successfully to {db_name}")
except Exception as e:
    print(f"MongoDB connection failed: {str(e)}")
    # Set to None to handle gracefully in routes
    client = None
    db = None
    quiz_history_collection = None
    roadmaps_collection = None


@user_stats_bp.route("/api/user-stats", methods=["GET"])
def get_user_stats():
    """Get real-time user statistics: Active Roadmaps, Skills Learning, Quizzes Made"""
    try:
        user_email = request.args.get('user_email')
        if not user_email:
            return jsonify({"error": "user_email parameter is required"}), 400
        
        # Check if MongoDB is available
        if db is None or quiz_history_collection is None or roadmaps_collection is None:
            return jsonify({
                "error": "Database not available",
                "total_learning_minutes": 0,
                "quizzes_taken": 0,
                "active_roadmaps": 0,
                "skills_learning": 0,
                "roadmaps_created": 0,
                "total_skills_learning": 0,
                "data_source": "fallback_no_db",
                "user_email": user_email,
                "timestamp": str(datetime.now())
            }), 503

        # Initialize default values
        active_roadmaps_count = 0
        unique_skills_count = 0
        quizzes_made_count = 0
        
        # 1. Get Active Roadmaps Count
        active_roadmaps_count = roadmaps_collection.count_documents({"user_email": user_email})
        
        # 2. Get Skills Learning (Total unique skills from all roadmaps)
        skills_pipeline = [
            {"$match": {"user_email": user_email}},
            {"$project": {
                "skills": {"$ifNull": ["$data.nodes", []]}
            }},
            {"$unwind": "$skills"},
            {"$group": {
                "_id": "$skills.id",
                "skill_name": {"$first": "$skills.text"}
            }},
            {"$count": "unique_skills_count"}
        ]
        
        skills_result = list(roadmaps_collection.aggregate(skills_pipeline))
        unique_skills_count = skills_result[0].get("unique_skills_count", 0) if skills_result else 0
        
        # 3. Get Quizzes Made Count
        quizzes_made_count = quiz_history_collection.count_documents({"userId": user_email})
        
        # Calculate realistic learning time based on actual activity
        # 12 minutes per quiz (average time to complete + review)
        # 15 minutes per skill (estimated learning time per skill node)
        estimated_learning_minutes = (quizzes_made_count * 12) + (unique_skills_count * 15)
        
        # Prepare response
        response_data = {
            "total_learning_minutes": estimated_learning_minutes,
            "quizzes_taken": quizzes_made_count,
            "active_roadmaps": active_roadmaps_count,
            "skills_learning": unique_skills_count,
            "roadmaps_created": active_roadmaps_count,
            "total_skills_learning": unique_skills_count,
            "data_source": "real_mongodb_data",
            "user_email": user_email,
            "timestamp": str(datetime.now())
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({
            "error": f"Failed to retrieve user stats: {str(e)}",
            "total_learning_minutes": 0,
            "quizzes_taken": 0,
            "active_roadmaps": 0,
            "skills_learning": 0,
            "roadmaps_created": 0,
            "total_skills_learning": 0,
            "data_source": "error_fallback",
            "user_email": user_email if 'user_email' in locals() else "unknown",
            "timestamp": str(datetime.now())
        }), 500


@user_stats_bp.route("/api/user-stats/test", methods=["GET"])
def test_user_stats():
    """Test endpoint to verify user-stats routes are working"""
    return jsonify({
        "status": "ok",
        "message": "User stats routes are working",
        "mongodb_available": db is not None,
        "collections_available": {
            "quiz_history": quiz_history_collection is not None,
            "roadmaps": roadmaps_collection is not None
        }
    }), 200


@user_stats_bp.route("/api/user-stats/session", methods=["POST"])
def save_user_session():
    """Deprecated: No session storage needed for real-time stats"""
    return jsonify({
        "success": True,
        "message": "Session tracking not needed - using real-time calculations",
        "deprecated": True
    }), 200


@user_stats_bp.route("/api/user-stats/debug", methods=["GET"])
def debug_user_stats():
    """Debug endpoint to verify data sources"""
    try:
        user_email = request.args.get('user_email')
        
        if not user_email:
            return jsonify({"error": "user_email parameter is required"}), 400
        
        if quiz_history_collection is None or roadmaps_collection is None:
            return jsonify({"error": "Database connection not available"}), 500
        
        # Check roadmaps data
        roadmap_sample = roadmaps_collection.find_one({"user_email": user_email})
        roadmap_count = roadmaps_collection.count_documents({"user_email": user_email})
        
        # Check quiz data  
        quiz_sample = quiz_history_collection.find_one({"userId": user_email})
        quiz_count = quiz_history_collection.count_documents({"userId": user_email})
        
        # Get sample skill structure from roadmap
        sample_skills = []
        if roadmap_sample and "data" in roadmap_sample and "nodes" in roadmap_sample["data"]:
            sample_skills = roadmap_sample["data"]["nodes"][:3]  # First 3 skills
        
        debug_info = {
            "user_email": user_email,
            "roadmaps": {
                "count": roadmap_count,
                "has_sample": roadmap_sample is not None,
                "sample_skills_structure": sample_skills
            },
            "quizzes": {
                "count": quiz_count,
                "has_sample": quiz_sample is not None,
                "sample_fields": list(quiz_sample.keys()) if quiz_sample else []
            }
        }
        
        return jsonify(debug_info), 200
        
    except Exception as e:
        return jsonify({"error": f"Debug error: {str(e)}"}), 500