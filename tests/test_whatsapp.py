from datetime import datetime
from unittest.mock import patch

from backend.app.config import Config
from backend.app.database import db_session
from backend.app.models import AirQualityReading, AlertPreference, Notification, User
from backend.app.services.alert_service import AlertService
from backend.app.services.whatsapp_service import (
    is_valid_whatsapp_number,
    format_whatsapp_address,
    send_whatsapp_with_details,
    send_whatsapp,
)


def _reading(location_id, aqi):
    r = AirQualityReading(
        location_id=location_id,
        provider="mock",
        measurement_type="simulated",
        aqi_value=aqi,
        aqi_standard="IN_CPCB",
        observed_at=datetime.utcnow(),
    )
    db_session.add(r)
    db_session.commit()
    return r


def test_number_validation():
    assert is_valid_whatsapp_number("+919876543210")
    assert not is_valid_whatsapp_number("9876543210")
    assert not is_valid_whatsapp_number("+91 98765")
    assert not is_valid_whatsapp_number("")


def test_format_whatsapp_address():
    assert format_whatsapp_address("+919494202261") == "whatsapp:+919494202261"
    assert format_whatsapp_address("whatsapp:+17372508034") == "whatsapp:+17372508034"
    assert format_whatsapp_address("+1 737 250 8034") == "whatsapp:+17372508034"
    assert format_whatsapp_address("17372508034") == "whatsapp:+17372508034"
    assert format_whatsapp_address("") == ""


def test_send_whatsapp_with_details_unconfigured(monkeypatch):
    monkeypatch.setattr(Config, "TWILIO_ACCOUNT_SID", "")
    monkeypatch.setattr(Config, "TWILIO_AUTH_TOKEN", "")
    res = send_whatsapp_with_details("+919494202261", "test")
    assert res["success"] is False
    assert "not configured" in res["error_message"]


def test_send_whatsapp_with_details_invalid_number(monkeypatch):
    monkeypatch.setattr(Config, "TWILIO_ACCOUNT_SID", "ACtest")
    monkeypatch.setattr(Config, "TWILIO_AUTH_TOKEN", "token")
    res = send_whatsapp_with_details("invalid", "test")
    assert res["success"] is False
    assert "Invalid WhatsApp number" in res["error_message"]


def test_save_number_and_enable_whatsapp(client, auth_token, test_location):
    headers = {"Authorization": f"Bearer {auth_token}"}

    # Cannot enable WhatsApp before a number is saved
    res = client.post("/api/v1/alerts", headers=headers, json={
        "location_id": test_location.id, "threshold_value": 150, "whatsapp_enabled": True,
    })
    assert res.status_code == 400

    # Invalid number rejected
    res = client.put("/api/v1/auth/me/whatsapp", headers=headers, json={"whatsapp_number": "12345"})
    assert res.status_code == 400

    res = client.put("/api/v1/auth/me/whatsapp", headers=headers, json={"whatsapp_number": "+919876543210"})
    assert res.status_code == 200
    assert res.get_json()["user"]["whatsapp_number"] == "+919876543210"

    res = client.post("/api/v1/alerts", headers=headers, json={
        "location_id": test_location.id, "threshold_value": 150, "whatsapp_enabled": True,
    })
    assert res.status_code == 201
    assert res.get_json()["alert"]["whatsapp_enabled"] is True


def test_whatsapp_sent_when_aqi_is_bad(test_user, test_location, monkeypatch):
    monkeypatch.setattr(Config, "TWILIO_ACCOUNT_SID", "ACtest")
    monkeypatch.setattr(Config, "TWILIO_AUTH_TOKEN", "token")
    monkeypatch.setattr(Config, "WHATSAPP_MIN_AQI", 200)

    user = db_session.get(User, test_user.id)
    user.whatsapp_number = "+919876543210"
    db_session.add(AlertPreference(
        user_id=user.id, location_id=test_location.id,
        threshold_value=100.0, enabled=True, whatsapp_enabled=True,
    ))
    db_session.commit()

    with patch("backend.app.services.alert_service.send_whatsapp", return_value=True) as mock_send:
        AlertService.evaluate_reading(_reading(test_location.id, 320.0))

    mock_send.assert_called_once()
    assert mock_send.call_args[0][0] == "+919876543210"
    wa = db_session.query(Notification).filter(Notification.channel == "whatsapp").all()
    assert len(wa) == 1 and wa[0].status == "sent"


def test_whatsapp_not_sent_below_min_aqi_or_when_opted_out(test_user, test_location, monkeypatch):
    monkeypatch.setattr(Config, "TWILIO_ACCOUNT_SID", "ACtest")
    monkeypatch.setattr(Config, "TWILIO_AUTH_TOKEN", "token")
    monkeypatch.setattr(Config, "WHATSAPP_MIN_AQI", 200)

    user = db_session.get(User, test_user.id)
    user.whatsapp_number = "+919876543210"
    pref = AlertPreference(
        user_id=user.id, location_id=test_location.id,
        threshold_value=100.0, enabled=True, whatsapp_enabled=True,
    )
    db_session.add(pref)
    db_session.commit()

    # AQI 150 crosses the threshold but is below WHATSAPP_MIN_AQI (200)
    with patch("backend.app.services.alert_service.send_whatsapp") as mock_send:
        AlertService.evaluate_reading(_reading(test_location.id, 150.0))
    mock_send.assert_not_called()

    # Opted out of WhatsApp: no message even at AQI 400
    db_session.query(Notification).delete()
    pref.whatsapp_enabled = False
    db_session.commit()
    with patch("backend.app.services.alert_service.send_whatsapp") as mock_send:
        AlertService.evaluate_reading(_reading(test_location.id, 400.0))
    mock_send.assert_not_called()
