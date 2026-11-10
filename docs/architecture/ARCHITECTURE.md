# AirSense --- Architecture and System Design

## 1. System Overview

AirSense is a 100% software-only air quality monitoring, forecasting, and alert platform. It periodically ingests atmospheric data from external meteorological providers, standardizes measurements with complete provenance, calculates official Indian National Air Quality Index (NAQI) using Central Pollution Control Board (CPCB) methodology, generates 24-hour predictive PM2.5 forecasts using a Random Forest model compared against a persistence baseline, and dispatches threshold alerts.

```
                    +--------------------------------+
                    |  External Providers (Open-     |
                    |  Meteo CAMS / Mock Adapter)    |
                    +---------------+----------------+
                                    |
                                    v
                       +-------------------------+
                       | Ingestion Worker Daemon |
                       | (worker/worker.py)      |
                       +------------+------------+
                                    |
                                    v
+------------------+   HTTP    +----+--------------------+
|  React SPA (UI)  | <=======> |   Flask REST Backend    |
|  (Optional/Next) |           |  (backend/app/api)      |
+------------------+           +----+---------------+----+
                                    |               |
                                    v               v
                      +-------------+----+   +------+-------------+
                      | MySQL 8.0 / DB   |   |   Alert Engine     |
                      | - Locations      |   | - In-App Notifs    |
                      | - Readings       |   | - Cooldown State   |
                      | - Forecasts      |   +--------------------+
                      | - Preferences    |
                      +-------------+----+
                                    |
                                    v
                      +-------------+------------+
                      | ML Forecasting Pipeline  |
                      | - Chronological Splits   |
                      | - RF Regressor           |
                      | - Persistence Baseline   |
                      +--------------------------+
```

---

## 2. Component Design

### 2.1 Provider Abstraction Layer (`backend/app/providers/`)
- `BaseAirQualityProvider`: Abstract base class enforcing `fetch_current` and `fetch_history` interfaces.
- `OpenMeteoProvider`: Live external integration querying Copernicus Atmosphere Monitoring Service (CAMS) numerical models via Open-Meteo's API.
- `MockProvider`: Controlled, deterministic simulation provider generating realistic synthetic data with clear `measurement_type='simulated'` provenance tags.
- `get_provider(name)`: Factory returning configured provider.

### 2.2 Indian AQI Calculation Engine (`backend/app/services/aqi_calculator.py`)
- Implements official CPCB sub-index linear interpolation:
  $$I_p = I_{low} + \frac{I_{high} - I_{low}}{B_{high} - B_{low}} \times (C_p - B_{low})$$
- Breakpoint categories: Good (0–50), Satisfactory (51–100), Moderate (101–200), Poor (201–300), Very Poor (301–400), Severe (401–500).
- Minimum criteria: At least 3 monitored pollutants with at least one particulate ($PM_{2.5}$ or $PM_{10}$).
- Honest fallback: If criteria are unmet, sub-indices are presented alongside provider's foreign AQI standard (e.g. US EPA AQI) without misrepresenting it as Indian AQI.

### 2.3 Scheduled Ingestion Worker (`worker/worker.py`)
- Independent background daemon running periodic polling cycles.
- Idempotent insertion using unique constraint on `(provider, location_id, observed_at)`.
- Updates `IngestionRun` audit table and Prometheus metrics (`airsense_ingestion_runs_total`).
- Triggers alert evaluation upon newly ingested readings.

### 2.4 Alert Engine (`backend/app/services/alert_service.py`)
- Evaluates newly recorded readings against user `AlertPreference` records.
- Enforces a 6-hour cooldown window to prevent alert fatigue from repeated elevated hourly readings.
- Stores in-app `Notification` entries and gracefully attempts email notification when SMTP is configured.

### 2.5 Machine Learning Pipeline (`ml/src/`)
- Target: 24-hour ahead hourly $PM_{2.5}$ concentration ($\mu g/m^3$).
- Feature Engineering (`features.py`): Time lags ($t-1, t-2, t-3, t-6, t-12, t-24$), 6-hour and 24-hour rolling averages and standard deviations, calendar cyclical features. Strict past-only indexing eliminates lookahead bias.
- Evaluation (`train.py`): Strict chronological split (70% train, 15% validation, 15% test). Never randomly shuffled.
- Comparative Benchmark: `RandomForestRegressor` evaluated alongside a naive persistence baseline ($y_{t+24} = y_t$). Results reported via MAE and RMSE in `ml/artifacts/model_metadata.json`.

---

## 3. Database Schema

- `users`: ID, name, email (unique), password_hash, created_at.
- `locations`: ID, name, region, country, latitude, longitude, created_at.
- `air_quality_readings`: ID, location_id, provider, measurement_type, aqi_value, aqi_standard, pm25, pm10, no2, so2, co, o3, observed_at, ingested_at.
- `forecasts`: ID, location_id, model_name, model_version, target_metric, predicted_value, unit, forecast_for, generated_at.
- `alert_preferences`: ID, user_id, location_id, threshold_value, enabled, created_at, updated_at.
- `notifications`: ID, user_id, alert_preference_id, location_id, message, channel, status, triggering_reading_id, created_at.
- `ingestion_runs`: ID, provider, started_at, finished_at, status, records_fetched, records_saved, error_summary.

---

## 4. Operational Monitoring
- **Prometheus**: Scrapes `/metrics` on backend:5000 every 15s.
- **Metrics**: `airsense_http_requests_total`, `airsense_http_request_duration_seconds`, `airsense_ingestion_runs_total`, `airsense_ingestion_records_saved_total`, `airsense_active_alerts_total`.
- **Grafana**: Pre-provisioned operational dashboard tracking latency, request volume, ingestion reliability, and active alerts.
