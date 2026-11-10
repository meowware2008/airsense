import pytest
from datetime import datetime
from backend.app.database import db_session
from backend.app.models import AirQualityReading, AlertPreference, Notification
from backend.app.services.alert_service import AlertService


def test_alert_crud(client, auth_token, test_location):
    headers = {"Authorization": f"Bearer {auth_token}"}

    # Create Alert
    res = client.post("/api/v1/alerts", headers=headers, json={
        "location_id": test_location.id,
        "threshold_value": 150.0,
        "enabled": True,
    })
    assert res.status_code == 201
    alert_id = res.get_json()["alert"]["id"]

    # List Alerts
    res = client.get("/api/v1/alerts", headers=headers)
    assert res.status_code == 200
    assert len(res.get_json()["alerts"]) == 1

    # Update Alert
    res = client.patch(f"/api/v1/alerts/{alert_id}", headers=headers, json={
        "threshold_value": 200.0,
    })
    assert res.status_code == 200
    assert res.get_json()["alert"]["threshold_value"] == 200.0

    # Delete Alert
    res = client.delete(f"/api/v1/alerts/{alert_id}", headers=headers)
    assert res.status_code == 200

    # Verify Deletion
    res = client.get("/api/v1/alerts", headers=headers)
    assert len(res.get_json()["alerts"]) == 0


def test_alert_evaluation_and_cooldown(test_user, test_location, client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}

    # Setup alert preference: threshold = 100
    pref = AlertPreference(
        user_id=test_user.id,
        location_id=test_location.id,
        threshold_value=100.0,
        enabled=True,
    )
    db_session.add(pref)
    db_session.commit()

    # Reading 1: AQI 150 (Crosses threshold)
    reading1 = AirQualityReading(
        location_id=test_location.id,
        provider="mock",
        measurement_type="simulated",
        aqi_value=150.0,
        aqi_standard="IN_CPCB",
        pm25=75.0,
        observed_at=datetime.utcnow(),
    )
    db_session.add(reading1)
    db_session.commit()

    notifs1 = AlertService.evaluate_reading(reading1)
    assert len(notifs1) == 1
    assert notifs1[0].user_id == test_user.id
    assert notifs1[0].channel == "in_app"

    # Reading 2: AQI 180 within cooldown period (Should be suppressed)
    reading2 = AirQualityReading(
        location_id=test_location.id,
        provider="mock",
        measurement_type="simulated",
        aqi_value=180.0,
        aqi_standard="IN_CPCB",
        pm25=90.0,
        observed_at=datetime.utcnow(),
    )
    db_session.add(reading2)
    db_session.commit()

    notifs2 = AlertService.evaluate_reading(reading2)
    assert len(notifs2) == 0  # Cooldown suppressed repeat alert

    # Check notification history API
    res = client.get("/api/v1/notifications", headers=headers)
    assert res.status_code == 200
    notifs_api = res.get_json()["notifications"]
    assert len(notifs_api) == 1
    assert notifs_api[0]["status"] == "unread"

    # Mark as read
    notif_id = notifs_api[0]["id"]
    res = client.patch(f"/api/v1/notifications/{notif_id}/read", headers=headers)
    assert res.status_code == 200
    assert res.get_json()["notification"]["status"] == "read"
