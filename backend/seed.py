import sys
from pathlib import Path
from datetime import datetime, timedelta

# Add root directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from werkzeug.security import generate_password_hash
from backend.app.config import Config
from backend.app.database import init_db, create_all_tables, db_session
from backend.app.models import User, Location, AirQualityReading, AlertPreference, Notification
from backend.app.api.locations import seed_default_locations
from backend.app.services.alert_service import AlertService


def seed_database():
    """Seed initial development and demo records."""
    print("Initializing database...")
    init_db(Config.DATABASE_URL)
    create_all_tables()
    seed_default_locations()

    # 1. Seed Demo User
    demo_email = "demo@airsense.org"
    user = db_session.query(User).filter(User.email == demo_email).first()
    if not user:
        user = User(
            name="Demo Citizen",
            email=demo_email,
            password_hash=generate_password_hash("demo12345"),
        )
        db_session.add(user)
        db_session.commit()
        print(f"[+] Created Demo User: {demo_email} (password: demo12345)")
    else:
        print(f"[*] Demo user {demo_email} already exists.")

    # 2. Get Reference Location (Delhi)
    delhi = db_session.query(Location).filter(Location.name == "Delhi").first()
    if not delhi:
        print("[-] Delhi location not found.")
        return

    # 3. Seed Alert Preference for Delhi (Threshold: 120 AQI)
    alert = (
        db_session.query(AlertPreference)
        .filter(AlertPreference.user_id == user.id, AlertPreference.location_id == delhi.id)
        .first()
    )
    if not alert:
        alert = AlertPreference(
            user_id=user.id,
            location_id=delhi.id,
            threshold_value=120.0,
            enabled=True,
        )
        db_session.add(alert)
        db_session.commit()
        print(f"[+] Created Alert Preference for Delhi with threshold=120 AQI")

    # 4. Seed Controlled Simulated High-Pollution Reading
    now = datetime.utcnow()
    test_reading = (
        db_session.query(AirQualityReading)
        .filter(
            AirQualityReading.location_id == delhi.id,
            AirQualityReading.provider == "mock",
            AirQualityReading.source_record_id == "demo-alert-fixture-01",
        )
        .first()
    )
    if not test_reading:
        test_reading = AirQualityReading(
            location_id=delhi.id,
            provider="mock",
            source_record_id="demo-alert-fixture-01",
            measurement_type="simulated",
            aqi_value=175.0,
            aqi_standard="IN_CPCB",
            pm25=85.0,
            pm10=160.0,
            no2=48.0,
            so2=20.0,
            co=1200.0,
            o3=65.0,
            temperature=27.0,
            humidity=52.0,
            wind_speed=2.1,
            units_metadata={"pm25": "µg/m³", "pm10": "µg/m³"},
            observed_at=now,
            ingested_at=now,
            raw_payload={"demo": True, "notice": "Controlled test fixture for alert evaluation"},
        )
        db_session.add(test_reading)
        db_session.commit()
        print(f"[+] Injected controlled simulated reading: AQI=175.0")

        # Evaluate alerts
        triggered = AlertService.evaluate_reading(test_reading)
        print(f"[+] Alert engine triggered {len(triggered)} notification(s).")

    print("\n--- Seed Complete ---")
    print(f"API Base URL: http://localhost:5000/api/v1")
    print(f"Demo Login:   {demo_email} / demo12345")
    print(f"Postman Spec: docs/api/AirSense.postman_collection.json")
    print(f"OpenAPI Spec: docs/api/openapi.yaml")


if __name__ == "__main__":
    seed_database()
