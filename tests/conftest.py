import os
import sys
from pathlib import Path
import pytest

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app import create_app
from backend.app.config import TestingConfig
from backend.app.database import Base, get_engine, db_session
from backend.app.models import User, Location, AirQualityReading
from werkzeug.security import generate_password_hash


@pytest.fixture(scope="session")
def app():
    app = create_app(TestingConfig)
    return app


@pytest.fixture(autouse=True)
def clean_db(app):
    """Ensure a clean database for every test."""
    with app.app_context():
        engine = get_engine()
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        yield
        db_session.remove()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def test_user(app):
    with app.app_context():
        user = User(
            name="Test Citizen",
            email="citizen@example.com",
            password_hash=generate_password_hash("securepass123"),
        )
        db_session.add(user)
        db_session.commit()
        return user


@pytest.fixture
def test_location(app):
    with app.app_context():
        loc = Location(
            name="Delhi",
            region="Delhi",
            country="India",
            latitude=28.6139,
            longitude=77.2090,
        )
        db_session.add(loc)
        db_session.commit()
        return loc


@pytest.fixture
def auth_token(client, test_user):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "citizen@example.com", "password": "securepass123"},
    )
    return resp.get_json()["token"]
