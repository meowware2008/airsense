# AirSense — 5-Member Team Project Division & Workstream Specification

**Project:** AirSense (Environmental Air Quality Monitoring, Predictive Analytics & Smart Alerting System)  
**Implementation:** 100% Software-only Web Architecture (Python / Flask / React / Scikit-Learn / Docker)  
**Target:** Final Academic Evaluation, CDD Rubric, & Project Defense  

---

## 1. Team Allocation Matrix

| Member | Workstream / Role | Primary Directory | Core Technologies | Primary Deliverables |
| :--- | :--- | :--- | :--- | :--- |
| **Member 1** | **Frontend & UI/UX Lead** | `frontend/src/` | React 19, Vite, Chart.js, CSS Design Tokens | Shared-Element Cinematic Transition, Split-Screen Auth, Overview Dashboard, 31-City Selector, Weather Widget, Pollutant Gauges, Alerts Inbox |
| **Member 2** | **Backend & Core API Lead** | `backend/app/api/`, `backend/app/services/` | Python 3, Flask, JWT, SQLAlchemy | RESTful API Endpoints, JWT Authentication, Alert Preference Engine, Cooldown Anti-Spam Logic, In-App Notifications Dispatch |
| **Member 3** | **Machine Learning & Analytics Lead** | `ml/`, `backend/app/api/forecasts.py` | Scikit-Learn, Pandas, NumPy, Joblib | Random Forest 24h Forecasting Engine ($R^2=0.864$, +19.3% MAE improvement), 1-Year Real Dataset Pipeline, Autoregressive Inference |
| **Member 4** | **Data Engineering & Ground Telemetry Lead** | `backend/app/providers/`, `backend/app/models/`, `worker/` | SQLAlchemy, Open-Meteo, CPCB WAQI, MySQL / SQLite | Dual Open-Meteo + Weather API Ingestion, CPCB CAAQMS Ground Stations Adapter, 31-City Directory, CPCB NAQI Calculation Engine |
| **Member 5** | **DevOps, Cloud & QA Lead** | `infrastructure/`, `monitoring/`, `tests/`, `render.yaml` | Docker, Compose, Render, Prometheus, Grafana, Pytest | Containerization, CI/CD Cloud Deployment, Self-Healing Database Layer, Prometheus/Grafana Metrics, 42-test Automated Suite |

---

## 2. Detailed Member Breakdowns

---

### Member 1: Frontend & UI/UX Lead
*Focus: User interface design, interactive dashboard, shared-element transition, data visualization, and frontend state management.*

#### 1. Codebase Ownership
* `frontend/src/App.jsx` — Core application coordinator, navigation tabs, global state, location picker, and hero dashboard layout.
* `frontend/src/components/SharedElementTransitionOverlay.jsx` & `.css` — FLIP motion shared-element transition orchestrating the "AirSense" brand lockup and city video flight from login to dashboard.
* `frontend/src/components/login.jsx` & `login.css` — Editorial split-screen authentication experience, demo 1-click credentials, and form exit dissolution.
* `frontend/src/components/AnimatedCityDiorama.jsx` & `.css` — Looping city diorama video player with synchronized playback time and feathering masks.
* `frontend/src/components/PollutionChart.jsx` — Interactive 7-day historical timeseries and 24-hour predictive forecast charts using Chart.js.
* `frontend/src/components/Alerts.jsx` — In-app notification inbox, alert threshold creation form, and on-demand trigger test button.
* `frontend/src/api.js` — Client API gateway layer, fetch interceptors, and JWT token management.

#### 2. Key Responsibilities
* Build a responsive, clean dashboard styled with environmental sage design tokens (`#e4eadd`, `#f2f5ed`, `#1e3a2f`).
* Implement the GPU-accelerated shared-element transition where the brand logo and city video glide smoothly from login to dashboard over 850ms.
* Integrate live meteorological telemetry (real temperature °C, humidity %, wind speed km/h) on the hero card.
* Connect the 31-city dynamic selector with browser GPS auto-detection (`navigator.geolocation`).
* Maintain clean separation of concerns between presentation and REST API communications via `api.js`.

