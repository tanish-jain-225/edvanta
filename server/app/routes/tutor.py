"""Conversational Tutor endpoints.

Combines AI tutoring responses with Gemini AI for seamless voice interaction
"""
from flask import Blueprint, request, jsonify
from datetime import datetime
import os
import json
import traceback
from app.utils.ai_utils import (
    get_tutor_response,
    get_chatbot_response,
    get_chat_history,
    clear_chat_history,
    save_active_session,
    get_active_session,
    end_active_session,
    save_chat_message,
    initialize_ai,
    _optimize_for_voice
)

tutor_bp = Blueprint('tutor', __name__)


@tutor_bp.route("/api/tutor/ask", methods=["POST"])
def tutor_ask():
    """Receive a tutoring question/prompt and return guidance optimized for voice or text.

    Expected JSON: {"prompt": "...", "mode": "...", "subject": "...", "isVoiceInput": bool, "userEmail": "..." }
    Returns: { success: bool, response: str, timestamp: str }
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    prompt = data.get('prompt', '').strip()
    mode = data.get('mode', 'tutor')
    subject = data.get('subject', 'general')
    # Default to True as per requirements
    is_voice_input = data.get('isVoiceInput', True)
    user_email = data.get('userEmail')
    session_id = data.get('sessionId')  # Optional session ID for tracking

    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    if not user_email:
        return jsonify({"error": "User email is required for conversation tracking"}), 400

    try:
        # Create context for the AI based on mode and subject
        context = {
            "mode": mode,
            "subject": subject,
            "is_voice_input": is_voice_input,
            "user_email": user_email,
            "session_id": session_id
        }

        # Call centralized AI for the response
        ai_result = get_tutor_response(prompt, subject, conversation_history=None)
        
        if not ai_result['success']:
            raise Exception(f"AI tutor response failed: {ai_result.get('error', 'Unknown error')}")
        
        response = ai_result['response']
        # Optimize for voice if needed
        if is_voice_input:
            response = _optimize_for_voice(response)

        result = {
            "success": True,
            "response": response,
            "mode": mode,
            "subject": subject,
            "isVoiceInput": is_voice_input,
            "timestamp": datetime.utcnow().isoformat()
        }

        return jsonify(result)

    except Exception as e:

        # Create a friendly error message
        error_context = {
            "mode": mode,
            "subject": subject,
            "is_voice_input": is_voice_input,
            "is_error_state": True
        }

        # Get a graceful error response
        fallback_result = get_tutor_response(
            f"Error processing request about {subject}",
            subject
        )
        fallback_response = fallback_result['response']

        return jsonify({
            "success": False,
            "error": str(e),
            "response": fallback_response,
            "mode": mode,
            "subject": subject,
            "isVoiceInput": is_voice_input,
            "timestamp": datetime.utcnow().isoformat()
        }), 200  # Return 200 with error info so frontend can still display the message


@tutor_bp.route("/api/tutor/session/start", methods=["POST"])
def start_session():
    """Start a new tutoring session with voice-aware initialization.

    Expected JSON: {"mode": "...", "subject": "...", "userEmail": "...", "isVoiceInput": bool}
    Returns: { success: bool, session_id: str, message: str, timestamp: str }
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    mode = data.get('mode', 'tutor')
    subject = data.get('subject', 'general')
    user_email = data.get('userEmail')
    is_voice_input = data.get('isVoiceInput', True)  # Default to voice input

    if not user_email:
        return jsonify({"error": "User email is required"}), 400

    if not subject.strip():
        return jsonify({"error": "Subject is required"}), 400

    try:
        # Check for existing active session first
        active_session = get_active_session(user_email)
        if active_session:
            # Return the existing session instead of creating a new one

            result = {
                "success": True,
                "session_id": active_session['session_id'],
                "mode": active_session['mode'],
                "subject": active_session['subject'],
                "message": f"Welcome back to your {active_session['mode']} session about {active_session['subject']}",
                "timestamp": datetime.utcnow().isoformat(),
                "is_resumed": True  # Flag to indicate this is a resumed session
            }

            # The frontend will handle restoring chat history
            return jsonify(result)

        # Generate a unique session ID with timestamp
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        session_id = f"tutor_{mode}_{subject.replace(' ', '_')}_{timestamp}"

        # Create context for Gemini AI welcome message
        welcome_context = {
            "mode": mode,
            "subject": subject,
            "session_id": session_id,
            "is_welcome": True,
            "is_voice_input": is_voice_input,
            "user_email": user_email
        }

        # Get personalized welcome message
        welcome_prompt = f"Generate a welcoming message for a {mode} session about {subject}"
        welcome_result = get_tutor_response(welcome_prompt, subject)
        welcome_message = welcome_result['response']
        
        if is_voice_input:
            welcome_message = _optimize_for_voice(welcome_message)

        # Save this as the active session
        session_data = {
            "session_id": session_id,
            "mode": mode,
            "subject": subject,
            "started_at": datetime.utcnow()
        }
        save_active_session(user_email, session_data)

        result = {
            "success": True,
            "session_id": session_id,
            "mode": mode,
            "subject": subject,
            "message": welcome_message,
            "user_email": user_email,
            "isVoiceInput": is_voice_input,
            "timestamp": datetime.utcnow().isoformat(),
            "is_resumed": False  # Flag to indicate this is a new session
        }

        return jsonify(result)

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e),
            "message": f"There was an issue starting your {mode} session about {subject}. Please try again.",
            "timestamp": datetime.utcnow().isoformat()
        }), 500


