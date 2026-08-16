"""Tests for Authentication Middleware and IDOR/BOLA Protection."""
import pytest
from app import create_app
from app.middleware.auth import verify_token, verify_user_ownership, _get_unverified_jwt_claims


@pytest.fixture
def app():
    """Create test application."""
    test_app = create_app()
    test_app.config.update({
        "TESTING": True,
        "DEBUG": True,
    })
    return test_app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


def test_verify_token_dev():
    """Verify dev token parsing in test environment."""
    token = "dev-token-alice@example.com"
    payload = verify_token(token)
    assert payload is not None
    assert payload["email"] == "alice@example.com"
    assert payload["uid"] == "uid-alice@example.com"


def test_verify_token_empty():
    """Verify empty token returns None."""
    assert verify_token("") is None
    assert verify_token(None) is None


def test_get_unverified_jwt_claims():
    """Verify decoding of JWT payload without signature verification."""
    import base64
    import json
    header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256"}).encode()).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps({"aud": "edvanta-test", "email": "test@example.com"}).encode()).decode().rstrip("=")
    dummy_jwt = f"{header}.{payload}.signature"
    claims = _get_unverified_jwt_claims(dummy_jwt)
    assert claims.get("aud") == "edvanta-test"
    assert claims.get("email") == "test@example.com"
    assert _get_unverified_jwt_claims("invalid-token") == {}


def test_verify_user_ownership(app):
    """Test user ownership validation logic."""
    with app.test_request_context():
        from flask import request
        # Permissive when no request.user set
        assert verify_user_ownership("bob@example.com") is True

        # When request.user is set
        request.user = {"email": "alice@example.com"}
        assert verify_user_ownership("alice@example.com") is True
        assert verify_user_ownership("ALICE@EXAMPLE.COM") is True
        assert verify_user_ownership("bob@example.com") is False


def test_protected_route_with_dev_token(client):
    """Test accessing protected user-stats with matching dev token."""
    response = client.get(
        "/api/user-stats?user_email=testuser@example.com",
        headers={"Authorization": "Bearer dev-token-testuser@example.com"}
    )
    # Auth passed successfully (not rejected with 401 Unauthorized or 403 Forbidden)
    assert response.status_code not in [401, 403]



def test_idor_rejection_on_mismatched_user(client):
    """Test that requesting another user's stats returns 403 Forbidden."""
    response = client.get(
        "/api/user-stats?user_email=victim@example.com",
        headers={"Authorization": "Bearer dev-token-attacker@example.com"}
    )
    assert response.status_code == 403
    data = response.get_json()
    assert data["code"] == "FORBIDDEN"


def test_chatbot_idor_rejection(client):
    """Test that requesting another user's chat sessions returns 403 Forbidden."""
    response = client.get(
        "/api/chat/loadChat?user_email=victim@example.com",
        headers={"Authorization": "Bearer dev-token-attacker@example.com"}
    )
    assert response.status_code == 403
    data = response.get_json()
    assert data["code"] == "FORBIDDEN"


def test_quizzes_idor_rejection(client):
    """Test that requesting another user's quizzes returns 403 Forbidden."""
    response = client.get(
        "/api/tools/quizzes?user_email=victim@example.com",
        headers={"Authorization": "Bearer dev-token-attacker@example.com"}
    )
    assert response.status_code == 403


def test_roadmap_idor_rejection(client):
    """Test that requesting another user's roadmaps returns 403 Forbidden."""
    response = client.get(
        "/api/roadmap/user?user_email=victim@example.com",
        headers={"Authorization": "Bearer dev-token-attacker@example.com"}
    )
    assert response.status_code == 403


def test_resume_idor_rejection(client):
    """Test that requesting another user's resume history returns 403 Forbidden."""
    response = client.get(
        "/api/resume/history?user_email=victim@example.com",
        headers={"Authorization": "Bearer dev-token-attacker@example.com"}
    )
    assert response.status_code == 403


def test_tutor_idor_rejection(client):
    """Test that requesting another user's tutor session returns 403 Forbidden."""
    response = client.get(
        "/api/tutor/session/active?userEmail=victim@example.com",
        headers={"Authorization": "Bearer dev-token-attacker@example.com"}
    )
    assert response.status_code == 403
