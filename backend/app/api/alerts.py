from xml.sax.saxutils import escape as xml_escape
from flask import Blueprint, request, jsonify, g, Response
from backend.app.config import Config
from backend.app.database import db_session
from backend.app.models import AlertPreference, Notification, Location, AirQualityReading, User
from backend.app.api.auth import token_required
from backend.app.monitoring.metrics import ACTIVE_ALERTS_COUNT
from backend.app.services.alert_service import AlertService
from backend.app.services.aqi_formatter import format_whatsapp_alert
from backend.app.services.whatsapp_service import (
    send_whatsapp_with_details,
    whatsapp_configured,
    get_twilio_diagnostic_advice,
    is_valid_whatsapp_number,
)

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
    whatsapp_enabled = bool(data.get("whatsapp_enabled", False))

    if location_id is None or threshold_value is None:
        return jsonify({"error": "location_id and threshold_value are required"}), 400

    try:
        threshold_value = float(threshold_value)
    except ValueError:
        return jsonify({"error": "threshold_value must be a numeric AQI value"}), 400

    if threshold_value <= 0 or threshold_value > 500:
        return jsonify({"error": "threshold_value must be between 1 and 500"}), 400

    wa_num = (data.get("whatsapp_number") or "").strip().replace(" ", "")
    if wa_num:
        if not is_valid_whatsapp_number(wa_num):
            return jsonify({"error": f"Invalid WhatsApp number format '{wa_num}'. Must follow E.164 (e.g. +919876543210)."}), 400
        g.current_user.whatsapp_number = wa_num
        try:
            db_session.commit()
        except Exception:
            db_session.rollback()

    if whatsapp_enabled and not g.current_user.whatsapp_number:
        return jsonify({"error": "Add your WhatsApp number before enabling WhatsApp alerts"}), 400

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
        whatsapp_enabled=whatsapp_enabled,
    )
    db_session.add(pref)
    db_session.commit()
    _update_active_alerts_metric()

    # Immediately evaluate against the latest reading so the user doesn't have to wait an hour
    latest_reading = (
        db_session.query(AirQualityReading)
        .filter(AirQualityReading.location_id == location_id)
        .order_by(AirQualityReading.observed_at.desc())
        .first()
    )
    if latest_reading and latest_reading.aqi_value is not None:
        try:
            AlertService.evaluate_reading(latest_reading)
        except Exception:
            pass

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

    if "whatsapp_enabled" in data:
        wants_whatsapp = bool(data["whatsapp_enabled"])
        if wants_whatsapp and not g.current_user.whatsapp_number:
            return jsonify({"error": "Add your WhatsApp number before enabling WhatsApp alerts"}), 400
        pref.whatsapp_enabled = wants_whatsapp

    db_session.commit()
    _update_active_alerts_metric()

    # Re-evaluate against latest reading on update
    latest_reading = (
        db_session.query(AirQualityReading)
        .filter(AirQualityReading.location_id == pref.location_id)
        .order_by(AirQualityReading.observed_at.desc())
        .first()
    )
    if latest_reading and latest_reading.aqi_value is not None:
        try:
            AlertService.evaluate_reading(latest_reading)
        except Exception:
            pass

    return jsonify({"message": "Alert updated successfully", "alert": pref.to_dict()}), 200


@alerts_bp.route("/alerts/<int:alert_id>/trigger-test", methods=["POST"])
@token_required
def trigger_alert_test(alert_id: int):
    """Manually test/trigger an alert rule against the latest observed AQI."""
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

    loc = db_session.query(Location).filter(Location.id == pref.location_id).first()
    latest_reading = (
        db_session.query(AirQualityReading)
        .filter(AirQualityReading.location_id == pref.location_id)
        .order_by(AirQualityReading.observed_at.desc())
        .first()
    )

    if not latest_reading:
        return jsonify({
            "success": False,
            "message": f"No air quality readings available for {loc.name if loc else 'location'}.",
        }), 400

    current_aqi = int(latest_reading.aqi_value) if latest_reading.aqi_value is not None else 0
    threshold = int(pref.threshold_value)
    breached = current_aqi >= threshold

    wa_dispatched = False
    wa_details = None
    # Force-send WhatsApp for the test regardless of whatsapp_enabled flag —
    # this is a manual diagnostic, not a production trigger.
    if g.current_user.whatsapp_number:
        wa_body = format_whatsapp_alert(
            location_name=loc.name if loc else "Location",
            aqi=float(current_aqi),
            threshold=threshold,
            reading=latest_reading,
            is_test=True,
        )
        wa_details = send_whatsapp_with_details(
            g.current_user.whatsapp_number,
            wa_body,
            content_variables={"1": wa_body},
        )
        wa_dispatched = wa_details.get("success", False)

    err_code = wa_details.get("error_code") if wa_details else None
    from_num = wa_details.get("from_number") if wa_details else Config.TWILIO_WHATSAPP_FROM
    to_num = wa_details.get("to_number") if wa_details else g.current_user.whatsapp_number

    diagnostic_advice = None
    if wa_details and not wa_dispatched:
        from backend.app.services.whatsapp_service import get_twilio_diagnostic_advice
        diagnostic_advice = get_twilio_diagnostic_advice(err_code, from_num, to_num)

    return jsonify({
        "success": True,
        "breached": breached,
        "current_aqi": current_aqi,
        "threshold": threshold,
        "location": loc.name if loc else "Location",
        "whatsapp_enabled": pref.whatsapp_enabled,
        "whatsapp_dispatched": wa_dispatched,
        "whatsapp_recipient": g.current_user.whatsapp_number,
        "whatsapp_details": wa_details,
        "diagnostic_advice": diagnostic_advice,
        "message": (
            f"Live {loc.name if loc else 'city'} AQI is {current_aqi}. "
            + (f"Threshold ({threshold}) crossed! " if breached else f"Below threshold ({threshold}). ")
            + (f"WhatsApp test dispatched to {g.current_user.whatsapp_number}!" if wa_dispatched else (
                "No WhatsApp number on your profile — save a number first." if not g.current_user.whatsapp_number
                else f"WhatsApp dispatch failed (code {err_code}): {wa_details.get('error_message', 'Unknown error') if wa_details else 'No Twilio credentials configured.'}"
            ))
        ).strip(),
    }), 200


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


