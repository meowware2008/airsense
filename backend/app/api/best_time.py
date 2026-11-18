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

    location = (
        db_session.query(Location)
        .filter(Location.id == location_id)
        .first()
    )

    if not location:
        return jsonify({"error": "Location not found"}), 404

    # Fetch recent readings from the last 48 hours.
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

    # Ingest historical data if fewer than 24 readings are available.
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
            "observed_at": reading.observed_at.isoformat(),
            "pm25": reading.pm25,
        }
        for reading in readings
    ]

    # Generate hourly PM2.5 predictions.
    forecast_result = predict_next_24h(reading_dicts)

    if forecast_result.get("status") != "available":
        return jsonify({
            "location": location.to_dict(),
            "status": "unavailable",
            "message": forecast_result.get(
                "message",
                "Unable to generate forecasts."
            ),
            "best_window": None,
        }), 200

    # Find the best consecutive 3-hour window.
    recommendation = find_best_time_window(
        forecast_result.get("forecasts", []),
        window_hours=3,
    )

    return jsonify({
        "location": location.to_dict(),
        "status": recommendation["status"],
        "message": recommendation["message"],
        "metric": recommendation.get("metric"),
        "unit": recommendation.get("unit"),
        "model_name": forecast_result.get("model_name"),
        "model_version": forecast_result.get("model_version"),
        "evaluation_summary": forecast_result.get("evaluation_summary"),
        "best_window": recommendation.get("best_window"),
    }), 200