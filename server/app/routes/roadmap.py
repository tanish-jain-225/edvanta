"""Roadmap generation endpoints.

Generates a learning roadmap with milestones, resources, and estimated durations using centralized AI.
Stores and retrieves roadmaps from MongoDB.
"""
from flask import Blueprint, request, jsonify, send_file
import os
import json
import uuid
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from ..config import Config
from app.utils.ai_utils import generate_roadmap_content

roadmap_bp = Blueprint("roadmap", __name__)

# Function to establish MongoDB connection


def connect_to_mongodb():
    try:
        connection_string = Config.MONGODB_URI
        db_name = Config.MONGODB_DB_NAME
        # Provide default collection name if not configured to avoid None indexing
        dynamic_collection = Config.MONGODB_ROADMAP_COLLECTION or "roadmaps"

        if not connection_string or not db_name:
            return None, None, None

        # Attempt to connect with a timeout
        client = MongoClient(connection_string)
        # Test the connection
        client.admin.command('ping')

        db = client[db_name]
        collection_name = dynamic_collection

        return client, db, collection_name
    except Exception:
        return None, None, None


# MongoDB setup
client, db, collection_name = connect_to_mongodb()

# In-memory fallback store for roadmaps when MongoDB is not configured
_in_memory_roadmaps = {}


@roadmap_bp.route("/api/roadmap/generate", methods=["POST"])
def generate_roadmap():
    """Generate roadmap for a target skill or goal.

    Expected JSON: {"goal": "Become a ML Engineer", "background": "Python programmer", "duration_weeks": 12, "user_email": "user@example.com" }
    Steps:
      1. Validate request
      2. Call Gemini AI to outline milestones & sequencing
      3. Store the generated roadmap in MongoDB
      4. Return the roadmap data
    """
    # Check if MongoDB is available (if not, use in-memory fallback)
    global client, db, collection_name
    if db is None:
        client, db, collection_name = connect_to_mongodb()

    data = request.get_json()
    goal = data.get("goal")
    background = data.get("background")  # user's current knowledge/skills
    duration_weeks = data.get("duration_weeks")
    user_email = data.get("user_email")

    if not goal or not background:
        return jsonify({"error": "Missing goal or background"}), 400

    if not user_email:
        return jsonify({"error": "Missing user email"}), 400

    # Use centralized AI to generate roadmap
    try:
        # Generate roadmap using centralized AI function - NO FALLBACKS
        result = generate_roadmap_content(goal, background, duration_weeks or 12)
        
        if not result['success']:
            raise Exception(f"AI roadmap generation failed: {result.get('error', 'Unknown error')}")
        
        roadmap_data = result['roadmap']

        # Prepare document used for DB or in-memory fallback
        roadmap_document = {
            "id": str(uuid.uuid4()),
            "user_email": user_email,
            "title": goal,
            "description": background,
            "duration_weeks": duration_weeks,
            "created_at": datetime.utcnow(),
            "data": roadmap_data
        }

        # Save to MongoDB - REQUIRED
        if db is None or collection_name is None:
            raise Exception("MongoDB connection required for roadmap storage - no fallbacks available")
        
        roadmap_collection = db[collection_name]
        roadmap_collection.insert_one(roadmap_document)
        return jsonify({"success": True, "roadmap": roadmap_data})
    except Exception as e:
        raise e


@roadmap_bp.route("/api/roadmap/user", methods=["GET"])
def get_user_roadmaps():
    """Get all roadmaps for a specific user.

    Query params:
    - user_email: The email of the user to get roadmaps for
    """
    # Check if MongoDB is available
    global client, db, collection_name
    if db is None:
        client, db, collection_name = connect_to_mongodb()
        # If still unavailable, proceed with in-memory fallback (do not 503)

    user_email = request.args.get("user_email")
    if not user_email:
        return jsonify({"error": "Missing user_email parameter"}), 400

    try:
        if db is not None and collection_name is not None:
            roadmap_collection = db[collection_name]
            roadmaps_cursor = roadmap_collection.find({"user_email": user_email}).sort("created_at", -1)
            roadmaps = []
            for roadmap in roadmaps_cursor:
                roadmap["_id"] = str(roadmap["_id"])
                roadmaps.append(roadmap)
            return jsonify(roadmaps)
        # Fallback to in-memory
        user_roadmaps = [r for r in _in_memory_roadmaps.values() if r.get("user_email") == user_email]
        return jsonify(user_roadmaps)
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve roadmaps: {str(e)}"}), 500


