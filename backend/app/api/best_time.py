from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from backend.app.database import db_session
from backend.app.models import Location, AirQualityReading
from backend.app.services.ingestion_service import IngestionService
from backend.app.services.best_time_service import find_best_time_window
from ml.src.predict import predict_next_24h

best_time_bp = Blueprint(
    "best_time",
    __name__,
    url_prefix="/api/v1/best-time"
)


@best_time_bp.route("", methods=["GET"])
def get_best_time():
    location_id = request.args.get("location_id", type=int)

    if not location_id:
        return jsonify({
            "error": "location_id query parameter is required"
        }), 400

    window_hours = request.args.get("window_hours", default=3, type=int)
    if not window_hours or window_hours < 1 or window_hours > 12:
        window_hours = 3

    location = (
        db_session.query(Location)
        .filter(Location.id == location_id)
        .first()
    )

    if not location:
        return jsonify({
            "error": "Location not found"
        }), 404

    cutoff = datetime.utcnow() - timedelta(hours=48)
    readings = (
        db_session.query(AirQualityReading)
        .filter(
            AirQualityReading.location_id == location_id,
            AirQualityReading.observed_at >= cutoff,
            AirQualityReading.pm25.isnot(None),
        )
        .order_by(AirQualityReading.observed_at.asc())
        .all()
    )

    if len(readings) < 24:
        ingestion = IngestionService()
        ingestion.ingest_history(location, past_days=3)
        readings = (
            db_session.query(AirQualityReading)
            .filter(
                AirQualityReading.location_id == location_id,
                AirQualityReading.observed_at >= cutoff,
                AirQualityReading.pm25.isnot(None),
            )
            .order_by(AirQualityReading.observed_at.asc())
            .all()
        )

    reading_dicts = [
        {
            "observed_at": r.observed_at.isoformat(),
            "pm25": r.pm25
        }
        for r in readings
        if r.pm25 is not None
    ]

    forecast_result = predict_next_24h(reading_dicts)

    if forecast_result.get("status") != "available":
        return jsonify({
            "status": "unavailable",
            "message": "Unable to calculate best outdoor window because forecasts are unavailable.",
            "forecast_status": forecast_result.get("status"),
            "best_window": None,
        }), 200

    recommendation = find_best_time_window(
        forecast_result.get("forecasts", []),
        window_hours=window_hours
    )

    return jsonify({
        "status": "available",
        "location": location.to_dict(),
        "model_name": forecast_result.get("model_name"),
        "model_version": forecast_result.get("model_version"),
        "evaluation_summary": forecast_result.get("evaluation_summary"),
        "best_window": recommendation.get("best_window"),
    }), 200
