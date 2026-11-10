import pytest


def test_liveness(client):
    res = client.get("/api/v1/health/live")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "live"


def test_readiness(client):
    res = client.get("/api/v1/health/ready")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ready"
    assert data["database"] == "connected"


def test_metrics_endpoint(client):
    res = client.get("/metrics")
    assert res.status_code == 200
    assert b"airsense_http_requests_total" in res.data or b"process_virtual_memory_bytes" in res.data