@roadmap_bp.route("/api/roadmap/<roadmap_id>", methods=["GET", "DELETE"])
def get_roadmap_by_id(roadmap_id):
    """Get or delete a specific roadmap by ID.

    Query params:
    - user_email: The email of the user requesting the roadmap
    """
    # Check if MongoDB is available (use in-memory fallback if not)
    global client, db, collection_name
    if db is None:
        client, db, collection_name = connect_to_mongodb()

    if not roadmap_id:
        return jsonify({"error": "Missing roadmap_id parameter"}), 400

    user_email = request.args.get("user_email")
    if not user_email:
        return jsonify({"error": "Missing user_email parameter"}), 400

    try:
        # If DB is available, operate against MongoDB
        if db is not None and collection_name is not None:
            roadmap_collection = db[collection_name]

            # Check if roadmap exists and verify ownership
            roadmap = roadmap_collection.find_one(
                {"id": roadmap_id, "user_email": user_email})

            if not roadmap:
                return jsonify({"error": "Roadmap not found or access denied"}), 404

            # For DELETE method, delete the roadmap
            if request.method == "DELETE":
                result = roadmap_collection.delete_one(
                    {"id": roadmap_id, "user_email": user_email})

                if result.deleted_count > 0:
                    return jsonify({"success": True, "message": "Roadmap deleted successfully"}), 200
                else:
                    return jsonify({"error": "Failed to delete roadmap"}), 500

            # For GET method, return the roadmap
            # Convert ObjectId to string for JSON serialization
            roadmap["_id"] = str(roadmap["_id"])
            return jsonify(roadmap)

        # Fall back to in-memory store
        r = None
        for rid, roadmap in _in_memory_roadmaps.items():
            if roadmap.get("id") == roadmap_id and roadmap.get("user_email") == user_email:
                r = roadmap
                break

        if not r:
            return jsonify({"error": "Roadmap not found or access denied"}), 404

        if request.method == "DELETE":
            _in_memory_roadmaps.pop(r.get("id"), None)
            return jsonify({"success": True, "message": "Roadmap deleted successfully"}), 200

        return jsonify(r)

    except Exception as e:
        return jsonify({"error": f"Operation failed: {str(e)}"}), 500


@roadmap_bp.route("/api/roadmap/download/<roadmap_id>", methods=["GET"])
def download_roadmap(roadmap_id):
    """Download a roadmap as PDF.

    Query params:
    - user_email: The email of the user requesting the roadmap
    """
    # Check if MongoDB is available
    global client, db, collection_name
    if db is None:
        client, db, collection_name = connect_to_mongodb()

    user_email = request.args.get("user_email")
    if not user_email:
        return jsonify({"error": "Missing user_email parameter"}), 400

    try:
        # Fetch roadmap
        if db is not None and collection_name is not None:
            roadmap_collection = db[collection_name]
            roadmap = roadmap_collection.find_one(
                {"id": roadmap_id, "user_email": user_email})
            if not roadmap:
                return jsonify({"error": "Roadmap not found or access denied"}), 404
        else:
            # Fallback to in-memory
            roadmap = _in_memory_roadmaps.get(roadmap_id)
            if not roadmap or roadmap.get("user_email") != user_email:
                return jsonify({"error": "Roadmap not found or access denied"}), 404

        # Generate PDF using reportlab
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_LEFT
        from reportlab.lib.units import mm
        from reportlab.lib import colors
        import io

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=18 * mm,
            bottomMargin=18 * mm,
            title=f"Roadmap: {roadmap['title']}",
        )

        styles = getSampleStyleSheet()
        h1 = ParagraphStyle("Title", parent=styles["Heading1"], fontSize=18, leading=22, spaceAfter=6)
        h2 = ParagraphStyle("Section", parent=styles["Heading2"], fontSize=13, spaceBefore=12, spaceAfter=6)
        normal = styles["BodyText"]
        bullet_style = ParagraphStyle("Bullet", parent=styles["BodyText"], bulletIndent=10, leftIndent=12)

        story = []
        # Header
        story.append(Paragraph(f"Roadmap: {roadmap['title']}", h1))
        story.append(Spacer(1, 6))

        # Description
        story.append(Paragraph(roadmap['description'], normal))
        story.append(Spacer(1, 12))

        # Duration
        if roadmap.get('duration_weeks'):
            story.append(Paragraph(f"Target Duration: {roadmap['duration_weeks']} weeks", normal))
            story.append(Spacer(1, 6))

        # Created date
        if roadmap.get('created_at'):
            created_date = roadmap['created_at']
            if isinstance(created_date, datetime):
                created_str = created_date.strftime("%Y-%m-%d")
            else:
                created_str = str(created_date)
            story.append(Paragraph(f"Created: {created_str}", normal))
            story.append(Spacer(1, 12))

        # Nodes
        story.append(Paragraph("Learning Path:", h2))
        story.append(Spacer(1, 6))

        nodes = roadmap['data'].get('nodes', [])
        for i, node in enumerate(nodes, 1):
            story.append(Paragraph(f"{i}. {node['title']}", h2))
            story.append(Paragraph(node['description'], normal))
            if node.get('recommended_weeks'):
                story.append(Paragraph(f"Recommended weeks: {node['recommended_weeks']}", normal))
            if node.get('resources') and node['resources']:
                story.append(Paragraph("Resources:", normal))
                bullets = [ListItem(Paragraph(str(r), normal)) for r in node['resources']]
                story.append(ListFlowable(bullets, bulletType="bullet", leftIndent=12))
            story.append(Spacer(1, 12))

        # Edges (dependencies)
        edges = roadmap['data'].get('edges', [])
        if edges:
            story.append(Paragraph("Skill Dependencies:", h2))
            story.append(Spacer(1, 6))
            for edge in edges:
                from_node = next((n for n in nodes if n['id'] == edge['from']), None)
                to_node = next((n for n in nodes if n['id'] == edge['to']), None)
                if from_node and to_node:
                    story.append(Paragraph(f"{from_node['title']} → {to_node['title']}", normal))
            story.append(Spacer(1, 12))

        doc.build(story)
        buf.seek(0)

        return send_file(
            buf,
            as_attachment=True,
            download_name=f"roadmap_{roadmap_id}.pdf",
            mimetype='application/pdf'
        )

    except Exception as e:
        return jsonify({"error": f"Download failed: {str(e)}"}), 500
