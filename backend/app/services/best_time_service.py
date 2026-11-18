
from datetime import datetime, timedelta, timezone
from math import isfinite


def find_best_time_window(forecasts, window_hours=3):
    """
    Find the best consecutive hourly window based on predicted PM2.5.

    Lower average PM2.5 indicates a comparatively cleaner period.
    This is a PM2.5-based recommendation, not an official AQI or
    guarantee of safe outdoor air.
    """

    if not forecasts:
        return {
            "status": "unavailable",
            "message": "No forecast data available.",
            "best_window": None,
        }

    
    now = datetime.now(timezone.utc)
    valid_forecasts = []

    for forecast in forecasts:
        try:
            timestamp = datetime.fromisoformat(forecast["forecast_for"])

            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=timezone.utc)
            else:
                timestamp = timestamp.astimezone(timezone.utc)
            value = float(forecast["predicted_value"])

            if not isfinite(value) or value < 0:
                continue

           
            if timestamp > now:
                valid_forecasts.append({
                    "forecast_for": timestamp,
                    "pm25": value,
                })

        except (KeyError, TypeError, ValueError):
            continue

    valid_forecasts.sort(key=lambda item: item["forecast_for"])

    if len(valid_forecasts) < window_hours:
        return {
            "status": "unavailable",
            "message": "Not enough future forecast hours to find a suitable window.",
            "best_window": None,
        }

    best_window = None

    for index in range(len(valid_forecasts) - window_hours + 1):
        window = valid_forecasts[index:index + window_hours]

        # Ensure all hours are consecutive.
        consecutive = all(
            window[i]["forecast_for"] - window[i - 1]["forecast_for"]
            == timedelta(hours=1)
            for i in range(1, len(window))
        )

        if not consecutive:
            continue

        values = [item["pm25"] for item in window]
        average_pm25 = sum(values) / len(values)
        maximum_pm25 = max(values)

        candidate = {
            "start": window[0]["forecast_for"].isoformat(),
            "end": (window[-1]["forecast_for"] + timedelta(hours=1)).isoformat(),
            "duration_hours": window_hours,
            "average_pm25": round(average_pm25, 2),
            "maximum_pm25": round(maximum_pm25, 2),
        }

        if (
            best_window is None
            or candidate["average_pm25"] < best_window["average_pm25"]
            or (
                candidate["average_pm25"] == best_window["average_pm25"]
                and candidate["maximum_pm25"] < best_window["maximum_pm25"]
            )
        ):
            best_window = candidate

    if best_window is None:
        return {
            "status": "unavailable",
            "message": "No consecutive forecast window found.",
            "best_window": None,
        }

    return {
        "status": "available",
        "message": "Best available window based on predicted PM2.5.",
        "metric": "PM2.5",
        "unit": "µg/m³",
        "best_window": best_window,
    }