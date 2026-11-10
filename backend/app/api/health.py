from datetime import datetime
from flask import Blueprint, jsonify, Response
from sqlalchemy import text
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from backend.app.database import get_engine

health_bp = Blueprint("health", __name__)


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


@health_bp.route("/metrics", methods=["GET"])
def metrics():
    """Prometheus metrics endpoint."""
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)
