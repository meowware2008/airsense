"""AQI report formatter for alerts and notifications."""

from datetime import datetime


def aqi_category(aqi: float, standard: str = None) -> tuple[str, str]:
    """Return (label, emoji) for an AQI value.

    Uses CPCB/India thresholds by default (same as used by Open-Meteo for India).
    Falls back to US EPA if standard contains 'EPA'.
    """
    std = (standard or "").upper()

    if "EPA" in std:
        # US EPA AQI thresholds
        if aqi <= 50:
            return "Good", "🟢"
        elif aqi <= 100:
            return "Moderate", "🟡"
        elif aqi <= 150:
            return "Unhealthy for Sensitive Groups", "🟠"
        elif aqi <= 200:
            return "Unhealthy", "🔴"
        elif aqi <= 300:
            return "Very Unhealthy", "🟣"
        else:
            return "Hazardous", "⚫"
    else:
        # India CPCB / NAQI thresholds (also sensible for EAQI)
        if aqi <= 50:
            return "Good", "🟢"
        elif aqi <= 100:
            return "Satisfactory", "🟡"
        elif aqi <= 200:
            return "Moderate", "🟠"
        elif aqi <= 300:
            return "Poor", "🔴"
        elif aqi <= 400:
            return "Very Poor", "🟣"
        else:
            return "Severe", "⚫"


def health_advice(aqi: float) -> str:
    """Short health advisory string based on AQI level."""
    if aqi <= 50:
        return "Air quality is clean. Enjoy outdoor activities."
    elif aqi <= 100:
        return "Air quality is acceptable. Sensitive individuals may feel mild effects."
    elif aqi <= 200:
        return "Sensitive groups should limit prolonged outdoor exertion."
    elif aqi <= 300:
        return "Everyone should reduce outdoor activity. Wear an N95 mask outside."
    elif aqi <= 400:
        return "Avoid outdoor activity. Keep windows closed and use an air purifier."
    else:
        return "Health emergency. Stay indoors. Avoid all outdoor exposure."


def _fmt(val, unit="", decimals=1) -> str:
    """Format a numeric reading or return '—' if None."""
    if val is None:
        return "—"
    return f"{round(val, decimals)}{unit}"


def format_alert_report(
    location_name: str,
    aqi: float,
    threshold: int,
    reading,          # AirQualityReading ORM instance (optional fields used if present)
    is_test: bool = False,
) -> str:
    """Build a rich, structured alert notification report.

    Format:

        🚨 AirSense Air Quality Alert
        📍 Delhi | CPCB  |  🔴 Poor

        AQI: *301*  (threshold: 100)

        💨 Pollutants
           PM2.5 : 142.3 µg/m³
           PM10  :  98.1 µg/m³
           NO₂   :  44.5 µg/m³
           O₃    :  18.2 µg/m³

        🌡️ Conditions: 24°C · 68% RH · Wind 3.2 m/s

        ⚠️ Avoid outdoor activity. Keep windows closed.

        _AirSense Environmental OS • 19 Nov 2026, 06:30 PM_
    """
    aqi_int = int(round(aqi))
    std = getattr(reading, "aqi_standard", None) or "CPCB"
    label, emoji = aqi_category(aqi_int, std)
    advice = health_advice(aqi_int)

    # Header
    header = "🧪 AirSense Test Message" if is_test else "🚨 AirSense Air Quality Alert"

    # Pollutant block — only include fields that have data
    pm25 = getattr(reading, "pm25", None)
    pm10 = getattr(reading, "pm10", None)
    no2  = getattr(reading, "no2",  None)
    o3   = getattr(reading, "o3",   None)
    so2  = getattr(reading, "so2",  None)
    co   = getattr(reading, "co",   None)

    pollutants = []
    if pm25 is not None:
        pollutants.append(f"  PM2.5 : {_fmt(pm25)} µg/m³")
    if pm10 is not None:
        pollutants.append(f"  PM10  : {_fmt(pm10)} µg/m³")
    if no2 is not None:
        pollutants.append(f"  NO₂   : {_fmt(no2)} µg/m³")
    if o3 is not None:
        pollutants.append(f"  O₃    : {_fmt(o3)} µg/m³")
    if so2 is not None:
        pollutants.append(f"  SO₂   : {_fmt(so2)} µg/m³")
    if co is not None:
        # CO is usually in µg/m³ (can be large), show as mg/m³ if > 1000
        co_val = co / 1000.0 if co > 500 else co
        co_unit = "mg/m³" if co > 500 else "µg/m³"
        pollutants.append(f"  CO    : {_fmt(co_val, '', 2)} {co_unit}")

    pollutant_block = ""
    if pollutants:
        pollutant_block = "💨 *Pollutants*\n" + "\n".join(pollutants) + "\n\n"

    # Weather / conditions
    temp  = getattr(reading, "temperature", None)
    hum   = getattr(reading, "humidity", None)
    wind  = getattr(reading, "wind_speed", None)
    conditions = []
    if temp is not None:
        conditions.append(f"{_fmt(temp, '°C', 0)}")
    if hum is not None:
        conditions.append(f"{_fmt(hum, '% RH', 0)}")
    if wind is not None:
        conditions.append(f"Wind {_fmt(wind, ' m/s', 1)}")
    condition_line = ""
    if conditions:
        condition_line = "🌡️ Conditions: " + " · ".join(conditions) + "\n\n"

    # Timestamp (IST)
    try:
        observed = getattr(reading, "observed_at", None) or datetime.utcnow()
        # Format as local-friendly string; server is UTC, add 5:30 for IST display
        from datetime import timedelta
        ist = observed + timedelta(hours=5, minutes=30)
        ts = ist.strftime("%-d %b %Y, %I:%M %p IST")
    except Exception:
        ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    threshold_line = f"threshold: {threshold}" if not is_test else f"your threshold is {threshold}"

    message = (
        f"{header}\n"
        f"📍 *{location_name}*  |  {std}  |  {emoji} {label}\n"
        f"\n"
        f"AQI: *{aqi_int}*  ({threshold_line})\n"
        f"\n"
        f"{pollutant_block}"
        f"{condition_line}"
        f"⚠️ {advice}\n"
        f"\n"
        f"_{ts}_"
    )
    return message
