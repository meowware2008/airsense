import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR.parent / ".env")


class Config:
    """Base application configuration."""
    APP_ENV = os.getenv("APP_ENV", "development")
    SECRET_KEY = os.getenv("SECRET_KEY", "airsense-insecure-dev-key-change-in-prod")
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))

    # Database
    # Support SQLite fallback if MySQL is not available during local testing
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://airsense:airsense_pass@localhost:3306/airsense"
    )
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

    # AQI Ingestion
    AQI_PROVIDER = os.getenv("AQI_PROVIDER", "open_meteo")
    AQI_API_KEY = os.getenv("AQI_API_KEY", "")
    INGESTION_INTERVAL_MINUTES = int(os.getenv("INGESTION_INTERVAL_MINUTES", "60"))
    REQUEST_TIMEOUT_SECONDS = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "10"))

    # Email
    MAIL_HOST = os.getenv("MAIL_HOST", "")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587")) if os.getenv("MAIL_PORT") else None
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_FROM = os.getenv("MAIL_FROM", "airsense-alerts@example.com")

    # ML
    MODEL_PATH = os.getenv(
        "MODEL_PATH",
        str(BASE_DIR.parent / "ml" / "artifacts" / "random_forest_pm25.joblib")
    )

    # Monitoring
    PROMETHEUS_ENABLED = os.getenv("PROMETHEUS_ENABLED", "true").lower() in ("true", "1", "yes")


class TestingConfig(Config):
    """Configuration for automated test execution."""
    APP_ENV = "testing"
    TESTING = True
    SECRET_KEY = "test-secret-key"
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    AQI_PROVIDER = "mock"
    PROMETHEUS_ENABLED = False
