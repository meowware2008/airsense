from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from backend.app.services.best_time_service import find_best_time_window
from backend.app.database import db_session, _ensure_schema_columns
from backend.app.models import AirQualityReading


def test_find_best_time_window_selects_lowest_average():
    base = datetime.now(timezone.utc) + timedelta(hours=1)
    # 6 hours of forecasts with varying PM2.5 values
    forecasts = [
        {"forecast_for": (base + timedelta(hours=0)).isoformat(), "predicted_value": 85.0},
        {"forecast_for": (base + timedelta(hours=1)).isoformat(), "predicted_value": 90.0},
        {"forecast_for": (base + timedelta(hours=2)).isoformat(), "predicted_value": 95.0},
        {"forecast_for": (base + timedelta(hours=3)).isoformat(), "predicted_value": 25.0},
        {"forecast_for": (base + timedelta(hours=4)).isoformat(), "predicted_value": 20.0},
        {"forecast_for": (base + timedelta(hours=5)).isoformat(), "predicted_value": 22.0},
    ]

    res = find_best_time_window(forecasts, window_hours=3)
    assert res["status"] == "available"
    window = res["best_window"]
    assert window is not None
    assert window["duration_hours"] == 3
    # Hours 3, 4, 5 average is (25+20+22)/3 = 22.33
    assert window["average_pm25"] == 22.33
    assert window["maximum_pm25"] == 25.0


def test_find_best_time_window_insufficient_data():
    forecasts = [
        {"forecast_for": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(), "predicted_value": 45.0}
    ]
    res = find_best_time_window(forecasts, window_hours=3)
    assert res["status"] == "unavailable"
    assert res["best_window"] is None


def test_get_best_time_api(client, test_location):
    # Seed 30 hourly readings for test_location so prediction has sufficient lags
    base = datetime.utcnow() - timedelta(hours=30)
    for i in range(30):
        r = AirQualityReading(
            location_id=test_location.id,
            provider="mock",
            measurement_type="simulated",
            observed_at=base + timedelta(hours=i),
            pm25=30.0 + (i % 5),
            aqi_value=60,
        )
        db_session.add(r)
    db_session.commit()

    res = client.get(f"/api/v1/best-time?location_id={test_location.id}")
    assert res.status_code == 200
    data = res.get_json()
    assert "status" in data
    assert "location" in data


def test_send_best_time_whatsapp_unauthorized(client, test_location):
    res = client.post(f"/api/v1/best-time/send-whatsapp?location_id={test_location.id}")
    assert res.status_code == 401


def test_send_best_time_whatsapp_success(client, auth_token, test_location):
    # Seed readings
    base = datetime.utcnow() - timedelta(hours=30)
    for i in range(30):
        r = AirQualityReading(
            location_id=test_location.id,
            provider="mock",
            measurement_type="simulated",
            observed_at=base + timedelta(hours=i),
            pm25=25.0 + (i % 4),
            aqi_value=50,
        )
        db_session.add(r)
    db_session.commit()

    headers = {"Authorization": f"Bearer {auth_token}"}
    now_ref = datetime.now(timezone.utc)
    mock_forecast_result = {
        "status": "available",
        "model_name": "RandomForestRegressor",
        "model_version": "1.0.0",
        "forecasts": [
            {
                "forecast_for": (now_ref + timedelta(hours=h)).isoformat(),
                "predicted_value": 20.0 + (h % 3),
                "target_metric": "pm25",
                "unit": "µg/m³",
            }
            for h in range(1, 25)
        ],
    }

    with patch("backend.app.api.best_time.predict_next_24h", return_value=mock_forecast_result), \
         patch("backend.app.api.best_time.send_whatsapp", return_value=True) as mock_send:
        res = client.post(
            "/api/v1/best-time/send-whatsapp",
            headers=headers,
            json={"location_id": test_location.id, "whatsapp_number": "+919876543210"},
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data["success"] is True
        assert data["recipient"] == "+919876543210"
        assert "AirSense Smart Outdoor Recommendation" in data["formatted_text"]
        mock_send.assert_called_once()


def test_schema_self_healing_idempotent():
    # Calling self-healing migration repeatedly must never crash
    _ensure_schema_columns()
    _ensure_schema_columns()
