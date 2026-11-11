import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app import create_app
from backend.app.api.locations import seed_default_locations


def seed_demo_user():
    """Ensure baseline demo user exists for immediate login testing."""
    from werkzeug.security import generate_password_hash
    from backend.app.database import db_session
    from backend.app.models import User

    demo_email = "demo@airsense.org"
    user = db_session.query(User).filter(User.email == demo_email).first()
    if not user:
        user = User(
            name="Demo Citizen",
            email=demo_email,
            password_hash=generate_password_hash("demo12345"),
        )
        db_session.add(user)
        try:
            db_session.commit()
        except Exception:
            db_session.rollback()


app = create_app()

with app.app_context():
    seed_default_locations()
    seed_demo_user()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