@alerts_bp.route("/alerts/test-whatsapp", methods=["POST"])
@token_required
def test_whatsapp_dispatch():
    """Manual debug endpoint for testing Twilio WhatsApp connectivity.

    Sends a test ping and returns comprehensive real-time diagnostics.
    """
    data = request.get_json(silent=True) or {}
    user = g.current_user

    target_number = (
        data.get("whatsapp_number")
        or user.whatsapp_number
        or "+919494202261"
    ).strip().replace(" ", "")

    custom_message = (
        data.get("message")
        or "🌿 AirSense Test Ping: WhatsApp alert channel connection verified! If you received this, your Twilio alert integration is fully operational."
    ).strip()

    content_sid = (data.get("content_sid") or "").strip() or None
    content_variables = data.get("content_variables") or {"1": custom_message}

    dispatch_res = send_whatsapp_with_details(
        to_number=target_number,
        body=custom_message,
        content_variables=content_variables,
        content_sid=content_sid,
    )

    err_code = dispatch_res.get("error_code")
    from_num = dispatch_res.get("from_number") or Config.TWILIO_WHATSAPP_FROM
    to_num = dispatch_res.get("to_number") or target_number
    advice = (
        "Message accepted and queued for delivery by Twilio."
        if dispatch_res["success"]
        else get_twilio_diagnostic_advice(err_code, from_num, to_num)
    )

    return jsonify({
        "success": dispatch_res["success"],
        "status_code": dispatch_res.get("status_code"),
        "error_code": err_code,
        "error_message": dispatch_res.get("error_message"),
        "message_sid": dispatch_res.get("message_sid"),
        "from_number": from_num,
        "to_number": to_num,
        "diagnostic_advice": advice,
        "payload_used": dispatch_res.get("payload_used"),
        "whatsapp_configured": whatsapp_configured(),
    }), 200


@alerts_bp.route("/alerts/twilio-webhook", methods=["GET", "POST"])
def twilio_whatsapp_webhook():
    """Handle incoming WhatsApp messages from Twilio via TwiML.

    Allows two-way conversational AQI queries on WhatsApp and enables
    the 24-hr session without any template restrictions.
    """
    incoming_body = (request.values.get("Body") or "").strip().lower()
    from_sender = (request.values.get("From") or "").replace("whatsapp:", "").strip()

    # Look up location by keyword if mentioned in the message
    target_location = None
    all_locations = db_session.query(Location).all()
    for loc in all_locations:
        if loc.name.lower() in incoming_body:
            target_location = loc
            break

    # If no city matched, check user profile or default to Delhi (Location 1) or first location
    if not target_location and from_sender:
        user = db_session.query(User).filter(User.whatsapp_number == from_sender).first()
        if user:
            pref = db_session.query(AlertPreference).filter(AlertPreference.user_id == user.id).first()
            if pref:
                target_location = db_session.query(Location).filter(Location.id == pref.location_id).first()

    if not target_location:
        target_location = (
            db_session.query(Location).filter(Location.name.ilike("%delhi%")).first()
            or db_session.query(Location).first()
        )

    loc_id = target_location.id if target_location else 1
    loc_name = target_location.name if target_location else "Delhi"

    reading = (
        db_session.query(AirQualityReading)
        .filter(AirQualityReading.location_id == loc_id)
        .order_by(AirQualityReading.observed_at.desc())
        .first()
    )

    if reading and reading.aqi_value is not None:
        report_text = format_whatsapp_alert(
            location_name=loc_name,
            aqi=reading.aqi_value,
            threshold=100,
            reading=reading,
            is_test=False,
        )
    else:
        report_text = f"🌿 AirSense: Connected to {loc_name}. Live telemetry is currently synchronizing."

    # Direct REST API dispatch fallback for Twilio Trial numbers (which sometimes drop TwiML)
    if from_sender:
        try:
            send_whatsapp_with_details(to_number=from_sender, body=report_text)
        except Exception:
            pass

    # Return valid TwiML XML with explicit <Body> tag and UTF-8 charset
    twiml_resp = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>
        <Body>{xml_escape(report_text)}</Body>
    </Message>
</Response>"""
    return Response(twiml_resp, content_type="text/xml; charset=utf-8")

