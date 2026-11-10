import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import json
from datetime import datetime
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from ml.src.dataset import fetch_or_generate_delhi_historical
from ml.src.features import prepare_training_data, FEATURE_COLUMNS

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"


def train_baseline_pipeline(data_path: Path = None, save_artifact: bool = True):
    """Train Random Forest model and compare strictly with naive persistence baseline."""
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    df = fetch_or_generate_delhi_historical(csv_path=data_path)

    X, y, y_pers = prepare_training_data(df, target_col="pm25", horizon_hours=24)

    total_samples = len(X)
    if total_samples < 100:
        raise ValueError(f"Insufficient samples ({total_samples}) to train model.")

    # Chronological Split (70% train, 15% val, 15% test) - NO RANDOM SHUFFLING
    train_idx = int(total_samples * 0.70)
    val_idx = int(total_samples * 0.85)

    X_train, y_train = X.iloc[:train_idx], y.iloc[:train_idx]
    X_val, y_val = X.iloc[train_idx:val_idx], y.iloc[train_idx:val_idx]
    X_test, y_test = X.iloc[val_idx:], y.iloc[val_idx:]
    y_pers_test = y_pers.iloc[val_idx:]

    # Train Random Forest Regressor
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=12,
        min_samples_split=5,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # Predictions
    y_pred_val = model.predict(X_val)
    y_pred_test = model.predict(X_test)

    # Metrics on Test Set
    rf_mae = float(mean_absolute_error(y_test, y_pred_test))
    rf_rmse = float(root_mean_squared_error(y_test, y_pred_test))

    # Persistence Baseline Metrics
    pers_mae = float(mean_absolute_error(y_test, y_pers_test))
    pers_rmse = float(root_mean_squared_error(y_test, y_pers_test))

    metadata = {
        "model_name": "RandomForestRegressor",
        "model_version": "1.0.0",
        "target_metric": "pm25",
        "horizon_hours": 24,
        "feature_columns": FEATURE_COLUMNS,
        "sample_counts": {
            "total": total_samples,
            "train": len(X_train),
            "validation": len(X_val),
            "test": len(X_test),
        },
        "evaluation": {
            "random_forest": {
                "test_mae": round(rf_mae, 2),
                "test_rmse": round(rf_rmse, 2),
            },
            "persistence_baseline": {
                "test_mae": round(pers_mae, 2),
                "test_rmse": round(pers_rmse, 2),
            },
            "mae_improvement_pct": round(((pers_mae - rf_mae) / pers_mae) * 100, 2),
            "rmse_improvement_pct": round(((pers_rmse - rf_rmse) / pers_rmse) * 100, 2),
        },
        "trained_at": datetime.utcnow().isoformat(),
        "notes": "Chronological train/val/test split without lookahead leakage. Evaluated against persistence baseline.",
    }

    if save_artifact:
        model_file = ARTIFACTS_DIR / "random_forest_pm25.joblib"
        meta_file = ARTIFACTS_DIR / "model_metadata.json"
        joblib.dump(model, model_file)
        with open(meta_file, "w") as f:
            json.dump(metadata, f, indent=2)

    return model, metadata


if __name__ == "__main__":
    _, meta = train_baseline_pipeline()
    print("Training finished successfully. Metadata:")
    print(json.dumps(meta, indent=2))
