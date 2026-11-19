from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify, g

from backend.app.config import Config
from backend.app.database import db_session
from backend.app.models import Location, AirQualityReading
from backend.app.services.ingestion_service import IngestionService
from backend.app.services.best_time_service import find_best_time_window
from backend.app.services.whatsapp_service import (
    send_whatsapp,
    send_whatsapp_with_details,
    is_valid_whatsapp_number,
    whatsapp_configured,
)
from backend.app.api.auth import token_required
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


@best_time_bp.route("/send-whatsapp", methods=["POST"])
@token_required
def send_best_time_whatsapp():
    """
    Send the recommended cleanest outdoor window directly to the user's WhatsApp number.
    Integrates the Best Time prediction engine with Twilio WhatsApp messaging.
    """
    user = g.current_user
    data = request.get_json(silent=True) or {}
    location_id = data.get("location_id") or request.args.get("location_id", type=int)

    # Allow custom number in request or fallback to saved profile number
    target_number = (data.get("whatsapp_number") or user.whatsapp_number or "").strip().replace(" ", "")

    if not target_number:
        return jsonify({
            "error": "No WhatsApp number configured. Please enter your WhatsApp number (e.g. +919876543210)."
        }), 400

    if not is_valid_whatsapp_number(target_number):
        return jsonify({
            "error": f"Invalid WhatsApp number format '{target_number}'. Must follow E.164 format (e.g. +919876543210)."
        }), 400

    # Auto-save number to user profile if not saved
    if target_number != user.whatsapp_number:
        user.whatsapp_number = target_number
        try:
            db_session.commit()
        except Exception:
            db_session.rollback()

    if not location_id:
        return jsonify({"error": "location_id is required"}), 400

    location = db_session.query(Location).filter(Location.id == location_id).first()
    if not location:
        return jsonify({"error": "Location not found"}), 404

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
        {"observed_at": r.observed_at.isoformat(), "pm25": r.pm25}
        for r in readings if r.pm25 is not None
    ]

    forecast_result = predict_next_24h(reading_dicts)
    if forecast_result.get("status") != "available":
        return jsonify({
            "error": "Unable to calculate best outdoor window because forecasts are unavailable."
        }), 400

    recommendation = find_best_time_window(forecast_result.get("forecasts", []), window_hours=3)
    best_window = recommendation.get("best_window")

    if not best_window:
        return jsonify({
            "error": "No suitable outdoor window found in the current forecast horizon."
        }), 400

    start_dt = datetime.fromisoformat(best_window["start"])
    end_dt = datetime.fromisoformat(best_window["end"])
    start_str = start_dt.strftime("%I:%M %p")
    end_str = end_dt.strftime("%I:%M %p")

    message_body = (
        f"🌿 *AirSense Smart Outdoor Recommendation*\n\n"
        f"📍 *City:* {location.name}, {location.region or location.country}\n"
        f"✨ *Cleanest Air Window:* {start_str} – {end_str} ({best_window['duration_hours']} hours)\n"
        f"📉 *Average PM₂.₅:* {best_window['average_pm25']} µg/m³\n"
        f"📈 *Peak PM₂.₅:* {best_window['maximum_pm25']} µg/m³\n\n"
        f"💡 *Tip:* Ideal time for outdoor exercise, walking, and room ventilation!"
    )

    dispatch_res = send_whatsapp_with_details(
        target_number,
        message_body,
        content_variables={"1": message_body, "2": location.name},
        content_sid=Config.TWILIO_CONTENT_SID,
    )
    sent = dispatch_res["success"]
    configured = whatsapp_configured()

    if sent:
        sid_str = f" (SID: {dispatch_res['message_sid']})" if dispatch_res.get("message_sid") else ""
        status_msg = f"Best outdoor window successfully sent to {target_number} via WhatsApp!{sid_str}"
    elif not configured:
        status_msg = f"Recommendation ready for {target_number}, but Twilio credentials (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN) are not configured on the server."
    else:
        err_code = dispatch_res.get("error_code")
        err_msg = dispatch_res.get("error_message") or "Unknown error"
        clean_from = Config.TWILIO_WHATSAPP_FROM.replace("whatsapp:", "").strip()

        if err_code == 21654:
            status_msg = (
                f"Twilio Trial Restriction (Error 21654): Twilio requires an active WhatsApp session or a Content Template. "
                f"Please reply 'Hi' on WhatsApp from {target_number} to {clean_from} to activate your 24-hr session, or configure TWILIO_CONTENT_SID."
            )
        elif err_code == 63016:
            status_msg = (
                f"Twilio WhatsApp session inactive (Error 63016): WhatsApp requires an active 24-hr session. "
                f"Please send 'Hi' or any message on WhatsApp from your phone ({target_number}) to {clean_from}, then click send again."
            )
        elif err_code == 21608:
            status_msg = (
                f"Twilio Trial restriction (Error 21608): Recipient {target_number} is unverified. "
                f"Please add {target_number} to Twilio Verified Caller IDs or activate the sandbox."
            )
        elif err_code == 20003:
            status_msg = "Twilio Authentication Error (20003): Invalid Account SID or Auth Token configured on server."
        elif err_code == 21606:
            status_msg = f"Twilio Sender Error (21606): From number {clean_from} is not recognized as a WhatsApp sender."
        else:
            code_str = f" (Error {err_code})" if err_code else ""
            status_msg = f"Twilio dispatch to {target_number} failed{code_str}: {err_msg}"

    return jsonify({
        "success": True,
        "dispatched": sent,
        "whatsapp_configured": configured,
        "recipient": target_number,
        "message": status_msg,
        "error_code": dispatch_res.get("error_code"),
        "error_detail": dispatch_res.get("error_message"),
        "message_sid": dispatch_res.get("message_sid"),
        "best_window": best_window,
        "formatted_text": message_body,
    }), 200
