import logging
from datetime import datetime
from typing import Optional, List
import requests
from backend.app.providers.base import BaseAirQualityProvider, NormalizedReading
from backend.app.services.aqi_calculator import calculate_cpcb_aqi

logger = logging.getLogger(__name__)


class OpenMeteoProvider(BaseAirQualityProvider):
    """Open-Meteo Air Quality API integration.
    
    Data Source: Copernicus Atmosphere Monitoring Service (CAMS) models.
    Measurement Type: 'modelled'.
    Free/open access without API key requirement.
    """
    BASE_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

    def __init__(self, timeout: int = 10):
        self.timeout = timeout

    def fetch_current(self, location) -> Optional[NormalizedReading]:
        params = {
            "latitude": location.latitude,
            "longitude": location.longitude,
            "current": "pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide,us_aqi,european_aqi",
            "timezone": "UTC",
        }
        try:
            resp = requests.get(self.BASE_URL, params=params, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.error(f"Open-Meteo fetch_current failed for location {location.id}: {e}")
            return None

        current = data.get("current")
        if not current:
            return None

        time_str = current.get("time")
        observed_at = datetime.fromisoformat(time_str.replace("Z", "")) if time_str else datetime.utcnow()

        pollutants = {
            "pm25": current.get("pm2_5"),
            "pm10": current.get("pm10"),
            "no2": current.get("nitrogen_dioxide"),
            "so2": current.get("sulphur_dioxide"),
            "co": current.get("carbon_monoxide"),
            "o3": current.get("ozone"),
        }

        # Calculate CPCB Indian AQI
        cpcb_result = calculate_cpcb_aqi(pollutants)
        if cpcb_result["eligible"]:
            aqi_val = float(cpcb_result["aqi"])
            aqi_std = "IN_CPCB"
        else:
            # Fallback to provider-calculated standard with honest label
            aqi_val = float(current.get("us_aqi")) if current.get("us_aqi") is not None else None
            aqi_std = "US_EPA" if aqi_val is not None else None

        units = data.get("current_units", {})

        return NormalizedReading(
            provider="open_meteo",
            location_id=location.id,
            observed_at=observed_at,
            measurement_type="modelled",
            pm25=pollutants["pm25"],
            pm10=pollutants["pm10"],
            no2=pollutants["no2"],
            so2=pollutants["so2"],
            co=pollutants["co"],
            o3=pollutants["o3"],
            aqi_value=aqi_val,
            aqi_standard=aqi_std,
            units_metadata=units,
            raw_payload={
                "current": current,
                "cpcb_evaluation": cpcb_result,
            },
        )

    def fetch_history(self, location, past_days: int = 7) -> List[NormalizedReading]:
        params = {
            "latitude": location.latitude,
            "longitude": location.longitude,
            "past_days": past_days,
            "forecast_days": 1,
            "hourly": "pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide,us_aqi",
            "timezone": "UTC",
        }
        try:
            resp = requests.get(self.BASE_URL, params=params, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.error(f"Open-Meteo fetch_history failed for location {location.id}: {e}")
            return []

        hourly = data.get("hourly")
        if not hourly or "time" not in hourly:
            return []

        times = hourly["time"]
        pm25_list = hourly.get("pm2_5", [])
        pm10_list = hourly.get("pm10", [])
        no2_list = hourly.get("nitrogen_dioxide", [])
        so2_list = hourly.get("sulphur_dioxide", [])
        co_list = hourly.get("carbon_monoxide", [])
        o3_list = hourly.get("ozone", [])
        us_aqi_list = hourly.get("us_aqi", [])

        units = data.get("hourly_units", {})
        readings = []

        now_utc = datetime.utcnow()
        for i, t_str in enumerate(times):
            obs_dt = datetime.fromisoformat(t_str.replace("Z", ""))
            # Keep historical observations up to current time
            if obs_dt > now_utc:
                continue

            pollutants = {
                "pm25": pm25_list[i] if i < len(pm25_list) else None,
                "pm10": pm10_list[i] if i < len(pm10_list) else None,
                "no2": no2_list[i] if i < len(no2_list) else None,
                "so2": so2_list[i] if i < len(so2_list) else None,
                "co": co_list[i] if i < len(co_list) else None,
                "o3": o3_list[i] if i < len(o3_list) else None,
            }

            cpcb_res = calculate_cpcb_aqi(pollutants)
            if cpcb_res["eligible"]:
                aqi_val = float(cpcb_res["aqi"])
                aqi_std = "IN_CPCB"
            else:
                us_aqi = us_aqi_list[i] if i < len(us_aqi_list) else None
                aqi_val = float(us_aqi) if us_aqi is not None else None
                aqi_std = "US_EPA" if aqi_val is not None else None

            readings.append(
                NormalizedReading(
                    provider="open_meteo",
                    location_id=location.id,
                    observed_at=obs_dt,
                    measurement_type="modelled",
                    pm25=pollutants["pm25"],
                    pm10=pollutants["pm10"],
                    no2=pollutants["no2"],
                    so2=pollutants["so2"],
                    co=pollutants["co"],
                    o3=pollutants["o3"],
                    aqi_value=aqi_val,
                    aqi_standard=aqi_std,
                    units_metadata=units,
                )
            )

        return readings
