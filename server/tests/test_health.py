from app import create_app


def test_health_endpoint_returns_ok():
    app = create_app()
    client = app.test_client()
    response = client.get("/")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "ok"
    assert data["service"] == "edvanta-backend"


def test_runtime_features_endpoint():
    app = create_app()
    client = app.test_client()
    response = client.get("/api/runtime-features")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "ok"
    assert "features" in data
