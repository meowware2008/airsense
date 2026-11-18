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


def send_whatsapp(to_number: str, body: str) -> bool:
    """Send a WhatsApp message through the Twilio REST API.

    Returns True on success and False on any failure, so a WhatsApp problem
    never breaks the ingestion/alert cycle.
    """
    if not whatsapp_configured() or not is_valid_whatsapp_number(to_number):
        return False

    url = f"https://api.twilio.com/2010-04-01/Accounts/{Config.TWILIO_ACCOUNT_SID}/Messages.json"
    try:
        resp = requests.post(
            url,
            data={
                "From": Config.TWILIO_WHATSAPP_FROM,
                "To": f"whatsapp:{to_number}",
                "Body": body,
            },
            auth=(Config.TWILIO_ACCOUNT_SID, Config.TWILIO_AUTH_TOKEN),
            timeout=Config.REQUEST_TIMEOUT_SECONDS,
        )
        if resp.status_code in (200, 201):
            return True
        logger.warning(f"WhatsApp send failed: HTTP {resp.status_code} {resp.text[:200]}")
        return False
    except requests.RequestException as e:
        logger.warning(f"WhatsApp dispatch failed gracefully (network issue): {e}")
        return False
