import json
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


def get_twilio_diagnostic_advice(error_code: int | None, from_number: str, to_number: str) -> str:
    """Provide specific, human-readable troubleshooting advice based on Twilio error codes."""
    clean_from = (from_number or "").replace("whatsapp:", "").strip()
    clean_to = (to_number or "").replace("whatsapp:", "").strip()

    if error_code == 21654:
        return (
            f"Twilio Trial Restriction (Error 21654 - ContentSid Required): Twilio trial accounts require an active session or a WhatsApp Content Template. "
            f"Please reply 'Hi' on WhatsApp from {clean_to} to {clean_from} to activate your 24-hr session, or configure TWILIO_CONTENT_SID."
        )
    elif error_code == 63016:
        return (
            f"Twilio WhatsApp session inactive (Error 63016): WhatsApp requires an active 24-hr session. "
            f"Please send 'Hi' or any message on WhatsApp from your phone ({clean_to}) to {clean_from}, then click send again."
        )
    elif error_code in (21608, 572002):
        return (
            f"Twilio Trial Restriction (Error {error_code}): Recipient {clean_to} is not a verified phone number on your Twilio account. "
            f"Twilio trial accounts can only message numbers in your Verified Caller IDs. "
            f"To fix: Go to Twilio Console -> Phone Numbers -> Manage -> Verified Caller IDs, add {clean_to}, and verify via OTP code."
        )
    elif error_code == 20003:
        return "Twilio Authentication Error (20003): Invalid Account SID or Auth Token configured on server."
    elif error_code == 21606:
        return f"Twilio Sender Error (21606): From number {clean_from} is not recognized as a WhatsApp sender."
    elif error_code == 21211:
        return f"Invalid Phone Number (Error 21211): {clean_to} is not formatted in valid international E.164 format (e.g. +919494202261)."
    return "Ensure recipient is joined to Twilio WhatsApp sandbox or has an active 24-hour session."


def send_whatsapp_with_details(
    to_number: str,
    body: str,
    content_variables: dict = None,
    content_sid: str = None,
) -> dict:
    """Send a WhatsApp message through the Twilio REST API with full diagnostic response.

    Supports both free-form message body and approved Twilio Content Templates (ContentSid).

    Returns a dict with:
        - success: bool
        - status_code: int or None
        - error_code: int or None (Twilio error code if present)
        - error_message: str or None (Twilio error message or description)
        - message_sid: str or None
        - from_number: str
        - to_number: str
        - payload_used: dict
    """
    if not whatsapp_configured():
        return {
            "success": False,
            "status_code": None,
            "error_code": None,
            "error_message": "Twilio credentials (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN) are not configured.",
            "message_sid": None,
            "from_number": Config.TWILIO_WHATSAPP_FROM,
            "to_number": to_number,
            "payload_used": {},
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
            "from_number": Config.TWILIO_WHATSAPP_FROM,
            "to_number": to_number,
            "payload_used": {},
        }

    from_addr = format_whatsapp_address(Config.TWILIO_WHATSAPP_FROM)
    to_addr = format_whatsapp_address(raw_to)

    url = f"https://api.twilio.com/2010-04-01/Accounts/{Config.TWILIO_ACCOUNT_SID}/Messages.json"

    # Always send free-form Body first — ContentSid overrides the message with
    # the template's own static text, so we only fall back to it on error 21654.
    post_data = {
        "From": from_addr,
        "To": to_addr,
        "Body": body,
    }

    # Allow explicit override (e.g. from the diagnostic test panel passing content_sid directly)
    if content_sid:
        post_data.pop("Body", None)
        post_data["ContentSid"] = content_sid
        if content_variables:
            post_data["ContentVariables"] = json.dumps(content_variables)

    try:
        resp = requests.post(
            url,
            data=post_data,
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
                "from_number": from_addr,
                "to_number": to_addr,
                "payload_used": post_data,
            }

        twilio_code = resp_data.get("code")
        twilio_msg = resp_data.get("message") or resp.text[:250]
        logger.warning(f"WhatsApp send failed: HTTP {resp.status_code} (Code {twilio_code}): {twilio_msg}")

        # 21654 = ContentSid Required (trial account, no active session)
        # Automatically retry once with the configured ContentSid template as fallback
        if twilio_code == 21654 and Config.TWILIO_CONTENT_SID and "Body" in post_data:
            logger.info("Retrying with ContentSid fallback template due to error 21654")
            fallback_data = {k: v for k, v in post_data.items() if k != "Body"}
            fallback_data["ContentSid"] = Config.TWILIO_CONTENT_SID
            fallback_data["ContentVariables"] = json.dumps({"1": body[:1500]})
            try:
                resp2 = requests.post(
                    url,
                    data=fallback_data,
                    auth=(Config.TWILIO_ACCOUNT_SID, Config.TWILIO_AUTH_TOKEN),
                    timeout=Config.REQUEST_TIMEOUT_SECONDS,
                )
                resp2_data = resp2.json() if resp2.content else {}
                if resp2.status_code in (200, 201):
                    logger.info("ContentSid fallback succeeded")
                    return {
                        "success": True,
                        "status_code": resp2.status_code,
                        "error_code": None,
                        "error_message": None,
                        "message_sid": resp2_data.get("sid"),
                        "from_number": from_addr,
                        "to_number": to_addr,
                        "payload_used": fallback_data,
                    }
                twilio_code = resp2_data.get("code", twilio_code)
                twilio_msg = resp2_data.get("message") or resp2.text[:250]
                logger.warning(f"ContentSid fallback also failed: {twilio_code}: {twilio_msg}")
                post_data = fallback_data
            except Exception as e2:
                logger.warning(f"ContentSid fallback request error: {e2}")

        return {
            "success": False,
            "status_code": resp.status_code,
            "error_code": twilio_code,
            "error_message": twilio_msg,
            "message_sid": None,
            "from_number": from_addr,
            "to_number": to_addr,
            "payload_used": post_data,
        }
    except requests.RequestException as e:
        logger.warning(f"WhatsApp dispatch failed gracefully (network issue): {e}")
        return {
            "success": False,
            "status_code": None,
            "error_code": None,
            "error_message": f"Network error connecting to Twilio: {str(e)}",
            "message_sid": None,
            "from_number": from_addr,
            "to_number": to_addr,
            "payload_used": post_data,
        }


def send_whatsapp(to_number: str, body: str, content_variables: dict = None) -> bool:
    """Send a WhatsApp message through the Twilio REST API.

    Returns True on success and False on any failure, so a WhatsApp problem
    never breaks the ingestion/alert cycle.
    """
    if content_variables is None:
        content_variables = {"1": body, "2": "AirSense"}
    return send_whatsapp_with_details(
        to_number,
        body,
        content_variables=content_variables,
    )["success"]
