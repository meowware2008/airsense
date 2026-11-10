from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any


@dataclass
class NormalizedReading:
    provider: str
    location_id: int
    observed_at: datetime
    measurement_type: str  # observed, modelled, simulated
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    no2: Optional[float] = None
    so2: Optional[float] = None
    co: Optional[float] = None
    o3: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    wind_speed: Optional[float] = None
    aqi_value: Optional[float] = None
    aqi_standard: Optional[str] = None  # e.g., 'IN_CPCB', 'US_EPA', 'EAQI'
    source_record_id: Optional[str] = None
    units_metadata: Dict[str, str] = field(default_factory=dict)
    raw_payload: Optional[Dict[str, Any]] = None


class BaseAirQualityProvider(ABC):
    """Abstract base class for external air quality providers."""

    @abstractmethod
    def fetch_current(self, location) -> Optional[NormalizedReading]:
        """Fetch latest air quality reading for a location."""
        pass

    @abstractmethod
    def fetch_history(self, location, past_days: int = 7) -> List[NormalizedReading]:
        """Fetch historical hourly air quality readings for a location."""
        pass