@tutor_bp.route("/api/tutor/session/end", methods=["POST"])
def end_session():
    """End a tutoring session with proper cleanup.

    Expected JSON: {"session_id": "...", "userEmail": "...", "isVoiceInput": bool}
    Returns: { success: bool, session_id: str, timestamp: str }
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    session_id = data.get('session_id')
    user_email = data.get('userEmail')
    is_voice_input = data.get('isVoiceInput', True)  # Default to voice input

    if not session_id:
        return jsonify({"error": "Session ID is required"}), 400

    if not user_email:
        return jsonify({"error": "User email is required for conversation tracking"}), 400

    try:

        # End the active session in MongoDB
        end_active_session(user_email)

        # Simply end the session without generating a goodbye message
        result = {
            "success": True,
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat()
        }

        return jsonify(result)

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 200  # Return 200 with error message so the frontend can still proceed


@tutor_bp.route("/api/tutor/voice/toggle", methods=["POST"])
def toggle_voice():
    """Toggle voice output on/off with immediate feedback.

    Expected JSON: {"enabled": bool, "session_id": "...", "userEmail": "...", "isVoiceInput": bool}
    Returns: { success: bool, voice_enabled: bool, message: str }
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    enabled = data.get('enabled', False)
    session_id = data.get('session_id')
    user_email = data.get('userEmail')
    # Set is_voice_input to match enabled state for appropriate response
    is_voice_input = data.get('isVoiceInput', enabled)

    if not session_id:
        return jsonify({"error": "Session ID is required"}), 400

    if not user_email:
        return jsonify({"error": "User email is required for conversation tracking"}), 400

    try:

        # Extract session mode from session ID
        session_parts = session_id.split('_')
        mode = session_parts[1] if len(session_parts) > 1 else 'tutor'

        # Create context for Gemini AI voice toggle message
        voice_context = {
            "mode": mode,
            "session_id": session_id,
            "voice_enabled": enabled,
            "is_voice_input": is_voice_input,
            "user_email": user_email
        }

        # Prepare a response that works well for both text and voice
        voice_prompt = f"Generate a brief message indicating that voice output is {'enabled' if enabled else 'disabled'}"
        voice_result = get_tutor_response(voice_prompt)
        voice_message = voice_result['response']
        
        if enabled:
            voice_message = _optimize_for_voice(voice_message)

        result = {
            "success": True,
            "voice_enabled": enabled,
            "message": voice_message,
            "session_id": session_id,
            "isVoiceInput": is_voice_input,
            "timestamp": datetime.utcnow().isoformat()
        }

        return jsonify(result)

    except Exception as e:

        # Simple fallback message that works for both voice and text
        fallback_message = f"Voice output has been {'enabled' if enabled else 'disabled'}."

        return jsonify({
            "success": True,  # Return success even if there was an error with the AI
            "voice_enabled": enabled,
            "message": fallback_message,
            "error": str(e),
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat()
        })


@tutor_bp.route("/api/tutor/session/active", methods=["GET"])
def check_active_session():
    """Check if a user has an active tutoring session.

    Query params: userEmail
    Returns: { success: bool, has_active_session: bool, session_data: object (if active) }
    """
    user_email = request.args.get('userEmail')

    if not user_email:
        return jsonify({"error": "User email is required"}), 400

    try:

        # Check if the user has an active session (uses in-memory fallback when DB is unavailable)
        active_session = get_active_session(user_email)

        if active_session:

            # Convert ObjectId to string for JSON serialization
            if '_id' in active_session:
                active_session['_id'] = str(active_session['_id'])

            return jsonify({
                "success": True,
                "has_active_session": True,
                "session_data": active_session,
                "timestamp": datetime.utcnow().isoformat()
            })
        else:

            return jsonify({
                "success": True,
                "has_active_session": False,
                "timestamp": datetime.utcnow().isoformat()
            })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e),
            "has_active_session": False,
            "timestamp": datetime.utcnow().isoformat()
        }), 500


