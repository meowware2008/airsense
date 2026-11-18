from unittest.mock import patch, MagicMock
from backend.app.services.pinger_service import (
    resolve_ping_urls,
    ping_target,
    ping_all_targets,
    get_pinger_status,
)


def test_resolve_ping_urls_explicit(monkeypatch):
    monkeypatch.setenv("PING_URLS", "https://site-a.com, https://site-b.com/health")
    monkeypatch.delenv("RENDER_EXTERNAL_URL", raising=False)
    monkeypatch.delenv("FRONTEND_URL", raising=False)

    urls = resolve_ping_urls()
    assert "https://site-a.com" in urls
    assert "https://site-b.com/health" in urls
    assert len(urls) == 2


def test_resolve_ping_urls_render_auto(monkeypatch):
    monkeypatch.delenv("PING_URLS", raising=False)
    monkeypatch.delenv("SELF_PING_URLS", raising=False)
    monkeypatch.setenv("RENDER_EXTERNAL_URL", "https://airsense-backend.onrender.com")
    monkeypatch.setenv("FRONTEND_URL", "https://airsense-frontend.onrender.com")

    urls = resolve_ping_urls()
    assert "https://airsense-backend.onrender.com/api/v1/health/live" in urls
    assert "https://airsense-frontend.onrender.com" in urls


def test_ping_target_success():
    mock_resp = MagicMock()
    mock_resp.status_code = 200

    with patch("backend.app.services.pinger_service.requests.get", return_value=mock_resp) as mock_get:
        result = ping_target("https://example.com/health")
        assert result["success"] is True
        assert result["status_code"] == 200
        assert result["error"] is None
        assert result["latency_seconds"] >= 0
        mock_get.assert_called_once()


def test_ping_target_failure():
    with patch("backend.app.services.pinger_service.requests.get", side_effect=Exception("Connection timed out")):
        result = ping_target("https://unreachable-example.com")
        assert result["success"] is False
        assert result["status_code"] is None
        assert "Connection timed out" in result["error"]


def test_ping_all_targets(monkeypatch):
    monkeypatch.setenv("PING_URLS", "https://test1.com, https://test2.com")

    mock_resp = MagicMock()
    mock_resp.status_code = 200

    with patch("backend.app.services.pinger_service.requests.get", return_value=mock_resp):
        summary = ping_all_targets()
        assert summary["total_targets"] == 2
        assert summary["successful"] == 2
        assert summary["failed"] == 0
        assert len(summary["results"]) == 2


def test_health_ping_endpoint_get(client):
    res = client.get("/api/v1/health/ping")
    assert res.status_code == 200
    data = res.get_json()
    assert "status" in data
    assert "targets" in data
    assert "interval_minutes" in data


def test_health_ping_endpoint_post(client, monkeypatch):
    monkeypatch.setenv("PING_URLS", "https://test-live.com")

    mock_resp = MagicMock()
    mock_resp.status_code = 200

    with patch("backend.app.services.pinger_service.requests.get", return_value=mock_resp):
        res = client.post("/api/v1/health/ping")
        assert res.status_code == 200
        data = res.get_json()
        assert data["total_targets"] >= 1
        assert data["successful"] >= 1
        assert data["failed"] == 0
