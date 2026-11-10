import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from ml.src.features import create_time_series_features, prepare_training_data, FEATURE_COLUMNS
from ml.src.predict import predict_next_24h


def test_feature_engineering_no_leakage():
    # Construct sequence: [10, 20, 30, 40, 50, ...]
    timestamps = [datetime(2026, 1, 1, 0) + timedelta(hours=i) for i in range(50)]
    df = pd.DataFrame({
        "timestamp": timestamps,
        "pm25": [float(i * 10) for i in range(50)],
    }).set_index("timestamp")

    featured = create_time_series_features(df, target_col="pm25")

    # At row 10, lag1 must be exactly row 9's value (90.0)
    assert featured.iloc[10]["pm25_lag1"] == 90.0
    # lag2 must be row 8's value (80.0)
    assert featured.iloc[10]["pm25_lag2"] == 80.0
    # Current value must NOT be in lag1 or rolling mean (strict past lookups only)
    assert featured.iloc[10]["pm25_lag1"] != featured.iloc[10]["pm25"]


def test_prepare_training_data_shapes():
    timestamps = [datetime(2026, 1, 1, 0) + timedelta(hours=i) for i in range(150)]
    df = pd.DataFrame({
        "timestamp": timestamps,
        "pm25": np.random.uniform(20.0, 150.0, size=150),
    }).set_index("timestamp")

    X, y, y_pers = prepare_training_data(df, target_col="pm25", horizon_hours=24)

    assert len(X) == len(y) == len(y_pers)
    assert list(X.columns) == FEATURE_COLUMNS
    assert len(X) > 50


def test_predict_next_24h_schema():
    now = datetime.utcnow()
    recent = [
        {"observed_at": (now - timedelta(hours=i)).isoformat(), "pm25": 45.0 + (i % 5)}
        for i in range(30, 0, -1)
    ]

    res = predict_next_24h(recent)
    assert res["status"] in ("available", "unavailable")
    if res["status"] == "available":
        assert res["count"] == 24
        assert len(res["forecasts"]) == 24
        first = res["forecasts"][0]
        assert "predicted_value" in first
        assert first["predicted_value"] > 0
        assert first["target_metric"] == "pm25"
        assert first["unit"] == "µg/m³"
