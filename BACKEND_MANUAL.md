# AirSense --- Backend Operations & Architecture Manual

This manual serves as the single reference for the backend engine, data ingestion pipeline, machine learning model, database layer, and DevOps infrastructure of **AirSense**.

---

## 1. System Architecture & Component Topology

AirSense is a **100% software-only** platform. It has no physical sensors, IoT devices, or microcontrollers. It ingests atmospheric and meteorological readings from external weather APIs, normalizes and stores the data with provenance, calculates the official Indian National Air Quality Index (NAQI), forecasts 24-hour pollution trajectories using Machine Learning, and triggers threshold-based alerts.

```
                             +-----------------------------------+
                             |     External Meteorological       |
                             |   APIs (Open-Meteo CAMS / Mock)   |
                             +-----------------+-----------------+
                                               |
                                               v
                                  +-------------------------+
                                  | Ingestion Worker Daemon |
                                  |   (worker/worker.py)    |
                                  +------------+------------+
                                               |
                                               v
+-----------------------+     HTTP        +----+--------------------+
|  Frontend Client /    | <=============> |   Flask REST Backend    |
|  Partner UI / Postman |      JSON       |   (backend/app/api/)    |
+-----------------------+                 +----+---------------+----+
                                               |               |
                                               v               v
                                 +-------------+----+   +------+-------------+
                                 | MySQL 8.0 / DB   |   |    Alert Engine    |
                                 | - 7 Core Tables  |   | - In-App Notifs    |
                                 | - Migrations     |   | - 6-Hour Cooldown  |
                                 +-------------+----+   +--------------------+
                                               |
                                               v
                                 +-------------+------------+
                                 |  ML Forecasting Engine   |
                                 | - Random Forest Model    |
                                 | - Persistence Baseline   |
                                 +--------------------------+

DevOps & Operational Layer:
- Prometheus (scrapes :5000/metrics every 15s) -> Grafana (:3001 operational dashboard)
- GitHub Actions CI (pytest + flake8 + Trivy) -> Jenkins CD -> Terraform & Ansible
```

---

## 2. Directory Structure

```
airsense/
├── backend/
│   ├── app/
│   │   ├── __init__.py           # Flask app factory, CORS, metrics hooks, DB teardown
│   │   ├── config.py             # Environment configurations (Dev, Test, Prod)
│   │   ├── database.py           # SQLAlchemy engine, sessionmaker, scoped sessions
│   │   ├── models/               # Domain ORM models (User, Location, Reading, etc.)
│   │   ├── api/                  # Blueprint routes (auth, locations, air_quality, etc.)
│   │   ├── providers/            # Provider adapters (Base, OpenMeteo, Mock)
│   │   ├── services/             # Core business logic (AQI math, ingestion, alerts)
│   │   └── monitoring/           # Prometheus metric declarations
│   ├── migrations/               # Alembic database migration scripts
│   ├── requirements.txt          # Python backend dependencies
│   ├── seed.py                   # Controlled CLI seeding script for testing/demo
│   ├── wsgi.py                   # Production WSGI application entrypoint
│   └── Dockerfile                # Multi-stage container definition
├── worker/
│   ├── worker.py                 # Scheduled background ingestion and alert daemon
│   └── Dockerfile                # Dedicated worker container definition
├── ml/
│   ├── src/                      # Feature engineering, training, inference
│   ├── artifacts/                # Serialized model (.joblib) & metadata (.json)
│   ├── data/                     # Historical training datasets
│   └── requirements.txt          # ML dependencies (pandas, scikit-learn, numpy)
├── tests/                        # 29 automated Pytest unit and integration tests
├── monitoring/
│   ├── prometheus/               # Prometheus scraper configuration & Dockerfile
│   └── grafana/                  # Grafana datasources, dashboards & Dockerfile
├── infrastructure/
│   ├── terraform/                # Single-VM cloud provisioning (AWS EC2)
│   └── ansible/                  # Server configuration and Docker deployment playbook
├── docs/api/                     # OpenAPI 3.0 specification & Postman collection
├── docker-compose.yml            # Multi-container orchestration (5 services)
├── .env.example                  # Environment variable reference
└── README.md                     # General setup documentation
```

