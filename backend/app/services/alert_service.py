import logging
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from backend.app.database import db_session
from backend.app.models import AlertPreference, Notification, AirQualityReading, Location, User
from backend.app.config import Config

logger = logging.getLogger(__name__)

# Alert cooldown period to prevent spamming notifications on every hourly reading above threshold
COOLDOWN_HOURS = 6


class AlertService:
    @staticmethod
    def evaluate_reading(reading: AirQualityReading):
        """Evaluate whether an air quality reading triggers user alert preferences."""
        if reading.aqi_value is None:
            return []

        # Find enabled alert preferences for this location
        preferences = (
            db_session.query(AlertPreference)
            .filter(
                AlertPreference.location_id == reading.location_id,
                AlertPreference.enabled == True,
            )
            .all()
        )

        triggered_notifications = []
        now = datetime.utcnow()
        cooldown_cutoff = now - timedelta(hours=COOLDOWN_HOURS)

        location = db_session.query(Location).filter(Location.id == reading.location_id).first()
        loc_name = location.name if location else f"Location #{reading.location_id}"

        for pref in preferences:
            # Check if threshold crossed
            if reading.aqi_value >= pref.threshold_value:
                # Check cooldown: was a notification created for this user + preference recently?
                recent_notification = (
                    db_session.query(Notification)
                    .filter(
                        Notification.alert_preference_id == pref.id,
                        Notification.created_at >= cooldown_cutoff,
                    )
                    .first()
                )

                if recent_notification:
                    # Cooldown active, skip duplicate notification
                    continue

                message = (
                    f"AQI Alert for {loc_name}: Current AQI of {int(reading.aqi_value)} "
                    f"crossed your configured threshold of {int(pref.threshold_value)}. "
                    f"Standard: {reading.aqi_standard or 'Unknown'}."
                )

                # Create in-app notification
                in_app_notif = Notification(
                    user_id=pref.user_id,
                    alert_preference_id=pref.id,
                    location_id=reading.location_id,
                    message=message,
                    channel="in_app",
                    status="unread",
                    triggering_reading_id=reading.id,
                    created_at=now,
                    sent_at=now,
                )
                db_session.add(in_app_notif)
                triggered_notifications.append(in_app_notif)

                # Attempt email notification if credentials configured
                user = db_session.query(User).filter(User.id == pref.user_id).first()
                if user and Config.MAIL_HOST and Config.MAIL_USERNAME:
                    email_sent = AlertService._send_email(
                        to_email=user.email,
                        subject=f"AirSense Alert: High AQI in {loc_name}",
                        body=message,
                    )
                    email_notif = Notification(
                        user_id=pref.user_id,
                        alert_preference_id=pref.id,
                        location_id=reading.location_id,
                        message=message,
                        channel="email",
                        status="sent" if email_sent else "failed",
                        triggering_reading_id=reading.id,
                        created_at=now,
                        sent_at=now if email_sent else None,
                    )
                    db_session.add(email_notif)

        if triggered_notifications:
            try:
                db_session.commit()
            except Exception as e:
                db_session.rollback()
                logger.error(f"Failed to commit alert notifications: {e}")

        return triggered_notifications

    @staticmethod
    def _send_email(to_email: str, subject: str, body: str) -> bool:
        """Send email with graceful fallback."""
        if not Config.MAIL_HOST:
            return False

        try:
            msg = MIMEMultipart()
            msg["From"] = Config.MAIL_FROM
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))

            port = Config.MAIL_PORT or 587
            with smtplib.SMTP(Config.MAIL_HOST, port, timeout=10) as server:
                server.starttls()
                if Config.MAIL_USERNAME and Config.MAIL_PASSWORD:
                    server.login(Config.MAIL_USERNAME, Config.MAIL_PASSWORD)
                server.send_message(msg)
            return True
        except Exception as e:
            logger.warning(f"Email dispatch failed gracefully (credentials or network issue): {e}")
            return False
