"""Doubt Solving Chatbot API endpoints.

Handles conversational Q&A for student doubts with chat session management,
message persistence, and AI responses using centralized AI system.
"""
from flask import Blueprint, request, jsonify
import time
from pymongo import MongoClient
from bson import ObjectId
from ..config import Config
from datetime import datetime
from app.utils.ai_utils import (
    get_chatbot_response,
    get_tutor_response,
    save_chat_message,
    get_chat_history,
    clear_chat_history
)

chatbot_bp = Blueprint("chatbot", __name__)

# MongoDB connection - REQUIRED
try:
    mongo_uri = Config.MONGODB_URI
    db_name = Config.MONGODB_DB_NAME
    collection_name = Config.MONGODB_CHAT_COLLECTION
    client = MongoClient(mongo_uri)
    db = client[db_name]
    chat_sessions_col = db[collection_name]
except Exception as e:
    raise Exception(f"MongoDB connection required for chatbot - no fallbacks: {str(e)}")

# AI Configuration
SYSTEM_PROMPT = """You are an expert educational tutor helping students with their academic doubts and questions. You should:

1. Provide clear, step-by-step explanations
2. Use simple language that students can understand  
3. Include relevant examples when helpful
4. Break down complex concepts into digestible parts
5. Encourage learning with follow-up questions
6. If it's a coding question, provide code examples with explanations
7. Be patient, supportive, and encouraging
8. Adapt your teaching style to the student's level of understanding
9. Reference previous messages in the conversation when relevant
10. Build upon concepts discussed earlier in the session

Remember to maintain context from previous messages in the conversation to provide personalized and coherent responses."""


def fix_id(document):
    """Convert MongoDB ObjectId to string for JSON serialization."""
    if document and "_id" in document:
        document["id"] = str(document["_id"])
        del document["_id"]
    return document


def get_ai_response(question: str, context: str = "", chat_history: list = None):
    """Generate AI response for doubt solving with conversation context."""
    try:
        # Use centralized tutor response function with conversation history
        result = get_tutor_response(
            prompt=question, 
            subject=None, 
            conversation_history=chat_history[-10:] if chat_history else None
        )
        
        if result['success']:
            return result['response']
        else:
            return None

    except Exception as e:
        return None


# ================= Route Definitions =================

@chatbot_bp.route("/api/chat/loadChat", methods=["GET"])
def load_chat_sessions():
    """Load all chat sessions for a user by email."""
    user_email = request.args.get("userEmail")
    user_id = request.args.get("userId")  # Keep for backward compatibility

    # Prefer email over userId for identification
    identifier = user_email if user_email else user_id
    identifier_field = "userEmail" if user_email else "userId"

    if not identifier:
        return jsonify({"error": "userEmail or userId is required"}), 400

    try:
        sessions = list(chat_sessions_col.find(
            {identifier_field: identifier}).sort("lastActivity", -1))
        for s in sessions:
            fix_id(s)

        # Find current session and session counter
        current_session_id = sessions[0]["id"] if sessions else None
        session_counter = len(sessions) + 1

        return jsonify({
            "success": True,
            "sessions": sessions,
            "currentSessionId": current_session_id,
            "sessionCounter": session_counter
        })
    except Exception as e:
        return jsonify({"error": "Failed to load chat sessions"}), 500


@chatbot_bp.route("/api/chat/saveChat", methods=["PUT"])
def save_chat_sessions():
    """Save multiple chat sessions for a user."""
    data = request.get_json()

    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    user_email = data.get("userEmail")
    user_id = data.get("userId")  # Keep for backward compatibility
    sessions = data.get("sessions", [])

    # Prefer email over userId for identification
    identifier = user_email if user_email else user_id
    identifier_field = "userEmail" if user_email else "userId"

    if not identifier:
        return jsonify({"error": "userEmail or userId is required"}), 400

    try:
        # Remove all old sessions for this user
        chat_sessions_col.delete_many({identifier_field: identifier})

        # Insert new sessions
        for session in sessions:
            if session:
                session_id = session.get(
                    "id") if "id" in session and session["id"] else None
                session["_id"] = ObjectId(
                    session_id) if session_id else ObjectId()
                session[identifier_field] = identifier
                # Keep both fields for transitional period
                if user_email:
                    session["userEmail"] = user_email
                if user_id:
                    session["userId"] = user_id
                chat_sessions_col.replace_one(
                    {"_id": session["_id"]}, session, upsert=True)

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": "Failed to save chat sessions"}), 500