---

## 3. Database Layer & Migrations

The database is built on **MySQL 8.0** using **SQLAlchemy 2.0** ORM and managed through **Alembic** migrations.

### 3.1 Relational Schema (7 Core Tables)
1. `users`: Stores user credentials (`id`, `name`, `email` [unique], `password_hash`, `created_at`).
2. `locations`: Geographic entities (`id`, `name`, `region`, `country`, `latitude`, `longitude`, `created_at`).
3. `air_quality_readings`: Environmental observations (`id`, `location_id`, `provider`, `measurement_type`, `aqi_value`, `aqi_standard`, `pm25`, `pm10`, `no2`, `so2`, `co`, `o3`, `temperature`, `humidity`, `wind_speed`, `observed_at`, `ingested_at`).
   - *Idempotency Constraint:* Unique key on `(provider, location_id, observed_at)`.
4. `forecasts`: Stored predictions (`id`, `location_id`, `model_name`, `model_version`, `target_metric`, `predicted_value`, `unit`, `forecast_for`, `generated_at`, `evaluation_context`).
5. `alert_preferences`: User threshold settings (`id`, `user_id`, `location_id`, `threshold_value`, `enabled`, `created_at`, `updated_at`).
6. `notifications`: Alert history log (`id`, `user_id`, `alert_preference_id`, `location_id`, `message`, `channel`, `status`, `triggering_reading_id`, `created_at`, `sent_at`).
7. `ingestion_runs`: Ingestion audit log (`id`, `provider`, `location_id`, `started_at`, `finished_at`, `status`, `records_fetched`, `records_saved`, `error_summary`).

### 3.2 Alembic Migration Commands
Migrations track schema evolution under version control:
```bash
# Apply all pending migrations to database
alembic upgrade head

# Generate a new migration after editing models
alembic revision --autogenerate -m "describe_changes"

# Roll back the most recent migration
alembic downgrade -1
```

---

## 4. Official Indian AQI Engine (CPCB NAQI)

Located in [`backend/app/services/aqi_calculator.py`](backend/app/services/aqi_calculator.py).

### 4.1 Sub-Index Linear Interpolation
For each pollutant $p$, its sub-index $I_p$ is calculated using the official CPCB linear formula:

$$I_p = I_{low} + \frac{I_{high} - I_{low}}{B_{high} - B_{low}} \times (C_p - B_{low})$$

Where:
- $C_p$: Measured pollutant concentration.
- $B_{low}, B_{high}$: Lower and upper breakpoint concentrations for the corresponding category.
- $I_{low}, I_{high}$: Lower and upper AQI index values for the corresponding category.

### 4.2 Breakpoints & Categories
| Category | AQI Range | PM2.5 ($\mu g/m^3$) | PM10 ($\mu g/m^3$) | NO2 ($\mu g/m^3$) | SO2 ($\mu g/m^3$) | CO ($mg/m^3$) | O3 ($\mu g/m^3$) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Good** | 0 – 50 | 0 – 30 | 0 – 50 | 0 – 40 | 0 – 40 | 0.0 – 1.0 | 0 – 50 |
| **Satisfactory** | 51 – 100 | 31 – 60 | 51 – 100 | 41 – 80 | 41 – 80 | 1.1 – 2.0 | 51 – 100 |
| **Moderate** | 101 – 200 | 61 – 90 | 101 – 250 | 81 – 180 | 81 – 380 | 2.1 – 10.0 | 101 – 168 |
| **Poor** | 201 – 300 | 91 – 120 | 251 – 350 | 181 – 280 | 381 – 800 | 10.1 – 17.0 | 169 – 208 |
| **Very Poor** | 301 – 400 | 121 – 250 | 351 – 430 | 281 – 400 | 801 – 1600 | 17.1 – 34.0 | 209 – 748 |
| **Severe** | 401 – 500 | 250+ | 430+ | 400+ | 1600+ | 34.0+ | 748+ |

