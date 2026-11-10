import pytest


def test_list_and_seed_locations(client):
    res = client.get("/api/v1/locations")
    assert res.status_code == 200
    locations = res.get_json()["locations"]
    assert len(locations) >= 8
    names = [loc["name"] for loc in locations]
    assert "Delhi" in names
    assert "Mumbai" in names


def test_create_location(client):
    res = client.post("/api/v1/locations", json={
        "name": "Jaipur",
        "region": "Rajasthan",
        "country": "India",
        "latitude": 26.9124,
        "longitude": 75.7873,
    })
    assert res.status_code == 201
    assert res.get_json()["location"]["name"] == "Jaipur"


def test_create_location_invalid_coords(client):
    res = client.post("/api/v1/locations", json={
        "name": "Invalid Location",
        "region": "Region",
        "latitude": 150.0,  # Invalid latitude > 90
        "longitude": 75.0,
    })
    assert res.status_code == 400


def test_get_current_air_quality(client, test_location):
    res = client.get(f"/api/v1/air-quality/current?location_id={test_location.id}")
    assert res.status_code == 200
    data = res.get_json()
    assert data["reading"] is not None
    assert "freshness" in data
    assert "provenance" in data
    assert data["provenance"]["measurement_type"] in ("simulated", "modelled", "observed")


def test_get_history_air_quality(client, test_location):
    res = client.get(f"/api/v1/air-quality/history?location_id={test_location.id}&days=2")
    assert res.status_code == 200
    data = res.get_json()
    assert "series" in data
    assert len(data["series"]) > 0


def test_get_forecasts(client, test_location):
    res = client.get(f"/api/v1/forecasts?location_id={test_location.id}")
    assert res.status_code == 200
    data = res.get_json()
    assert "forecasts" in data
    assert data["status"] in ("available", "insufficient_data", "unavailable")

