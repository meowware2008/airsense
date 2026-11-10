from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from backend.app.database import db_session
from backend.app.models import Location, AirQualityReading
from backend.app.services.ingestion_service import IngestionService
from backend.app.services.aqi_calculator import get_aqi_category

air_quality_bp = Blueprint("air_quality", __name__, url_prefix="/api/v1/air-quality")

STALE_DATA_THRESHOLD_HOURS = 3


@air_quality_bp.route("/current", methods=["GET"])
def get_current_air_quality():
    location_id = request.args.get("location_id", type=int)
    if not location_id:
        return jsonify({"error": "location_id query parameter is required"}), 400

    location = db_session.query(Location).filter(Location.id == location_id).first()
    if not location:
        return jsonify({"error": "Location not found"}), 404

    # Query latest reading
    latest = (
        db_session.query(AirQualityReading)
        .filter(AirQualityReading.location_id == location_id)
        .order_by(AirQualityReading.observed_at.desc())
        .first()
    )

    # If no reading exists, trigger on-demand ingestion
    if not latest:
        ingestion = IngestionService()
        ingestion.ingest_location(location)
        latest = (
            db_session.query(AirQualityReading)
            .filter(AirQualityReading.location_id == location_id)
            .order_by(AirQualityReading.observed_at.desc())
            .first()
        )

    if not latest:
        return jsonify({
            "location": location.to_dict(),
            "reading": None,
            "status": "unavailable",
            "message": "No air quality measurements currently available for this location.",
        }), 200

    now = datetime.utcnow()
    is_stale = (now - latest.observed_at) > timedelta(hours=STALE_DATA_THRESHOLD_HOURS)

    aqi_category = None
    aqi_color = None
    aqi_label = None
    if latest.aqi_value is not None:
        aqi_category, aqi_color, aqi_label = get_aqi_category(int(latest.aqi_value))

    return jsonify({
        "location": location.to_dict(),
        "reading": latest.to_dict(),
        "aqi_summary": {
            "value": latest.aqi_value,
            "standard": latest.aqi_standard,
            "category": aqi_category,
            "color": aqi_color,
            "label": aqi_label,
        },
        "freshness": {
            "is_stale": is_stale,
            "observation_age_hours": round((now - latest.observed_at).total_seconds() / 3600.0, 1),
            "observed_at": latest.observed_at.isoformat(),
            "last_successful_update": latest.ingested_at.isoformat(),
        },
        "provenance": {
            "provider": latest.provider,
            "measurement_type": latest.measurement_type,
            "source_record_id": latest.source_record_id,
        },
    }), 200


@air_quality_bp.route("/history", methods=["GET"])
def get_historical_air_quality():
    location_id = request.args.get("location_id", type=int)
    days = request.args.get("days", default=7, type=int)

    if not location_id:
        return jsonify({"error": "location_id query parameter is required"}), 400

    location = db_session.query(Location).filter(Location.id == location_id).first()
    if not location:
        return jsonify({"error": "Location not found"}), 404

    days = min(max(1, days), 30)  # Bound history request between 1 and 30 days
    cutoff = datetime.utcnow() - timedelta(days=days)

    readings = (
        db_session.query(AirQualityReading)
        .filter(
            AirQualityReading.location_id == location_id,
            AirQualityReading.observed_at >= cutoff,
        )
        .order_by(AirQualityReading.observed_at.asc())
        .all()
    )

    # If insufficient history exists in database, fetch historical data from provider
    if len(readings) < 12:
        ingestion = IngestionService()
        ingestion.ingest_history(location, past_days=days)
        readings = (
            db_session.query(AirQualityReading)
            .filter(
                AirQualityReading.location_id == location_id,
                AirQualityReading.observed_at >= cutoff,
            )
            .order_by(AirQualityReading.observed_at.asc())
            .all()
        )

    series = []
    for r in readings:
        series.append({
            "timestamp": r.observed_at.isoformat(),
            "aqi": r.aqi_value,
            "pm25": r.pm25,
            "pm10": r.pm10,
            "no2": r.no2,
            "so2": r.so2,
            "co": r.co,
            "o3": r.o3,
            "temperature": r.temperature,
            "humidity": r.humidity,
            "wind_speed": r.wind_speed,
            "measurement_type": r.measurement_type,
            "aqi_standard": r.aqi_standard,
        })

    return jsonify({
        "location": location.to_dict(),
        "query_window_days": days,
        "count": len(series),
        "series": series,
    }), 200