### 4.3 CPCB Data Sufficiency Criteria
Per the National Air Quality Index guidelines:
1. **At least 3 pollutants** must be monitored.
2. **At least one must be a particulate matter** ($PM_{2.5}$ or $PM_{10}$).
3. **Overall AQI** is the maximum sub-index: $\text{AQI} = \max(I_{PM2.5}, I_{PM10}, I_{NO2}, \dots)$.
4. If criteria are unmet, AirSense honestly marks `eligible: false` and displays pollutant measurements with foreign standards without misrepresenting them as Indian AQI.

---

## 5. Ingestion Pipeline & Background Worker

Located in [`backend/app/providers/`](backend/app/providers/) and [`worker/worker.py`](worker/worker.py).

### 5.1 Provider Adapter Pattern
- **`BaseAirQualityProvider`**: Abstract contract requiring `fetch_current(location)` and `fetch_history(location, past_days)`.
- **`OpenMeteoProvider`**: Queries the Copernicus Atmosphere Monitoring Service (CAMS) numerical models via Open-Meteo's free REST API. Marks provenance as `measurement_type='modelled'`.
- **`MockProvider`**: Deterministic synthetic generator for offline development, local CI, and testing. Marks provenance as `measurement_type='simulated'`.

### 5.2 Worker Daemon
- Runs as an independent process/container (`airsense-worker`).
- Polls providers at a configurable interval (`INGESTION_INTERVAL_MINUTES=60`).
- Performs idempotent insertions: if a record with `(provider, location_id, observed_at)` already exists, insertion is skipped.
- Triggers alert evaluations immediately upon saving new records.
- Logs execution status into the `ingestion_runs` table and updates Prometheus metrics.
- Can be invoked manually for a single cycle:
  ```bash
  python worker/worker.py --once
  ```

---

## 6. Machine Learning Forecasting Pipeline

Located in [`ml/src/`](ml/src/).

### 6.1 Objective & Strategy
Forecast hourly $PM_{2.5}$ concentration for the upcoming **24 hours** without lookahead bias.

### 6.2 Feature Engineering (`features.py`)
Features use strictly past observations:
- **Lags:** $t-1, t-2, t-3, t-6, t-12, t-24$ hours.
- **Rolling Statistics:** 6-hour and 24-hour rolling averages and standard deviations, shifted by 1 hour so the current hour is excluded.
- **Calendar Signals:** Hour of the day (0–23), Day of the week (0–6), Month (1–12).

### 6.3 Evaluation & Baseline Comparison (`train.py`)
- **Validation Split:** Chronological split (70% train, 15% validation, 15% test). Never randomly shuffled.
- **Persistence Benchmark:** Naive baseline predicting future value equals the latest known value ($y_{t+24} = y_t$).
- **Model:** `RandomForestRegressor` (100 estimators, max depth 12).
- **Evaluation Reporting:** Stored in [`ml/artifacts/model_metadata.json`](ml/artifacts/model_metadata.json).

### 6.4 Inference Engine (`predict.py`)
Takes the latest 24+ hours of sequential observations for a location, iteratively constructs feature vectors, and projects hourly predictions for horizons $h=1 \dots 24$.

---

## 7. Alert & Notification System

Located in [`backend/app/services/alert_service.py`](backend/app/services/alert_service.py).

1. **Trigger Condition:** Evaluated whenever an air quality reading is saved with an `aqi_value >= threshold_value`.
2. **Anti-Spam Cooldown Logic:** A **6-hour cooldown window** is enforced. If a notification was already sent to the user for that location within the past 6 hours, repeat notifications are suppressed to prevent alert fatigue.
3. **Dispatch Channels:**
   - **In-App:** Always written to the `notifications` table with status `unread`.
   - **Email:** Gracefully attempted via SMTP if `MAIL_HOST` is configured in `.env`; fails safely without crashing if credentials are absent.

---

## 8. REST API Reference (`/api/v1`)

All endpoints return JSON and use standard HTTP response codes.

