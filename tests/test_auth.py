import pytest


def test_register_success(client):
    res = client.post("/api/v1/auth/register", json={
        "name": "Jane Doe",
        "email": "jane@example.com",
        "password": "strongpassword123",
    })
    assert res.status_code == 201
    data = res.get_json()
    assert "token" in data
    assert data["user"]["email"] == "jane@example.com"


def test_register_duplicate_email(client, test_user):
    res = client.post("/api/v1/auth/register", json={
        "name": "Another User",
        "email": "citizen@example.com",
        "password": "password123",
    })
    assert res.status_code == 409
    assert "already registered" in res.get_json()["error"]


def test_register_validation(client):
    # Short password
    res = client.post("/api/v1/auth/register", json={
        "name": "Short",
        "email": "short@example.com",
        "password": "123",
    })
    assert res.status_code == 400

    # Missing field
    res = client.post("/api/v1/auth/register", json={
        "name": "Missing",
        "password": "password123",
    })
    assert res.status_code == 400


def test_login_success(client, test_user):
    res = client.post("/api/v1/auth/login", json={
        "email": "citizen@example.com",
        "password": "securepass123",
    })
    assert res.status_code == 200
    assert "token" in res.get_json()


def test_login_wrong_password(client, test_user):
    res = client.post("/api/v1/auth/login", json={
        "email": "citizen@example.com",
        "password": "wrongpassword",
    })
    assert res.status_code == 401


def test_me_endpoint(client, auth_token):
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {auth_token}"})
    assert res.status_code == 200
    assert res.get_json()["user"]["email"] == "citizen@example.com"


def test_me_unauthorized(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
