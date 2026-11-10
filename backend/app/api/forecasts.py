from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from backend.app.database import db_session
from backend.app.models import Location, AirQualityReading, Forecast
from backend.app.services.ingestion_service import IngestionService
from backend.app.monitoring.metrics import FORECAST_GENERATION_TOTAL
from ml.src.predict import predict_next_24h

forecasts_bp = Blueprint("forecasts", __name__, url_prefix="/api/v1/forecasts")


@forecasts_bp.route("", methods=["GET"])
def get_forecasts():
    location_id = request.args.get("location_id", type=int)
    if not location_id:
        return jsonify({"error": "location_id query parameter is required"}), 400

    location = db_session.query(Location).filter(Location.id == location_id).first()
    if not location:
        return jsonify({"error": "Location not found"}), 404

    # Fetch recent readings for this location (last 48 hours)
    cutoff = datetime.utcnow() - timedelta(hours=48)
    readings = (
        db_session.query(AirQualityReading)
        .filter(
            AirQualityReading.location_id == location_id,
            AirQualityReading.observed_at >= cutoff,
        )
        .order_by(AirQualityReading.observed_at.asc())
        .all()
    )

    # Ingest history if insufficient data
    if len(readings) < 24:
        ingestion = IngestionService()
        ingestion.ingest_history(location, past_days=3)
        readings = (
            db_session.query(AirQualityReading)
            .filter(
                AirQualityReading.location_id == location_id,
                AirQualityReading.observed_at >= cutoff,
            )
            .order_by(AirQualityReading.observed_at.asc())
            .all()
        )

    reading_dicts = [
        {"observed_at": r.observed_at.isoformat(), "pm25": r.pm25}
        for r in readings if r.pm25 is not None
    ]

    forecast_result = predict_next_24h(reading_dicts)

    if forecast_result.get("status") == "available":
        FORECAST_GENERATION_TOTAL.labels(status="success").inc()
        # Optionally persist into database
        for f in forecast_result.get("forecasts", []):
            fc = Forecast(
                location_id=location_id,
                model_name=forecast_result.get("model_name", "RandomForestRegressor"),
                model_version=forecast_result.get("model_version", "1.0.0"),
                target_metric=f["target_metric"],
                predicted_value=f["predicted_value"],
                unit=f["unit"],
                forecast_for=datetime.fromisoformat(f["forecast_for"]),
                evaluation_context=forecast_result.get("evaluation_summary"),
            )
            db_session.add(fc)
        try:
            db_session.commit()
        except Exception:
            db_session.rollback()
    else:
        FORECAST_GENERATION_TOTAL.labels(status="unavailable").inc()

    return jsonify({
        "location": location.to_dict(),
        "status": forecast_result.get("status"),
        "message": forecast_result.get("message"),
        "model_name": forecast_result.get("model_name"),
        "model_version": forecast_result.get("model_version"),
        "generated_at": forecast_result.get("generated_at"),
        "evaluation_summary": forecast_result.get("evaluation_summary"),
        "count": forecast_result.get("count", 0),
        "forecasts": forecast_result.get("forecasts", []),
    }), 200
