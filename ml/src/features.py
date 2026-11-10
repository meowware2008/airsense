import pandas as pd
import numpy as np
from typing import Tuple, List

FEATURE_COLUMNS = [
    "pm25_lag1",
    "pm25_lag2",
    "pm25_lag3",
    "pm25_lag6",
    "pm25_lag12",
    "pm25_lag24",
    "pm25_rolling_mean_6h",
    "pm25_rolling_std_6h",
    "pm25_rolling_mean_24h",
    "hour",
    "day_of_week",
    "month",
]


def create_time_series_features(df: pd.DataFrame, target_col: str = "pm25") -> pd.DataFrame:
    """Engineer time-series features strictly using past observations to prevent data leakage.
    
    Expects df with a DatetimeIndex or a 'timestamp' column sorted chronologically.
    """
    data = df.copy()
    if "timestamp" in data.columns and not isinstance(data.index, pd.DatetimeIndex):
        data["timestamp"] = pd.to_datetime(data["timestamp"])
        data = data.sort_values("timestamp").set_index("timestamp")
    else:
        data = data.sort_index()

    # Time-based calendar features
    data["hour"] = data.index.hour
    data["day_of_week"] = data.index.dayofweek
    data["month"] = data.index.month

    # Strict past-only lag features (shift >= 1)
    for lag in [1, 2, 3, 6, 12, 24]:
        data[f"{target_col}_lag{lag}"] = data[target_col].shift(lag)

    # Rolling statistics over past observations (shift by 1 so the current value is not included)
    shifted = data[target_col].shift(1)
    data[f"{target_col}_rolling_mean_6h"] = shifted.rolling(window=6, min_periods=3).mean()
    data[f"{target_col}_rolling_std_6h"] = shifted.rolling(window=6, min_periods=3).std().fillna(0)
    data[f"{target_col}_rolling_mean_24h"] = shifted.rolling(window=24, min_periods=12).mean()

    return data


def prepare_training_data(
    df: pd.DataFrame,
    target_col: str = "pm25",
    horizon_hours: int = 24
) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
    """Prepares feature matrix X, ground truth target y, and naive persistence baseline y_persistence.
    
    Returns: (X, y, y_persistence) after dropping rows with missing feature lags.
    """
    featured = create_time_series_features(df, target_col=target_col)

    # Future target: value h hours ahead
    featured["target"] = featured[target_col].shift(-horizon_hours)

    # Naive persistence baseline: predict future value equals latest known value (lag 1)
    featured["persistence_baseline"] = featured[f"{target_col}_lag1"]

    # Drop NaNs arising from lags and forward shift
    valid = featured.dropna(subset=FEATURE_COLUMNS + ["target", "persistence_baseline"])

    X = valid[FEATURE_COLUMNS]
    y = valid["target"]
    y_pers = valid["persistence_baseline"]

    return X, y, y_pers