#### 3. Viva & Project Defense Questions
* *Q1: How does the login-to-dashboard shared-element transition work under the hood?*
  * **Answer:** It implements the FLIP (First, Last, Invert, Play) technique using `getBoundingClientRect()`. When login succeeds, the starting coordinates of the brand lockup and city video are captured. An overlay renders them at their origin and transitions them using hardware-accelerated CSS `transform` and cubic-bezier easing (`cubic-bezier(0.16, 1, 0.3, 1)`) into the exact dashboard destination coordinates over 850ms, while the video timestamp is preserved without interruption.
* *Q2: How does the frontend handle token authentication and expired JWT sessions?*
  * **Answer:** Tokens are stored in browser `localStorage` and dispatched in HTTP `Authorization: Bearer <token>` headers via `api.js`. If a 401 is received, state clears and prompts re-authentication.

---

### Member 2: Backend & Core API Lead
*Focus: Flask web server, REST endpoints, user authentication, and notification dispatch pipelines.*

#### 1. Codebase Ownership
* `backend/app/__init__.py` — Flask application factory, blueprint registration, CORS configuration, error handlers.
* `backend/app/api/auth.py` — User signup, login, password hashing (bcrypt), and JWT token creation/verification.
* `backend/app/api/alerts.py` — CRUD endpoints for alert preferences, instant trigger test endpoint, and in-app notifications inbox.
* `backend/app/api/air_quality.py` — Current reading and historical air telemetry REST endpoints with data provenance and freshness metadata.
* `backend/app/api/best_time.py` — REST endpoint ranking optimal outdoor activity hours based on predicted AQI and weather.
* `backend/app/services/alert_service.py` — Alert threshold evaluation logic, 6-hour anti-spam cooldown, and in-app notification dispatch.
* `backend/app/services/aqi_formatter.py` — Formatted report generator (CPCB levels, pollutants, health advice).

#### 2. Key Responsibilities
* Implement secure JWT token authentication with bcrypt password hashing and 24-hour expiration.
* Develop the business logic for alert threshold evaluation on incoming readings.
* Build the notification engine with a 6-hour anti-spam cooldown per location/user pair.
* Maintain clean REST API contracts and ensure robust test coverage.

#### 3. Viva & Project Defense Questions
* *Q1: How do you prevent notification spam when AQI fluctuates around a user's threshold?*
  * **Answer:** `AlertService` implements a 6-hour cooldown window per alert preference (`COOLDOWN_HOURS = 6`) checking prior notification records before dispatching new alerts.
* *Q2: What provenance and data freshness information does the API provide?*
  * **Answer:** `/api/v1/air-quality/current` returns `freshness` (observation age, `is_stale` flag) and `provenance` (`provider`, `measurement_type="observed"|"modelled"`, and `source_record_id`).

---

### Member 3: Machine Learning & Analytics Lead
*Focus: Air quality forecasting model, feature engineering, model training on real annual datasets, evaluation, and inference.*

#### 1. Codebase Ownership
* `ml/src/dataset.py` — Real annual historical dataset pipeline (8,759 hourly records from Open-Meteo / Copernicus CAMS archive).
* `ml/src/features.py` — Strict past-only lag features (`pm25_lag1..24`), rolling statistics (6h/24h mean & std), and calendar cyclical features (`hour`, `day_of_week`, `month`).
* `ml/src/train.py` — Chronological train/validation/test split pipeline (70% train, 15% val, 15% test) without data leakage, Random Forest regressor training, and persistence baseline comparison.
* `ml/src/predict.py` — Autoregressive multi-step inference engine generating 24-hour forward-looking PM2.5 and AQI estimates.
* `ml/artifacts/random_forest_pm25.joblib` & `model_metadata.json` — Pre-trained serialized model artifact and benchmark evaluation metadata.
* `backend/app/api/forecasts.py` — API bridge serving predictions to the frontend client.

#### 2. Key Responsibilities
* Construct feature pipelines converting raw time-series into supervised machine learning inputs without future data leakage.
* Train and evaluate Random Forest regression models on 8,759 real hourly ground observations covering full seasonal cycles (winter smog, monsoon washout, post-harvest spikes).
* Benchmark model performance against a naive persistence baseline, achieving a **+19.26% MAE improvement** ($R^2 = 0.8636$, Test MAE: 13.29 µg/m³ vs Baseline MAE: 16.46 µg/m³).
* Implement the multi-step autoregressive 24h forecasting loop in `predict.py`.

#### 3. Viva & Project Defense Questions
* *Q1: Why choose Random Forest over an ARIMA or LSTM model for this project?*
  * **Answer:** Random Forest captures non-linear interactions across autoregressive lags and calendar features without requiring GPU infrastructure, providing fast (<10ms) CPU inference suitable for serverless and low-cost cloud instances.
