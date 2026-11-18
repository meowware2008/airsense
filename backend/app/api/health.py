from datetime import datetime
from flask import Blueprint, jsonify, Response
from sqlalchemy import text
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from backend.app.database import get_engine

health_bp = Blueprint("health", __name__)


@health_bp.route("/", methods=["GET"])
@health_bp.route("/api/v1", methods=["GET"])
@health_bp.route("/api/v1/", methods=["GET"])
def api_index():
    """API root discovery endpoint."""
    return jsonify({
        "name": "AirSense REST API",
        "version": "1.0.0",
        "status": "operational",
        "description": "Real-Time Air Quality Monitoring, CPCB NAQI calculation, and ML Forecasting",
        "endpoints": {
            "health_live": "/api/v1/health/live",
            "health_ready": "/api/v1/health/ready",
            "locations": "/api/v1/locations",
            "current_air_quality": "/api/v1/air-quality/current?location_id=1",
            "historical_air_quality": "/api/v1/air-quality/history?location_id=1&days=7",
            "forecasts": "/api/v1/forecasts?location_id=1",
            "auth_register": "/api/v1/auth/register",
            "auth_login": "/api/v1/auth/login",
            "auth_me": "/api/v1/auth/me",
            "alerts": "/api/v1/alerts",
            "notifications": "/api/v1/notifications",
            "metrics": "/metrics",
            "health_ping": "/api/v1/health/ping",
        },
        "docs": {
            "openapi": "/docs/api/openapi.yaml",
            "postman": "/docs/api/AirSense.postman_collection.json",
        },
    }), 200


@health_bp.route("/api/v1/health/live", methods=["GET"])
def liveness():
    """Liveness probe: verifies process is alive."""
    return jsonify({
        "status": "live",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "airsense-backend",
    }), 200


@health_bp.route("/api/v1/health/ready", methods=["GET"])
def readiness():
    """Readiness probe: verifies critical dependencies like database are operational."""
    engine = get_engine()
    if engine is None:
        return jsonify({"status": "not_ready", "reason": "Database engine uninitialized"}), 503

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return jsonify({
            "status": "ready",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat(),
        }), 200
    except Exception as e:
        return jsonify({
            "status": "not_ready",
            "database": "disconnected",
            "error": str(e),
        }), 503


@health_bp.route("/api/v1/health/ping", methods=["GET", "POST"])
def health_ping():
    """
    Keep-alive self-ping endpoint.
    GET: Returns current self-pinger status, target URLs, and last ping report.
    POST: Triggers an immediate ping cycle to all configured target websites.
    """
    from backend.app.services.pinger_service import get_pinger_status, ping_all_targets
    from flask import request

    if request.method == "POST":
        summary = ping_all_targets()
        status_code = 200 if summary["failed"] == 0 else 207  # 207 Multi-Status
        return jsonify(summary), status_code

    return jsonify(get_pinger_status()), 200


@health_bp.route("/metrics", methods=["GET"])
def metrics():
    """Prometheus metrics endpoint."""
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)
