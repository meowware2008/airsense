import logging
import re
import requests
from backend.app.config import Config

logger = logging.getLogger(__name__)

# E.164: + followed by country code and number, 8-15 digits in total
E164_PATTERN = re.compile(r"^\+[1-9]\d{7,14}$")


def is_valid_whatsapp_number(number: str) -> bool:
    return bool(number and E164_PATTERN.match(number))


def whatsapp_configured() -> bool:
    return bool(Config.TWILIO_ACCOUNT_SID and Config.TWILIO_AUTH_TOKEN)


def format_whatsapp_address(raw_number: str) -> str:
    """Normalize a phone number or Twilio address to strictly have a single 'whatsapp:' prefix
    followed by the E.164 number (+...).
    e.g. '+919494202261' -> 'whatsapp:+919494202261'
         'whatsapp:+17372508034' -> 'whatsapp:+17372508034'
         '+1 737 250 8034' -> 'whatsapp:+17372508034'
    """
    cleaned = (raw_number or "").strip().replace(" ", "").replace("-", "")
    while cleaned.lower().startswith("whatsapp:"):
        cleaned = cleaned[9:].strip()
    if cleaned and not cleaned.startswith("+"):
        cleaned = f"+{cleaned}"
    return f"whatsapp:{cleaned}" if cleaned else ""


def send_whatsapp_with_details(to_number: str, body: str) -> dict:
    """Send a WhatsApp message through the Twilio REST API with full diagnostic response.

    Returns a dict with:
        - success: bool
        - status_code: int or None
        - error_code: int or None (Twilio error code if present)
        - error_message: str or None (Twilio error message or description)
        - message_sid: str or None
    """
    if not whatsapp_configured():
        return {
            "success": False,
            "status_code": None,
            "error_code": None,
            "error_message": "Twilio credentials (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN) are not configured.",
            "message_sid": None,
        }

    raw_to = to_number or ""
    while raw_to.lower().startswith("whatsapp:"):
        raw_to = raw_to[9:].strip()
    raw_to = raw_to.replace(" ", "").replace("-", "")

    if not is_valid_whatsapp_number(raw_to):
        return {
            "success": False,
            "status_code": None,
            "error_code": None,
            "error_message": f"Invalid WhatsApp number format '{to_number}'. Must follow E.164 (e.g. +919876543210).",
            "message_sid": None,
        }

    from_addr = format_whatsapp_address(Config.TWILIO_WHATSAPP_FROM)
    to_addr = format_whatsapp_address(raw_to)

    url = f"https://api.twilio.com/2010-04-01/Accounts/{Config.TWILIO_ACCOUNT_SID}/Messages.json"
    try:
        resp = requests.post(
            url,
            data={
                "From": from_addr,
                "To": to_addr,
                "Body": body,
            },
            auth=(Config.TWILIO_ACCOUNT_SID, Config.TWILIO_AUTH_TOKEN),
            timeout=Config.REQUEST_TIMEOUT_SECONDS,
        )

        try:
            resp_data = resp.json()
        except Exception:
            resp_data = {}

        if resp.status_code in (200, 201):
            return {
                "success": True,
                "status_code": resp.status_code,
                "error_code": None,
                "error_message": None,
                "message_sid": resp_data.get("sid"),
            }

        twilio_code = resp_data.get("code")
        twilio_msg = resp_data.get("message") or resp.text[:250]
        logger.warning(f"WhatsApp send failed: HTTP {resp.status_code} (Code {twilio_code}): {twilio_msg}")

        return {
            "success": False,
            "status_code": resp.status_code,
            "error_code": twilio_code,
            "error_message": twilio_msg,
            "message_sid": None,
        }
    except requests.RequestException as e:
        logger.warning(f"WhatsApp dispatch failed gracefully (network issue): {e}")
        return {
            "success": False,
            "status_code": None,
            "error_code": None,
            "error_message": f"Network error connecting to Twilio: {str(e)}",
            "message_sid": None,
        }


def send_whatsapp(to_number: str, body: str) -> bool:
    """Send a WhatsApp message through the Twilio REST API.

    Returns True on success and False on any failure, so a WhatsApp problem
    never breaks the ingestion/alert cycle.
    """
    return send_whatsapp_with_details(to_number, body)["success"]