@chatbot_bp.route("/api/chat/createChat", methods=["POST"])
def create_chat_session():
    """Create a new chat session."""
    data = request.get_json()

    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    session_name = data.get("sessionName", "New Chat Session")
    user_email = data.get("userEmail")
    user_id = data.get("userId")  # Keep for backward compatibility

    # Prefer email over userId for identification
    identifier = user_email if user_email else user_id

    if not identifier:
        return jsonify({"error": "userEmail or userId is required"}), 400

    try:
        session = {
            "name": session_name,
            "messages": [],
            "createdAt": datetime.utcnow().isoformat(),
            "lastActivity": datetime.utcnow().isoformat(),
            "messageCount": 0
        }

        # Store both email and userId for transitional period
        if user_email:
            session["userEmail"] = user_email
        if user_id:
            session["userId"] = user_id

        result = chat_sessions_col.insert_one(session)
        session["id"] = str(result.inserted_id)
        session["_id"] = result.inserted_id

        return jsonify({"success": True, "session": fix_id(session)})
    except Exception as e:
        return jsonify({"error": "Failed to create chat session"}), 500


@chatbot_bp.route("/api/chat/updateMessages/<session_id>/messages", methods=["PUT"])
def update_session_messages(session_id):
    """Update messages in a specific chat session."""
    data = request.get_json()

    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    messages = data.get("messages", [])
    user_email = data.get("userEmail")
    user_id = data.get("userId")  # Keep for backward compatibility

    # Prefer email over userId for identification
    identifier = user_email if user_email else user_id
    identifier_field = "userEmail" if user_email else "userId"

    if not identifier:
        return jsonify({"error": "userEmail or userId is required"}), 400

    try:
        result = chat_sessions_col.update_one(
            {"_id": ObjectId(session_id), identifier_field: identifier},
            {"$set": {
                "messages": messages,
                "lastActivity": datetime.utcnow().isoformat(),
                "messageCount": len(messages)
            }}
        )

        return jsonify({"success": result.modified_count > 0})
    except Exception as e:
        return jsonify({"error": "Failed to update session messages"}), 500


@chatbot_bp.route("/api/chat/deleteChat/<session_id>", methods=["DELETE"])
def delete_chat_session(session_id):
    """Delete a chat session."""
    user_email = request.args.get("userEmail")
    user_id = request.args.get("userId")  # Keep for backward compatibility

    # Prefer email over userId for identification
    identifier = user_email if user_email else user_id
    identifier_field = "userEmail" if user_email else "userId"

    if not identifier:
        return jsonify({"error": "userEmail or userId is required"}), 400

    try:
        chat_sessions_col.delete_one(
            {"_id": ObjectId(session_id), identifier_field: identifier})

        # Return remaining sessions for this user
        sessions = list(chat_sessions_col.find(
            {identifier_field: identifier}).sort("lastActivity", -1))
        for s in sessions:
            fix_id(s)

        return jsonify({"success": True, "remainingSessions": sessions})
    except Exception as e:
        return jsonify({"error": "Failed to delete chat session"}), 500


@chatbot_bp.route("/api/chat/updateActivity/<session_id>/activity", methods=["PATCH"])
def update_session_activity(session_id):
    """Update the last activity timestamp for a session."""
    data = request.get_json()

    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    user_email = data.get("userEmail")
    user_id = data.get("userId")  # Keep for backward compatibility

    # Prefer email over userId for identification
    identifier = user_email if user_email else user_id
    identifier_field = "userEmail" if user_email else "userId"

    if not identifier:
        return jsonify({"error": "userEmail or userId is required"}), 400

    try:
        result = chat_sessions_col.update_one(
            {"_id": ObjectId(session_id), identifier_field: identifier},
            {"$set": {"lastActivity": datetime.utcnow().isoformat()}}
        )

        return jsonify({"success": result.modified_count > 0})
    except Exception as e:
        return jsonify({"error": "Failed to update session activity"}), 500


