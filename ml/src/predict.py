import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import joblib
import pandas as pd
import numpy as np
from ml.src.features import FEATURE_COLUMNS, create_time_series_features

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "random_forest_pm25.joblib"
METADATA_PATH = ARTIFACTS_DIR / "model_metadata.json"

_cached_model = None
_cached_metadata = None


def load_model_and_metadata():
    global _cached_model, _cached_metadata
    if _cached_model is None and MODEL_PATH.exists():
        _cached_model = joblib.load(MODEL_PATH)
    if _cached_metadata is None and METADATA_PATH.exists():
        with open(METADATA_PATH, "r") as f:
            _cached_metadata = json.load(f)
    return _cached_model, _cached_metadata


def predict_next_24h(recent_readings: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate 24-hour ahead hourly PM2.5 forecasts using recent history."""
    model, metadata = load_model_and_metadata()
    if not model or not metadata:
        return {
            "status": "unavailable",
            "message": "Forecasting model artifact is not loaded or yet trained.",
            "forecasts": [],
        }

    if len(recent_readings) < 24:
        return {
            "status": "insufficient_data",
            "message": f"At least 24 hours of sequential historical observations required (provided {len(recent_readings)}).",
            "forecasts": [],
        }

    # Format readings into DataFrame
    records = []
    for r in recent_readings:
        records.append({
            "timestamp": pd.to_datetime(r["observed_at"]),
            "pm25": float(r["pm25"]) if r.get("pm25") is not None else np.nan,
        })

    df = pd.DataFrame(records).sort_values("timestamp").set_index("timestamp")
    df["pm25"] = df["pm25"].interpolate(method="time").bfill().ffill()

    now_ref = df.index[-1]
    predictions = []

    # Iterative multi-step forecasting for 24 hourly steps
    current_df = df.copy()

    for h in range(1, 25):
        forecast_time = now_ref + timedelta(hours=h)
        # Create features from available history
        featured = create_time_series_features(current_df, target_col="pm25")
        last_row = featured.iloc[[-1]]

        # Ensure all columns present
        row_features = pd.DataFrame(index=[forecast_time])
        for col in FEATURE_COLUMNS:
            row_features[col] = last_row[col].values[0] if col in last_row else 0.0

        # Adjust calendar features for the future hour
        row_features["hour"] = forecast_time.hour
        row_features["day_of_week"] = forecast_time.dayofweek
        row_features["month"] = forecast_time.month

        # Predict
        pred_val = float(model.predict(row_features[FEATURE_COLUMNS])[0])
        pred_val = max(1.0, round(pred_val, 1))

        predictions.append({
            "forecast_for": forecast_time.isoformat(),
            "target_metric": "pm25",
            "predicted_value": pred_val,
            "unit": "µg/m³",
            "horizon_hours": h,
        })

        # Append prediction back into historical window for next lag iteration
        new_row = pd.DataFrame({"pm25": [pred_val]}, index=[forecast_time])
        current_df = pd.concat([current_df, new_row])

    return {
        "status": "available",
        "model_name": metadata.get("model_name", "RandomForestRegressor"),
        "model_version": metadata.get("model_version", "1.0.0"),
        "generated_at": datetime.utcnow().isoformat(),
        "evaluation_summary": metadata.get("evaluation", {}),
        "count": len(predictions),
        "forecasts": predictions,
    }
