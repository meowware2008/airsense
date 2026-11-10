from flask import Blueprint, request, jsonify, g
from backend.app.database import db_session
from backend.app.models import AlertPreference, Notification, Location
from backend.app.api.auth import token_required
from backend.app.monitoring.metrics import ACTIVE_ALERTS_COUNT

alerts_bp = Blueprint("alerts", __name__, url_prefix="/api/v1")


def _update_active_alerts_metric():
    try:
        count = db_session.query(AlertPreference).filter(AlertPreference.enabled == True).count()
        ACTIVE_ALERTS_COUNT.set(count)
    except Exception:
        pass


@alerts_bp.route("/alerts", methods=["GET"])
@token_required
def list_alerts():
    alerts = (
        db_session.query(AlertPreference)
        .filter(AlertPreference.user_id == g.current_user.id)
        .order_by(AlertPreference.created_at.desc())
        .all()
    )
    res = []
    for a in alerts:
        d = a.to_dict()
        loc = db_session.query(Location).filter(Location.id == a.location_id).first()
        d["location"] = loc.to_dict() if loc else None
        res.append(d)
    return jsonify({"alerts": res}), 200


@alerts_bp.route("/alerts", methods=["POST"])
@token_required
def create_alert():
    data = request.get_json(silent=True) or {}
    location_id = data.get("location_id")
    threshold_value = data.get("threshold_value")
    enabled = data.get("enabled", True)

    if location_id is None or threshold_value is None:
        return jsonify({"error": "location_id and threshold_value are required"}), 400

    try:
        threshold_value = float(threshold_value)
    except ValueError:
        return jsonify({"error": "threshold_value must be a numeric AQI value"}), 400

    if threshold_value <= 0 or threshold_value > 500:
        return jsonify({"error": "threshold_value must be between 1 and 500"}), 400

    loc = db_session.query(Location).filter(Location.id == location_id).first()
    if not loc:
        return jsonify({"error": "Location not found"}), 404

    existing = (
        db_session.query(AlertPreference)
        .filter(
            AlertPreference.user_id == g.current_user.id,
            AlertPreference.location_id == location_id,
        )
        .first()
    )
    if existing:
        return jsonify({"error": "An alert preference for this location already exists. Update it instead."}), 409

    pref = AlertPreference(
        user_id=g.current_user.id,
        location_id=location_id,
        threshold_value=threshold_value,
        enabled=enabled,
    )
    db_session.add(pref)
    db_session.commit()
    _update_active_alerts_metric()

    return jsonify({"message": "Alert created successfully", "alert": pref.to_dict()}), 201


@alerts_bp.route("/alerts/<int:alert_id>", methods=["PATCH"])
@token_required
def update_alert(alert_id: int):
    pref = (
        db_session.query(AlertPreference)
        .filter(
            AlertPreference.id == alert_id,
            AlertPreference.user_id == g.current_user.id,
        )
        .first()
    )
    if not pref:
        return jsonify({"error": "Alert preference not found"}), 404

    data = request.get_json(silent=True) or {}
    if "threshold_value" in data:
        try:
            val = float(data["threshold_value"])
            if not (0 < val <= 500):
                return jsonify({"error": "threshold_value must be between 1 and 500"}), 400
            pref.threshold_value = val
        except ValueError:
            return jsonify({"error": "threshold_value must be numeric"}), 400

    if "enabled" in data:
        pref.enabled = bool(data["enabled"])

    db_session.commit()
    _update_active_alerts_metric()
    return jsonify({"message": "Alert updated successfully", "alert": pref.to_dict()}), 200


@alerts_bp.route("/alerts/<int:alert_id>", methods=["DELETE"])
@token_required
def delete_alert(alert_id: int):
    pref = (
        db_session.query(AlertPreference)
        .filter(
            AlertPreference.id == alert_id,
            AlertPreference.user_id == g.current_user.id,
        )
        .first()
    )
    if not pref:
        return jsonify({"error": "Alert preference not found"}), 404

    db_session.delete(pref)
    db_session.commit()
    _update_active_alerts_metric()
    return jsonify({"message": "Alert preference deleted successfully"}), 200


@alerts_bp.route("/notifications", methods=["GET"])
@token_required
def list_notifications():
    notifications = (
        db_session.query(Notification)
        .filter(Notification.user_id == g.current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(100)
        .all()
    )
    res = []
    for n in notifications:
        d = n.to_dict()
        loc = db_session.query(Location).filter(Location.id == n.location_id).first()
        d["location"] = loc.to_dict() if loc else None
        res.append(d)
    return jsonify({"notifications": res}), 200


@alerts_bp.route("/notifications/<int:notification_id>/read", methods=["PATCH"])
@token_required
def mark_notification_read(notification_id: int):
    notif = (
        db_session.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == g.current_user.id,
        )
        .first()
    )
    if not notif:
        return jsonify({"error": "Notification not found"}), 404

    notif.status = "read"
    db_session.commit()
    return jsonify({"message": "Notification marked as read", "notification": notif.to_dict()}), 200
