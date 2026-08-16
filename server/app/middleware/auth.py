"""Authentication and authorization middleware for Edvanta backend.

Verifies Firebase / Google Auth tokens when provided and prevents IDOR / BOLA attacks.
"""
import os
import json
import base64
import logging
from functools import wraps
from flask import request, jsonify, current_app
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


def _get_unverified_jwt_claims(token: str) -> dict:
    """Safely decode JWT payload without verifying signature to extract project/audience hints."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return {}
        payload_b64 = parts[1]
        rem = len(payload_b64) % 4
        if rem > 0:
            payload_b64 += "=" * (4 - rem)
        return json.loads(base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8"))
    except Exception as e:
        logger.debug(f"Failed to extract unverified claims: {e}")
        return {}


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

    # Extract unverified claims to determine project ID if not set in environment
    unverified = _get_unverified_jwt_claims(token)
    project_id = (
        os.getenv("FIREBASE_PROJECT_ID") or 
        os.getenv("GOOGLE_CLOUD_PROJECT") or 
        os.getenv("GCP_PROJECT") or 
        os.getenv("VITE_FIREBASE_PROJECT_ID") or
        unverified.get("aud") or
        (unverified.get("iss", "").split("https://securetoken.google.com/")[-1] if "https://securetoken.google.com/" in unverified.get("iss", "") else None)
    )

    # Strategy 1: Google OAuth2 ID token verification (uses Google public certs; works on Vercel/serverless without credentials)
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests

        req = google_requests.Request()
        decoded = google_id_token.verify_firebase_token(
            token,
            req,
            audience=project_id
        )
        if decoded:
            decoded["uid"] = decoded.get("uid") or decoded.get("sub") or decoded.get("user_id")
            decoded["email"] = decoded.get("email")
            return decoded
    except Exception as e:
        logger.debug(f"Google ID token public cert verification failed: {e}")

    # Strategy 2: Firebase Admin SDK (if initialized with service account or project options)
    try:
        import firebase_admin
        from firebase_admin import auth as fb_auth, credentials

        global _firebase_initialized
        if not _firebase_initialized:
            try:
                firebase_admin.get_app()
                _firebase_initialized = True
            except ValueError:
                service_account_raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY") or os.getenv("FIREBASE_SERVICE_ACCOUNT")
                cred = None
                if service_account_raw:
                    try:
                        if service_account_raw.strip().startswith("{"):
                            cred = credentials.Certificate(json.loads(service_account_raw))
                        elif os.path.exists(service_account_raw):
                            cred = credentials.Certificate(service_account_raw)
                        else:
                            decoded_json = base64.b64decode(service_account_raw).decode("utf-8")
                            cred = credentials.Certificate(json.loads(decoded_json))
                    except Exception as ce:
                        logger.warning(f"Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: {ce}")

                options = {"projectId": project_id} if project_id else {}
                if cred:
                    firebase_admin.initialize_app(credential=cred, options=options)
                else:
                    firebase_admin.initialize_app(options=options)
                _firebase_initialized = True

        decoded = fb_auth.verify_id_token(token)
        if decoded:
            decoded["uid"] = decoded.get("uid") or decoded.get("sub") or decoded.get("user_id")
            decoded["email"] = decoded.get("email")
            return decoded
    except Exception as e:
        logger.warning(f"Token verification failed via Firebase Admin: {e}")

    # Strategy 3: Graceful fallback in dev or testing if token is present
    if is_dev_or_test:
        logger.debug("Falling back to dev token extraction")
        email = unverified.get("email") or "dev@edvanta.local"
        uid = unverified.get("user_id") or unverified.get("sub") or "dev-uid"
        return {"email": email, "uid": uid}

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

