import math
from datetime import datetime, timedelta
from typing import Optional, List
from backend.app.providers.base import BaseAirQualityProvider, NormalizedReading
from backend.app.services.aqi_calculator import calculate_cpcb_aqi


class MockProvider(BaseAirQualityProvider):
    """Deterministic mock provider for offline testing and development.
    
    All returned records are strictly labelled measurement_type='simulated'.
    """

    def fetch_current(self, location) -> Optional[NormalizedReading]:
        now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        # Use location ID and hour to produce smooth realistic synthetic variation
        hour = now.hour
        base_pm25 = 45.0 + (location.id % 5) * 15.0 + 20.0 * math.sin(hour * math.pi / 12)
        pm25 = max(5.0, round(base_pm25, 1))
        pm10 = round(pm25 * 1.8, 1)
        no2 = round(25.0 + 10.0 * math.cos(hour * math.pi / 12), 1)
        so2 = round(12.0 + 3.0 * math.sin(hour * math.pi / 12), 1)
        co = round(650.0 + 150.0 * math.sin(hour * math.pi / 12), 1)
        o3 = round(35.0 + 15.0 * math.cos(hour * math.pi / 12), 1)

        pollutants = {
            "pm25": pm25,
            "pm10": pm10,
            "no2": no2,
            "so2": so2,
            "co": co,
            "o3": o3,
        }
        cpcb = calculate_cpcb_aqi(pollutants)

        return NormalizedReading(
            provider="mock",
            location_id=location.id,
            observed_at=now,
            measurement_type="simulated",
            pm25=pm25,
            pm10=pm10,
            no2=no2,
            so2=so2,
            co=co,
            o3=o3,
            temperature=28.5,
            humidity=55.0,
            wind_speed=2.5,
            aqi_value=float(cpcb["aqi"]) if cpcb["eligible"] else 100.0,
            aqi_standard="IN_CPCB" if cpcb["eligible"] else "MOCK_SIMULATED",
            units_metadata={
                "pm25": "µg/m³",
                "pm10": "µg/m³",
                "no2": "µg/m³",
                "so2": "µg/m³",
                "co": "µg/m³",
                "o3": "µg/m³",
                "temperature": "°C",
                "humidity": "%",
                "wind_speed": "m/s",
            },
            raw_payload={"mock": True, "notice": "Simulated data for development and testing"},
        )

    def fetch_history(self, location, past_days: int = 7) -> List[NormalizedReading]:
        now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        readings = []
        total_hours = past_days * 24

        for h in range(total_hours, 0, -1):
            dt = now - timedelta(hours=h)
            hour = dt.hour
            base_pm25 = 45.0 + (location.id % 5) * 15.0 + 20.0 * math.sin(hour * math.pi / 12)
            pm25 = max(5.0, round(base_pm25, 1))
            pm10 = round(pm25 * 1.8, 1)
            no2 = round(25.0 + 10.0 * math.cos(hour * math.pi / 12), 1)
            so2 = round(12.0 + 3.0 * math.sin(hour * math.pi / 12), 1)
            co = round(650.0 + 150.0 * math.sin(hour * math.pi / 12), 1)
            o3 = round(35.0 + 15.0 * math.cos(hour * math.pi / 12), 1)

            pollutants = {
                "pm25": pm25,
                "pm10": pm10,
                "no2": no2,
                "so2": so2,
                "co": co,
                "o3": o3,
            }
            cpcb = calculate_cpcb_aqi(pollutants)

            readings.append(
                NormalizedReading(
                    provider="mock",
                    location_id=location.id,
                    observed_at=dt,
                    measurement_type="simulated",
                    pm25=pm25,
                    pm10=pm10,
                    no2=no2,
                    so2=so2,
                    co=co,
                    o3=o3,
                    aqi_value=float(cpcb["aqi"]) if cpcb["eligible"] else 100.0,
                    aqi_standard="IN_CPCB" if cpcb["eligible"] else "MOCK_SIMULATED",
                    units_metadata={"pm25": "µg/m³", "pm10": "µg/m³"},
                )
            )

        return readings