* *Q2: How do you prevent lookahead bias (data leakage) in time-series training?*
  * **Answer:** We use strict chronological splitting (first 70% for training, next 15% for validation, final 15% for testing) with NO random shuffling. All lag features (`shift >= 1`) and rolling statistics strictly use past observations.

---

### Member 4: Data Engineering & Ground Telemetry Lead
*Focus: External API data acquisition, background ingestion scheduler, ORM models, CPCB NAQI calculation, and database integrity.*

#### 1. Codebase Ownership
* `backend/app/providers/base.py` — Normalized data class definitions (`NormalizedReading`) and base provider interface.
* `backend/app/providers/open_meteo.py` — Dual Open-Meteo API adapter simultaneously querying Copernicus CAMS Air Quality and Open-Meteo Weather API (`temperature_2m, relative_humidity_2m, wind_speed_10m`).
* `backend/app/providers/waqi.py` — Official CPCB CAAQMS physical ground stations adapter (World Air Quality Index project).
* `backend/app/providers/__init__.py` — Provider factory with fallback logic.
* `backend/app/services/aqi_calculator.py` — Official Indian Central Pollution Control Board (CPCB) NAQI breakpoint calculation engine.
* `backend/app/models/__init__.py` — SQLAlchemy ORM models (`Location`, `AirQualityReading`, `AlertPreference`, `Notification`, `IngestionRun`).
* `backend/app/api/locations.py` — 31-city Indian metropolitan directory with geographic coordinates and auto-upsert seeder.
* `worker/worker.py` — Standalone daemon executing scheduled hourly ingestion runs.

#### 2. Key Responsibilities
* Integrate live open air-quality and meteorological data sources (Open-Meteo, WAQI / CPCB) with fallback to deterministic mock data.
* Implement the mathematical breakpoint calculation for official Indian CPCB NAQI standards from raw $\mu g/m^3$ readings.
* Curate and maintain the 31-city Indian metropolitan station registry (Delhi, Bengaluru, Mumbai, Kolkata, Chennai, Hyderabad, Ahmedabad, Pune, Jaipur, Lucknow, Kanpur, Patna, Varanasi, etc.).
* Enforce database schema integrity, unique constraints (`provider, location_id, observed_at`), and composite indexes for fast temporal queries.

#### 3. Viva & Project Defense Questions
* *Q1: How does the CPCB NAQI calculation work?*
  * **Answer:** It uses linear interpolation across official Indian pollutant concentration breakpoints for PM2.5, PM10, NO₂, SO₂, CO, and O₃:
    $$I_p = I_{lo} + \frac{I_{hi} - I_{lo}}{B_{hi} - B_{lo}} \times (C_p - B_{lo})$$
    The overall AQI is the maximum sub-index among all evaluated pollutants (requiring at least 3 pollutants with PM2.5 or PM10).
* *Q2: How is data duplication prevented during repeated ingestion runs?*
  * **Answer:** `IngestionService._save_reading()` enforces idempotency by querying for existing records matching `(provider, location_id, observed_at)` before inserting, backed by a unique database constraint.

---

### Member 5: DevOps, Cloud Deployment & QA Lead
*Focus: Docker containerization, CI/CD deployment, self-healing database connectivity, system observability, and automated test suites.*

#### 1. Codebase Ownership
* `Dockerfile` (Backend & Frontend) & `docker-compose.yml` — Container configurations for multi-service local and production orchestration.
* `render.yaml` — Infrastructure-as-code for Render cloud deployments (Web Service & Static Frontend).
* `backend/app/database.py` — Self-healing database connection layer with automatic fallback to local SQLite when external MySQL is unreachable.
* `tests/` — Automated test suite with 42 comprehensive unit and integration test cases:
  * `test_alerts.py`, `test_auth.py`, `test_best_time.py`, `test_cpcb_aqi.py`, `test_health.py`, `test_locations_readings.py`, `test_ml.py`, `test_providers.py`.
* `backend/app/monitoring/metrics.py` — Prometheus metrics definitions (ingestion counters, latency histograms, active alerts gauge).
* `backend/app/api/health.py` — Cloud liveness (`/health/live`) and readiness (`/health/ready`) probes.
* `backend/app/services/pinger_service.py` — Self-ping background keep-alive service preventing free-tier sleep on cloud providers.