| Endpoint | Method | Auth Required | Purpose |
| :--- | :--- | :--- | :--- |
| `/` or `/api/v1` | `GET` | No | API discovery directory listing all endpoints |
| `/api/v1/health/live` | `GET` | No | Liveness probe (HTTP 200) |
| `/api/v1/health/ready` | `GET` | No | Readiness probe (verifies MySQL connection) |
| `/metrics` | `GET` | No | Prometheus formatted metrics scrape target |
| `/api/v1/auth/register` | `POST` | No | User registration (`name`, `email`, `password`) |
| `/api/v1/auth/login` | `POST` | No | JWT token login (`email`, `password`) |
| `/api/v1/auth/me` | `GET` | **Bearer JWT** | Profile of the currently logged-in user |
| `/api/v1/locations` | `GET` | No | List/search supported Indian cities |
| `/api/v1/locations` | `POST` | No | Create new monitoring location |
| `/api/v1/air-quality/current` | `GET` | No | Latest reading, CPCB AQI, and freshness age |
| `/api/v1/air-quality/history` | `GET` | No | Historical hourly observations (`?location_id=1&days=7`) |
| `/api/v1/forecasts` | `GET` | No | 24-hour ML predictions & model evaluation stats |
| `/api/v1/alerts` | `GET` | **Bearer JWT** | List current user's threshold preferences |
| `/api/v1/alerts` | `POST` | **Bearer JWT** | Create threshold alert (`location_id`, `threshold_value`) |
| `/api/v1/alerts/<id>` | `PATCH` | **Bearer JWT** | Update threshold value or enable/disable |
| `/api/v1/alerts/<id>` | `DELETE` | **Bearer JWT** | Delete threshold preference |
| `/api/v1/notifications` | `GET` | **Bearer JWT** | User notification history |
| `/api/v1/notifications/<id>/read` | `PATCH` | **Bearer JWT** | Mark notification as read |

### Integration Files for Frontend Partner
- **OpenAPI 3.0 Contract:** [`docs/api/openapi.yaml`](docs/api/openapi.yaml)
- **Postman Collection:** [`docs/api/AirSense.postman_collection.json`](docs/api/AirSense.postman_collection.json)

---

## 9. Docker & Operational Monitoring

Multi-container orchestration is defined in [`docker-compose.yml`](docker-compose.yml).

### 9.1 Container Roles
1. `airsense-mysql`: MySQL 8.0 on port `3306` with persistent volume `mysql_data`.
2. `airsense-backend`: Flask REST API on port `5000` with internal healthcheck.
3. `airsense-worker`: Background ingestion daemon.
4. `airsense-prometheus`: Prometheus scraper on port `9090` targeting `backend:5000/metrics`.
5. `airsense-grafana`: Grafana dashboard on port `3001` with pre-provisioned datasource and dashboard.

### 9.2 Key Prometheus Metrics
- `airsense_http_requests_total`: Request counter partitioned by method, endpoint, and status.
- `airsense_http_request_duration_seconds`: Request latency histogram.
- `airsense_ingestion_runs_total`: Ingestion runs partitioned by provider and status.
- `airsense_ingestion_records_saved_total`: Total observations saved.
- `airsense_active_alerts_total`: Gauge tracking active user alert configurations.

---

## 10. Operations & Runbook

### 10.1 Running the Full Stack (Docker)
```bash
# 1. Prepare configuration
cp .env.example .env

# 2. Build and start all 5 containers in the background
docker compose up --build -d

# 3. Check status
docker compose ps

# 4. View logs
docker compose logs -f backend
```

### 10.2 Running Locally (Python Virtualenv)
```bash
# 1. Activate environment
source venv/bin/activate

# 2. Run seed script
python backend/seed.py

# 3. Start REST API server
python backend/wsgi.py

# 4. In a separate terminal, trigger an ingestion cycle
python worker/worker.py --once
```

### 10.3 Running Automated Tests
```bash
# Run all 29 unit and integration tests
./venv/bin/pytest tests/ -v
```

### 10.4 Seeding Demo Data
```bash
# Seeds 8 Indian cities, demo user (demo@airsense.org / demo12345), and a sample alert
python backend/seed.py
```
*(Or inside container)*:
```bash
docker exec airsense-backend python backend/seed.py
```
