import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, JSON, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from backend.app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(191), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    alert_preferences = relationship("AlertPreference", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    region = Column(String(100), nullable=False)
    country = Column(String(100), nullable=False, default="India")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    provider_location_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    readings = relationship("AirQualityReading", back_populates="location", cascade="all, delete-orphan")
    forecasts = relationship("Forecast", back_populates="location", cascade="all, delete-orphan")
    alert_preferences = relationship("AlertPreference", back_populates="location", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_location_lat_long", "latitude", "longitude"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "region": self.region,
            "country": self.country,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "provider_location_id": self.provider_location_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AirQualityReading(Base):
    __tablename__ = "air_quality_readings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(50), nullable=False)
    source_record_id = Column(String(100), nullable=True)
    measurement_type = Column(String(20), nullable=False, default="observed")  # observed, modelled, simulated
    aqi_value = Column(Float, nullable=True)
    aqi_standard = Column(String(50), nullable=True)  # IN_CPCB, US_EPA, EAQI
    pm25 = Column(Float, nullable=True)
    pm10 = Column(Float, nullable=True)
    no2 = Column(Float, nullable=True)
    so2 = Column(Float, nullable=True)
    co = Column(Float, nullable=True)
    o3 = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    wind_speed = Column(Float, nullable=True)
    units_metadata = Column(JSON, nullable=True)
    observed_at = Column(DateTime, nullable=False, index=True)
    ingested_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    raw_payload = Column(JSON, nullable=True)

    location = relationship("Location", back_populates="readings")

    __table_args__ = (
        UniqueConstraint("provider", "location_id", "observed_at", name="uq_provider_location_observed"),
        Index("idx_reading_loc_observed", "location_id", "observed_at"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "location_id": self.location_id,
            "provider": self.provider,
            "source_record_id": self.source_record_id,
            "measurement_type": self.measurement_type,
            "aqi_value": self.aqi_value,
            "aqi_standard": self.aqi_standard,
            "pm25": self.pm25,
            "pm10": self.pm10,
            "no2": self.no2,
            "so2": self.so2,
            "co": self.co,
            "o3": self.o3,
            "temperature": self.temperature,
            "humidity": self.humidity,
            "wind_speed": self.wind_speed,
            "units_metadata": self.units_metadata or {},
            "observed_at": self.observed_at.isoformat() if self.observed_at else None,
            "ingested_at": self.ingested_at.isoformat() if self.ingested_at else None,
        }


class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False, index=True)
    model_name = Column(String(50), nullable=False)
    model_version = Column(String(50), nullable=False)
    target_metric = Column(String(50), nullable=False, default="pm25")
    predicted_value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False, default="µg/m³")
    forecast_for = Column(DateTime, nullable=False, index=True)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    evaluation_context = Column(JSON, nullable=True)

    location = relationship("Location", back_populates="forecasts")

    def to_dict(self):
        return {
            "id": self.id,
            "location_id": self.location_id,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "target_metric": self.target_metric,
            "predicted_value": self.predicted_value,
            "unit": self.unit,
            "forecast_for": self.forecast_for.isoformat() if self.forecast_for else None,
            "generated_at": self.generated_at.isoformat() if self.generated_at else None,
            "evaluation_context": self.evaluation_context or {},
        }


class AlertPreference(Base):
    __tablename__ = "alert_preferences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False, index=True)
    threshold_value = Column(Float, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="alert_preferences")
    location = relationship("Location", back_populates="alert_preferences")
    notifications = relationship("Notification", back_populates="alert_preference", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("user_id", "location_id", name="uq_user_location_alert"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "location_id": self.location_id,
            "threshold_value": self.threshold_value,
            "enabled": self.enabled,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    alert_preference_id = Column(Integer, ForeignKey("alert_preferences.id", ondelete="CASCADE"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    channel = Column(String(20), nullable=False, default="in_app")  # in_app, email
    status = Column(String(20), nullable=False, default="unread")   # unread, read, sent, failed
    triggering_reading_id = Column(Integer, ForeignKey("air_quality_readings.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    sent_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="notifications")
    alert_preference = relationship("AlertPreference", back_populates="notifications")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "alert_preference_id": self.alert_preference_id,
            "location_id": self.location_id,
            "message": self.message,
            "channel": self.channel,
            "status": self.status,
            "triggering_reading_id": self.triggering_reading_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
        }


class IngestionRun(Base):
    __tablename__ = "ingestion_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    provider = Column(String(50), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="SET NULL"), nullable=True)
    started_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    finished_at = Column(DateTime, nullable=True)
    status = Column(String(20), nullable=False)  # running, success, partial, failed
    records_fetched = Column(Integer, default=0, nullable=False)
    records_saved = Column(Integer, default=0, nullable=False)
    error_summary = Column(Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "provider": self.provider,
            "location_id": self.location_id,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "status": self.status,
            "records_fetched": self.records_fetched,
            "records_saved": self.records_saved,
            "error_summary": self.error_summary,
        }