#### 2. Key Responsibilities
* Manage multi-container Docker development and production build stages.
* Maintain the production deployment pipeline on Render cloud across `master`, `backend`, and `frontend-dashboard` branches.
* Implement self-healing database initialization that gracefully falls back to local SQLite in offline or containerless dev environments.
* Enforce quality gates via automated Pytest suites (maintaining 100% pass rate across 42 tests) and Vite build checks.

#### 3. Viva & Project Defense Questions
* *Q1: What is the difference between `/health/live` and `/health/ready`?*
  * **Answer:** Liveness verifies the Flask web process is responsive. Readiness verifies connectivity to downstream dependencies (database session and schema readiness) before routing traffic.
* *Q2: How are cloud deployments and cold-start sleeps managed on free-tier Render instances?*
  * **Answer:** `pinger_service.py` executes periodic lightweight heartbeat health pings every 5 minutes to prevent instance spindown, and the frontend warms up backend endpoints on initial page load.

---

## 3. Team Interface Contracts

```
 +---------------------------------------------------------+
 |                 Member 1: Frontend                      |
 +---------------------------------------------------------+
       |                                             ^
       | HTTP / REST (JWT in Bearer Header)          | JSON Payloads
       v                                             |
 +---------------------------------------------------------+
 |                 Member 2: Backend API                   |
 +---------------------------------------------------------+
       |                           |                 ^
       | Trigger Alerts            | SQLAlchemy ORM  | Predictions
       v                           v                 |
 +-------------------+    +--------------------+  +----------------------+
 | In-App Alerts /   |    | Member 4: Data/DB  |  | Member 3: ML Model   |
 | Notifications     |    | (Open-Meteo/WAQI)  |  | (24h AQI Forecasting)|
 +-------------------+    +--------------------+  +----------------------+
                                   ^
                                   | Docker / Prometheus Metrics / CI/CD
 +---------------------------------+-----------------------+
 |                 Member 5: DevOps & QA                   |
 +---------------------------------------------------------+
```

### Shared Responsibilities Checklist
1. **Git Workflow:** Every member creates isolated feature branches and merges to `master` only after tests pass.
2. **Quality Gate:** Before every commit, each member must run:
   ```bash
   ./venv/bin/pytest tests/ -q
   npm --prefix frontend run build
   ```
3. **No Hardware Required:** The project is 100% software-driven. All air quality readings are retrieved via official atmospheric and ground station API providers or real pre-seeded datasets.

---

## 4. Final Presentation & Demo Script

When presenting AirSense to professors, evaluators, or external examiners, execute this 5-stage demonstration:

1. **Member 1 (UI & UX):**
   * Open the login page. Demonstrate the 1-Click Demo login.
   * Trigger authentication and highlight the **shared-element transition**: the "AirSense" brand lockup and city diorama video smoothly flying into their sidebar and hero card destinations.
   * Demonstrate the 31-city dropdown, real-time temperature/humidity/wind telemetry, and CPCB badge color transitions (Good 🟢 to Severe 🔴).
2. **Member 4 (Data Engineering):**
   * Explain the dual-stream ingestion pipeline querying Copernicus CAMS Air Quality and Open-Meteo Weather simultaneously.
   * Introduce the CPCB WAQI ground station adapter for official physical sensor telemetry.
   * Show the database schema, unique constraints, and the mathematical implementation of CPCB NAQI breakpoint interpolation.
3. **Member 3 (Machine Learning):**
   * Navigate to the 24-Hour Forecast view.
   * Explain how the Random Forest model was trained on 8,759 hourly real observations from a full calendar year.
   * Present the benchmark metrics: **$R^2 = 0.8636$** and **+19.26% MAE improvement over persistence baseline**.
   * Showcase the "Best Time for Outdoor Activities" scoring engine.
4. **Member 2 (Backend & Smart Alerts):**
   * Configure an alert threshold for Delhi at 100 AQI.
   * Click the test trigger to demonstrate real-time evaluation, anti-spam cooldown logic, and in-app notification dispatch.
5. **Member 5 (DevOps & Reliability):**
   * Run the automated test runner in terminal demonstrating all 42 tests passing in <10 seconds.
   * Showcase Docker containerization, health check probes (`/api/v1/health/ready`), Prometheus metrics, and live deployment on Render.
