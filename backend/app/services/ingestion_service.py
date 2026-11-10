import time
import logging
from datetime import datetime
from typing import Optional, List
from backend.app.database import db_session
from backend.app.models import Location, AirQualityReading, IngestionRun
from backend.app.providers import get_provider
from backend.app.providers.base import BaseAirQualityProvider, NormalizedReading
from backend.app.services.alert_service import AlertService
from backend.app.monitoring.metrics import (
    INGESTION_RUNS_TOTAL,
    INGESTION_RECORDS_SAVED_TOTAL,
    LAST_INGESTION_TIMESTAMP_SECONDS,
)

logger = logging.getLogger(__name__)


class IngestionService:
    def __init__(self, provider: Optional[BaseAirQualityProvider] = None, provider_name: str = "open_meteo"):
        self.provider = provider or get_provider(provider_name)
        self.provider_name = provider_name

    def ingest_location(self, location: Location) -> int:
        """Ingest current reading for a single location idempotently. Returns number of saved records."""
        reading_dto = self.provider.fetch_current(location)
        if not reading_dto:
            return 0

        saved = self._save_reading(reading_dto)
        return 1 if saved else 0

    def ingest_all_locations(self) -> IngestionRun:
        """Execute scheduled ingestion run across all registered locations."""
        started_at = datetime.utcnow()
        locations = db_session.query(Location).all()

        run = IngestionRun(
            provider=self.provider_name,
            started_at=started_at,
            status="running",
            records_fetched=0,
            records_saved=0,
        )
        db_session.add(run)
        db_session.commit()

        total_fetched = 0
        total_saved = 0
        errors = []

        for loc in locations:
            try:
                reading_dto = self.provider.fetch_current(loc)
                if reading_dto:
                    total_fetched += 1
                    saved_reading = self._save_reading(reading_dto)
                    if saved_reading:
                        total_saved += 1
                        # Evaluate alert rules
                        AlertService.evaluate_reading(saved_reading)
            except Exception as e:
                err_msg = f"Location {loc.id} ({loc.name}) ingestion error: {str(e)}"
                logger.error(err_msg)
                errors.append(err_msg)

        finished_at = datetime.utcnow()
        run.finished_at = finished_at
        run.records_fetched = total_fetched
        run.records_saved = total_saved

        if errors:
            run.status = "partial" if total_saved > 0 else "failed"
            run.error_summary = "; ".join(errors[:5])
        else:
            run.status = "success"

        try:
            db_session.commit()
            # Update metrics
            INGESTION_RUNS_TOTAL.labels(provider=self.provider_name, status=run.status).inc()
            INGESTION_RECORDS_SAVED_TOTAL.labels(provider=self.provider_name).inc(total_saved)
            if run.status in ("success", "partial"):
                LAST_INGESTION_TIMESTAMP_SECONDS.labels(provider=self.provider_name).set(time.time())
        except Exception as e:
            db_session.rollback()
            logger.error(f"Failed to update IngestionRun record: {e}")

        return run

    def ingest_history(self, location: Location, past_days: int = 7) -> int:
        """Ingest historical readings for a location idempotently."""
        readings = self.provider.fetch_history(location, past_days=past_days)
        saved_count = 0
        for dto in readings:
            if self._save_reading(dto):
                saved_count += 1
        return saved_count

    def _save_reading(self, dto: NormalizedReading) -> Optional[AirQualityReading]:
        """Save normalized reading if not already present (idempotent)."""
        existing = (
            db_session.query(AirQualityReading)
            .filter(
                AirQualityReading.provider == dto.provider,
                AirQualityReading.location_id == dto.location_id,
                AirQualityReading.observed_at == dto.observed_at,
            )
            .first()
        )
        if existing:
            return None

        reading = AirQualityReading(
            location_id=dto.location_id,
            provider=dto.provider,
            source_record_id=dto.source_record_id,
            measurement_type=dto.measurement_type,
            aqi_value=dto.aqi_value,
            aqi_standard=dto.aqi_standard,
            pm25=dto.pm25,
            pm10=dto.pm10,
            no2=dto.no2,
            so2=dto.so2,
            co=dto.co,
            o3=dto.o3,
            temperature=dto.temperature,
            humidity=dto.humidity,
            wind_speed=dto.wind_speed,
            units_metadata=dto.units_metadata,
            observed_at=dto.observed_at,
            ingested_at=datetime.utcnow(),
            raw_payload=dto.raw_payload,
        )
        db_session.add(reading)
        try:
            db_session.commit()
            return reading
        except Exception as e:
            db_session.rollback()
            logger.error(f"Failed to save reading: {e}")
            return None
