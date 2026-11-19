import os
import logging
from datetime import datetime
from typing import Optional, List
import requests
from backend.app.providers.base import BaseAirQualityProvider, NormalizedReading
from backend.app.providers.open_meteo import OpenMeteoProvider
from backend.app.services.aqi_calculator import calculate_cpcb_aqi

logger = logging.getLogger(__name__)


class WAQIProvider(BaseAirQualityProvider):
    """World Air Quality Index (WAQI) / CPCB Ground Stations Provider.

    Fetches physical Continuous Ambient Air Quality Monitoring Station (CAAQMS)
    sensor telemetry published by CPCB and State Pollution Control Boards.
    Measurement Type: 'observed'.
    """
    BASE_URL = "https://api.waqi.info/feed"

    def __init__(self, api_key: Optional[str] = None, timeout: int = 10):
        self.api_key = api_key or os.getenv("AQI_API_KEY") or os.getenv("WAQI_TOKEN")
        self.timeout = timeout
        self.fallback_provider = OpenMeteoProvider(timeout=timeout)

    def fetch_current(self, location) -> Optional[NormalizedReading]:
        if not self.api_key:
            # No token configured; seamlessly fallback to Open-Meteo CAMS provider
            return self.fallback_provider.fetch_current(location)

        url = f"{self.BASE_URL}/geo:{location.latitude};{location.longitude}/"
        params = {"token": self.api_key}

        try:
            resp = requests.get(url, params=params, timeout=self.timeout)
            resp.raise_for_status()
            res_json = resp.json()
        except Exception as e:
            logger.warning(f"WAQI fetch failed for location {location.id}: {e}. Falling back to Open-Meteo.")
            return self.fallback_provider.fetch_current(location)

        if res_json.get("status") != "ok":
            logger.warning(f"WAQI returned status {res_json.get('status')}: {res_json.get('data')}. Falling back.")
            return self.fallback_provider.fetch_current(location)

        data = res_json.get("data", {})
        iaqi = data.get("iaqi", {})
        station_name = data.get("city", {}).get("name", f"Station near {location.name}")

        time_data = data.get("time", {})
        time_str = time_data.get("s")
        try:
            observed_at = datetime.fromisoformat(time_str) if time_str else datetime.utcnow()
        except Exception:
            observed_at = datetime.utcnow()

        pollutants = {
            "pm25": iaqi.get("pm25", {}).get("v"),
            "pm10": iaqi.get("pm10", {}).get("v"),
            "no2": iaqi.get("no2", {}).get("v"),
            "so2": iaqi.get("so2", {}).get("v"),
            "co": iaqi.get("co", {}).get("v"),
            "o3": iaqi.get("o3", {}).get("v"),
        }

        # Calculate Indian National AQI (CPCB NAQI)
        cpcb_res = calculate_cpcb_aqi(pollutants)
        if cpcb_res["eligible"]:
            aqi_val = float(cpcb_res["aqi"])
            aqi_std = "IN_CPCB"
        else:
            raw_aqi = data.get("aqi")
            aqi_val = float(raw_aqi) if raw_aqi is not None and isinstance(raw_aqi, (int, float)) else None
            aqi_std = "US_EPA" if aqi_val is not None else None

        temperature = iaqi.get("t", {}).get("v")
        humidity = iaqi.get("h", {}).get("v")
        wind_speed = iaqi.get("w", {}).get("v")

        # If meteorological sensors are absent at ground station, augment from live Open-Meteo Weather
        if temperature is None or humidity is None or wind_speed is None:
            try:
                wx_params = {
                    "latitude": location.latitude,
                    "longitude": location.longitude,
                    "current": "temperature_2m,relative_humidity_2m,wind_speed_10m",
                    "timezone": "UTC",
                }
                wx_res = requests.get(self.fallback_provider.WEATHER_URL, params=wx_params, timeout=self.timeout)
                if wx_res.status_code == 200:
                    curr_wx = wx_res.json().get("current", {})
                    if temperature is None:
                        temperature = curr_wx.get("temperature_2m")
                    if humidity is None:
                        humidity = curr_wx.get("relative_humidity_2m")
                    if wind_speed is None:
                        wind_speed = curr_wx.get("wind_speed_10m")
            except Exception:
                pass

        return NormalizedReading(
            provider="cpcb_waqi",
            location_id=location.id,
            observed_at=observed_at,
            measurement_type="observed",
            source_record_id=station_name,
            pm25=pollutants["pm25"],
            pm10=pollutants["pm10"],
            no2=pollutants["no2"],
            so2=pollutants["so2"],
            co=pollutants["co"],
            o3=pollutants["o3"],
            temperature=temperature,
            humidity=humidity,
            wind_speed=wind_speed,
            aqi_value=aqi_val,
            aqi_standard=aqi_std,
            units_metadata={
                "pm25": "µg/m³",
                "pm10": "µg/m³",
                "no2": "µg/m³",
                "so2": "µg/m³",
                "co": "mg/m³",
                "o3": "µg/m³",
                "temperature": "°C",
                "humidity": "%",
                "wind_speed": "km/h",
            },
            raw_payload={
                "station": station_name,
                "attributions": data.get("attributions", []),
            },
        )

    def fetch_history(self, location, past_days: int = 7) -> List[NormalizedReading]:
        # WAQI free API only serves current station observation; delegate history to Open-Meteo
        return self.fallback_provider.fetch_history(location, past_days=past_days)
