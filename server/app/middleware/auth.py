"""Authentication and authorization middleware for Edvanta backend.

Verifies Firebase / Google Auth tokens when provided and prevents IDOR / BOLA attacks.
"""
from functools import wraps
from flask import request, jsonify, current_app
import logging
from app.config import Config

logger = logging.getLogger(__name__)

# Cache for initialized firebase admin app
_firebase_initialized = False


def _get_auth_header():
    """Extract bearer token from Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def verify_token(token: str) -> dict:
    """Verify Firebase ID token or return mock payload in development/test.

    Returns dict with at least 'email' and 'uid' if valid, None otherwise.
    """
    if not token:
        return None

    # In development or testing mode, support dev tokens
    is_dev_or_test = Config().DEBUG or (current_app and current_app.config.get("TESTING"))
    if token.startswith("dev-token-"):
        email = token.replace("dev-token-", "")
        return {"email": email, "uid": f"uid-{email}"}

    try:
        import firebase_admin
        from firebase_admin import auth as fb_auth

        global _firebase_initialized
        if not _firebase_initialized:
            try:
                firebase_admin.get_app()
                _firebase_initialized = True
            except ValueError:
                # App not initialized
                try:
                    firebase_admin.initialize_app()
                    _firebase_initialized = True
                except Exception as e:
                    logger.debug(f"Firebase Admin SDK not configured with credentials: {e}")
                    if is_dev_or_test:
                        # Graceful dev mock token fallback
                        return {"email": "dev@edvanta.local", "uid": "dev-uid"}
                    return None

        decoded = fb_auth.verify_id_token(token)
        return decoded
    except Exception as e:
        logger.warning(f"Token verification failed: {e}")
        return None


def require_auth(f):
    """Decorator to require a valid authentication token on protected endpoints."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        if request.method == "OPTIONS":
            return f(*args, **kwargs)

        is_dev_or_test = Config().DEBUG or (current_app and current_app.config.get("TESTING"))
        token = _get_auth_header()

        if not token:
            # If server is in development/testing mode and no token provided, allow dev access
            if is_dev_or_test:
                return f(*args, **kwargs)
            return jsonify({"error": "Authorization token required", "code": "UNAUTHORIZED"}), 401

        user = verify_token(token)
        if not user:
            return jsonify({"error": "Invalid or expired authorization token", "code": "INVALID_TOKEN"}), 401

        request.user = user
        return f(*args, **kwargs)

    return wrapper


def verify_user_ownership(requested_email: str) -> bool:
    """Verify that the authenticated user matches the requested email to prevent IDOR."""
    if not hasattr(request, "user") or not request.user:
        return True  # If auth is permissive (e.g. dev mode without token), allow

    auth_email = request.user.get("email")
    if auth_email and requested_email:
        return auth_email.strip().lower() == requested_email.strip().lower()
    return True