@chatbot_bp.route('/api/chat/message', methods=['POST'])
def send_message():
    """Send a message and get AI response with full conversation context."""
    data = request.get_json()

    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    user_message = data.get('input', '').strip()
    user_email = data.get('userEmail')
    user_id = data.get('userId')  # Keep for backward compatibility
    chat_history = data.get('chatHistory', [])
    session_id = data.get('sessionId')

    # Prefer email over userId for identification
    identifier = user_email if user_email else user_id
    identifier_field = "userEmail" if user_email else "userId"

    if not user_message or not identifier:
        return jsonify({"error": "Message and userEmail/userId are required"}), 400

    try:
        # Format conversation history for AI (last 10 messages only for context management)
        formatted_history = []
        recent_history = chat_history[-10:] if len(chat_history) > 10 else chat_history
        
        for msg in recent_history:
            if msg.get('role') == 'user':
                formatted_history.append({
                    'role': 'user', 
                    'content': msg.get('content', ''),
                    'timestamp': msg.get('timestamp', datetime.utcnow().isoformat())
                })
            elif msg.get('role') == 'assistant':
                formatted_history.append({
                    'role': 'assistant', 
                    'content': msg.get('content', ''),
                    'timestamp': msg.get('timestamp', datetime.utcnow().isoformat())
                })

        # Get AI response with conversation context - MUST WORK
        ai_response = get_ai_response(
            user_message, context="", chat_history=formatted_history)

        if not ai_response:
            raise Exception("AI response generation failed - no fallbacks available")

        # Update session if session_id is provided
        if session_id:
            try:
                # Add the new messages to the session
                updated_history = chat_history + [
                    {"role": "user", "content": user_message,
                        "timestamp": datetime.utcnow().isoformat()},
                    {"role": "assistant", "content": ai_response,
                        "timestamp": datetime.utcnow().isoformat()}
                ]

                update_query = {"_id": ObjectId(session_id)}
                if user_email:
                    update_query["userEmail"] = user_email
                elif user_id:
                    update_query["userId"] = user_id

                chat_sessions_col.update_one(
                    update_query,
                    {"$set": {
                        "messages": updated_history,
                        "lastActivity": datetime.utcnow().isoformat(),
                        "messageCount": len(updated_history)
                    }}
                )
            except Exception as session_error:
                return jsonify({"error": "Failed to update chat session with new messages"}), 500

        response_data = {
            "success": True,
            "message": ai_response,
            "timestamp": datetime.utcnow().isoformat(),
            "context_messages_used": len(formatted_history)  # Debug info
        }

        return jsonify(response_data)

    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# Legacy endpoints for backward compatibility
@chatbot_bp.route("/api/chat/ask", methods=["POST"])
def ask_question():
    """Legacy endpoint - redirects to new message endpoint."""
    data = request.get_json()

    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    # Transform legacy format to new format
    question = data.get("question", "").strip()
    context = data.get("context", "")

    # Create chat history from context if available
    chat_history = []
    if context:
        # Simple parsing of context into chat history
        lines = context.split('\n')
        for line in lines:
            if line.startswith('Student:'):
                chat_history.append(
                    {"role": "user", "content": line.replace('Student:', '').strip()})
            elif line.startswith('Tutor:'):
                chat_history.append(
                    {"role": "assistant", "content": line.replace('Tutor:', '').strip()})

    # Call the new message endpoint internally
    new_data = {
        "input": question,
        "userId": "anonymous",
        "chatHistory": chat_history,
        "sessionId": None
    }

    # Get AI response directly
    try:
        ai_response = get_ai_response(question, context, chat_history)

        if not ai_response:
            ai_response = f"""I understand you're asking about "{question}". Let me help you with this topic.

This appears to be an important concept that requires careful explanation. Here's how I would approach this:

**Key Points to Consider:**
1. Understanding the fundamental principles
2. Breaking down the problem step by step
3. Applying the concepts practically
4. Common mistakes to avoid

**Suggested Approach:**
- Start with the basics and build up your understanding
- Practice with simpler examples first
- Ask follow-up questions if anything is unclear

Would you like me to elaborate on any specific aspect of this topic?"""

        # Transform response back to legacy format
        legacy_response = {
            "response": ai_response,
            "sources": ["AI-powered explanation", "Educational best practices"],
            "timestamp": datetime.utcnow().isoformat(),
            "question": question
        }
        return jsonify(legacy_response)

    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500