@tutor_bp.route("/api/tutor/chat/history", methods=["GET"])
def get_chat_history_endpoint():
    """Get chat history for a user with pagination and filtering.

    Query params: userEmail, limit (optional), offset (optional), sessionId (optional)
    Returns: { success: bool, messages: list, count: int, total: int }
    """
    user_email = request.args.get('userEmail')
    session_id = request.args.get('sessionId')  # Filter by session

    try:
        limit = int(request.args.get('limit', 50))  # Default to 50 messages
        # Default to starting from beginning
        offset = int(request.args.get('offset', 0))
    except ValueError:
        limit = 50
        offset = 0

    if not user_email:
        return jsonify({"error": "User email is required"}), 400

    try:
        # Get chat history for the specific session
        messages = get_chat_history(user_email, limit + offset, session_id)

        # Get total count for pagination info
        total_messages = len(messages)

        # Apply offset and limit
        if offset < total_messages:
            messages = messages[offset:offset + limit]
        else:
            messages = []

        result = {
            "success": True,
            "messages": messages,
            "count": len(messages),
            "total": total_messages,
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat()
        }

        return jsonify(result)

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e),
            "messages": [],
            "count": 0,
            "timestamp": datetime.utcnow().isoformat()
        }), 500


@tutor_bp.route("/api/tutor/chat/clear", methods=["POST"])
def clear_chat_history_endpoint():
    """Clear chat history for a user with confirmation.

    Expected JSON: {"userEmail": "...", "confirm": bool, "sessionId": "..." (optional)}
    Returns: { success: bool, message: str }
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    user_email = data.get('userEmail')
    confirm = data.get('confirm', False)  # Require explicit confirmation
    # Optional - if provided, only clear that session
    session_id = data.get('sessionId')

    if not user_email:
        return jsonify({"error": "User email is required"}), 400

    if not confirm:
        return jsonify({"error": "Confirmation is required to clear chat history"}), 400

    try:
        # Clear chat history for specific session or all sessions
        success = clear_chat_history(user_email, session_id)

        if success:
            session_msg = f"for session {session_id}" if session_id else "for all sessions"
            result = {
                "success": True,
                "message": f"Chat history cleared successfully {session_msg}",
                "session_id": session_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            return jsonify(result)
        else:
            return jsonify({
                "success": False,
                "error": "Failed to clear chat history. No records found or database error.",
                "timestamp": datetime.utcnow().isoformat()
            }), 404

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e),
            "message": "An error occurred while clearing chat history",
            "timestamp": datetime.utcnow().isoformat()
        }), 500


@tutor_bp.route("/api/tutor/voice/connection", methods=["GET"])
def check_voice_connection():
    """Check if voice services are available and working.

    Returns: { success: bool, status: str, timestamp: str }
    """
    try:
        # Check if we can initialize AI
        ai_initialized = initialize_ai()

        if ai_initialized:
            # Try to generate a simple test response
            test_result = get_tutor_response("Test connection")

            if test_result['success']:
                status = "Voice services are working properly"
                return jsonify({
                    "success": True,
                    "status": status,
                    "timestamp": datetime.utcnow().isoformat()
                })
            else:
                status = "Voice services are partially available (AI initialization OK, but response generation failed)"
        else:
            status = "Voice services are unavailable (AI initialization failed)"

        return jsonify({
            "success": False,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }), 503  # Service Unavailable

    except Exception as e:

        return jsonify({
            "success": False,
            "status": f"Error connecting to voice services: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }), 500


@tutor_bp.route("/api/tutor/voice/optimize", methods=["POST"])
def optimize_for_voice_output():
    """Optimize existing text for voice output.

    Expected JSON: {"text": "...", "userEmail": optional}
    Returns: { success: bool, optimized_text: str }
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    text = data.get('text', '').strip()
    user_email = data.get('userEmail')  # Optional

    if not text:
        return jsonify({"error": "Text is required"}), 400

    try:
        # Optimize the text
        optimized_text = _optimize_for_voice(text)

        # Log the optimization if user_email is provided
        if user_email:
            save_chat_message(
                user_email,
                "Optimized text for voice output",
                optimized_text
            )

        return jsonify({
            "success": True,
            "original_text": text,
            "optimized_text": optimized_text,
            "timestamp": datetime.utcnow().isoformat()
        })

    except Exception as e:

        # If optimization fails, return the original text
        return jsonify({
            "success": False,
            "error": str(e),
            "original_text": text,
            "optimized_text": text,  # Return original as fallback
            "timestamp": datetime.utcnow().isoformat()
        }), 200  # Return 200 so frontend can still use the original text


@tutor_bp.route("/api/tutor/health", methods=["GET"])
def health_check():
    """Health check endpoint for the tutor service.

    Returns: { status: str, timestamp: str }
    """
    try:
        # Simple check if we can access the AI utils
        ai_status = "connected" if initialize_ai() else "error"

        return jsonify({
            "status": "healthy",
            "ai_service": ai_status,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500
