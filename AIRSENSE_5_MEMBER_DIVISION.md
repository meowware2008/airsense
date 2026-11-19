# AirSense — 5-Member Team Project Division & Workstream Specification

**Project:** AirSense (Environmental Air Quality Monitoring, Predictive Analytics & Smart Alerting System)  
**Implementation:** 100% Software-only Web Architecture (Python / Flask / React / Scikit-Learn / Docker)  
**Target:** Final Academic Evaluation, CDD Rubric, & Project Defense  

---

## 1. Team Allocation Matrix

| Member | Workstream / Role | Primary Directory | Core Technologies | Primary Deliverables |
| :--- | :--- | :--- | :--- | :--- |
| **Member 1** | **Frontend & UI/UX Lead** | `frontend/src/` | React 19, Vite, Chart.js, Leaflet, CSS Design Tokens | Dashboard, City Selector, Forecast Graphs, Pollutant Gauges, Alerts UI, Responsive Design |
| **Member 2** | **Backend & Core API Lead** | `backend/app/api/`, `backend/app/services/` | Python 3, Flask, JWT, SMTP, SQLAlchemy | RESTful API Endpoints, JWT Authentication, Alert Preference Engine, In-App & Email Notifications |
| **Member 3** | **Machine Learning & Analytics Lead** | `ml/`, `backend/app/api/forecasts.py` | Scikit-Learn, Pandas, NumPy, Joblib | Random Forest 24h Forecasting Engine, Feature Engineering, Lag Predictors, Evaluation Metrics |
| **Member 4** | **Data Engineering & Database Lead** | `backend/app/providers/`, `backend/app/models/`, `worker/` | SQLAlchemy, PostgreSQL, Alembic, Open-Meteo, WAQI | Ingestion Worker Daemon, Provider Adapters (Open-Meteo/WAQI), Database Schema, CPCB AQI Calculation |
| **Member 5** | **DevOps, Cloud & QA Lead** | `infrastructure/`, `monitoring/`, `tests/`, `render.yaml` | Docker, Compose, Render, Prometheus, Grafana, Pytest | Containerization, CI/CD Cloud Deployment, Prometheus/Grafana Metrics, 53-test Automated Suite |

---

## 2. Detailed Member Breakdowns

---

### Member 1: Frontend & UI/UX Lead
*Focus: User interface design, interactive dashboard, data visualization, and frontend state management.*

#### 1. Codebase Ownership
* `frontend/src/App.jsx` — Core layout, navigation tabs, global state, dark/light theme tokens.
* `frontend/src/components/Overview.jsx` — Primary air quality dashboard, current AQI card, category pills.
* `frontend/src/components/Pollutants.jsx` — Pollutant breakdowns (PM2.5, PM10, NO₂, SO₂, CO, O₃) with sub-index bars.
* `frontend/src/components/Forecast.jsx` — 24-hour predictive visualization and historical trends with Chart.js.
* `frontend/src/components/Alerts.jsx` — Alert rule configuration form, automated threshold triggers, notifications inbox.
* `frontend/src/components/BestTime.jsx` — Best time for outdoor activities analysis widget.
* `frontend/src/api.js` — Client API gateway layer, fetch interceptors, and JWT token management.

#### 2. Key Responsibilities
* Build a responsive, clean dashboard styled with environmental design tokens (leaf greens, neutral slates, air alerts).
* Integrate Chart.js for real-time visualization of hourly AQI, 24h predictions, and 7-day historical curves.
* Implement error states, loading skeletons, and interactive feedback toasts (e.g., alert trigger confirmations).
* Maintain strict separation between UI presentation and API calls via `api.js`.

#### 3. Viva & Project Defense Questions
* *Q1: How does the frontend handle token authentication and expired JWT sessions?*
  * **Answer:** Tokens are stored in browser `localStorage` and dispatched in HTTP `Authorization: Bearer <token>` headers via `api.js`. If a 401 is received, state clears and prompts re-authentication.
* *Q2: How are responsive charts rendered for mobile vs desktop?*
  * **Answer:** Chart.js canvas elements use responsive layout wrappers (`maintainAspectRatio: false`) inside CSS grid containers with media queries.

---

### Member 2: Backend & Core API Lead
*Focus: Flask web server, REST endpoints, user authentication, and notification dispatch pipelines.*

#### 1. Codebase Ownership
* `backend/app/__init__.py` — Flask application factory, blueprint registration, CORS, error handlers.
* `backend/app/api/auth.py` — User signup, login, password hashing (bcrypt), and JWT token creation/verification.
* `backend/app/api/alerts.py` — CRUD endpoints for alert preferences, instant trigger test endpoint, diagnostic endpoints.
* `backend/app/api/air_quality.py` — Current reading and historical air telemetry REST endpoints.
* `backend/app/services/alert_service.py` — Alert threshold evaluation logic, 6-hour anti-spam cooldown, in-app and email dispatcher.
* `backend/app/services/aqi_formatter.py` — Formatted report generator (CPCB levels, pollutants, health advice).

#### 2. Key Responsibilities
* Implement secure JWT token authentication with bcrypt password hashing.
* Develop the business logic for alert threshold evaluation on incoming readings.
* Build the notification engine (in-app notifications inbox and SMTP email dispatch).
* Maintain clean REST API contracts and comprehensive automated testing.

#### 3. Viva & Project Defense Questions
* *Q1: How do you prevent notification spam when AQI fluctuates above a user's threshold?*
  * **Answer:** `AlertService` implements a 6-hour cooldown window per alert preference (`COOLDOWN_HOURS = 6`) checking prior notification records before dispatching.
* *Q2: How is password security guaranteed?*
  * **Answer:** Passwords are never stored in plaintext; they are salted and hashed using bcrypt before persistence.

---

### Member 3: Machine Learning & Analytics Lead
*Focus: Air quality forecasting model, feature engineering, model training, evaluation, and inference.*

#### 1. Codebase Ownership
* `ml/src/train.py` — Model training pipeline, hyperparameter configuration, model serialization.
* `ml/src/features.py` — Feature extraction (lag features, rolling averages, wind vectors, cyclical time encoding).
* `ml/src/predict.py` — Inference engine generating 24-hour forward-looking PM2.5 and AQI estimates.
* `ml/artifacts/random_forest_pm25.joblib` — Serialized pre-trained Random Forest model artifact.
* `backend/app/api/forecasts.py` — API bridge serving predictions to the frontend client.
* `backend/app/api/best_time.py` — Rule-based algorithm ranking optimal hours for outdoor activities based on predicted AQI.

#### 2. Key Responsibilities
* Construct feature pipelines converting raw time-series into supervised machine learning inputs (e.g., `pm25_lag_1`, `pm25_lag_24`, `hour_sin`, `hour_cos`, `wind_speed`).
* Train and evaluate Random Forest regression models optimizing RMSE and MAE on air quality data.
* Ensure fallback mechanisms: if model inference fails or artifacts are unavailable, provide deterministic extrapolation.
* Implement the "Best Time for Outdoor Activities" scoring algorithm.

#### 3. Viva & Project Defense Questions
* *Q1: Why choose Random Forest over an ARIMA or LSTM model for this project?*
  * **Answer:** Random Forest handles non-linear relationships with exogenous weather features (temperature, humidity, wind) without requiring heavy GPU infrastructure, allowing real-time CPU inference on lightweight cloud instances.
* *Q2: How do you handle cyclical time features like hour of day?*
  * **Answer:** Standard integers (0-23) create an artificial boundary between 23:00 and 00:00. We transform hour into cyclical coordinates: $\sin(2\pi \cdot \text{hour}/24)$ and $\cos(2\pi \cdot \text{hour}/24)$.

---

### Member 4: Data Engineering & Database Lead
*Focus: External API data acquisition, background ingestion scheduler, ORM models, and data validation.*

#### 1. Codebase Ownership
* `backend/app/providers/base.py` — Normalized data class definitions (`NormalizedReading`) and base provider interface.
* `backend/app/providers/open_meteo.py` — Open-Meteo API integration adapter (air quality & weather metrics).
* `backend/app/providers/cpcb_calculator.py` — Official Indian Central Pollution Control Board (CPCB) NAQI breakpoint calculation engine.
* `backend/app/models/` — SQLAlchemy ORM models (`Location`, `AirQualityReading`, `AlertPreference`, `Notification`, `IngestionRun`).
* `backend/app/services/ingestion_service.py` — Idempotent data ingestion and persistence service.
* `worker/worker.py` — Standalone daemon executing scheduled hourly ingestion runs across all monitored cities.
* `backend/seed.py` — Database seeder providing baseline Indian cities (Delhi, Bengaluru, Mumbai, Hyderabad, Kolkata).

#### 2. Key Responsibilities
* Connect to live open air-quality data sources (Open-Meteo, WAQI) with fallback to mock data providers.
* Write the mathematical breakpoint calculation for official Indian CPCB AQI standards from raw $\mu g/m^3$ readings.
* Enforce database schema integrity, primary/foreign keys, and indexes for fast temporal queries.
* Maintain the background worker daemon running continuous ingestion cycles.

#### 3. Viva & Project Defense Questions
* *Q1: How does the CPCB NAQI calculation work?*
  * **Answer:** It uses linear interpolation across official Indian pollutant concentration breakpoints for PM2.5, PM10, NO₂, SO₂, CO, and O₃. The overall AQI is the maximum sub-index among all evaluated pollutants.
* *Q2: How is data duplication prevented during repeated ingestion runs?*
  * **Answer:** `IngestionService._save_reading()` enforces idempotency by querying for existing records matching `(provider, location_id, observed_at)` before inserting.

---

### Member 5: DevOps, Cloud Deployment & QA Lead
*Focus: Docker containerization, CI/CD deployment, system observability, and automated test suites.*

#### 1. Codebase Ownership
* `Dockerfile` (Backend & Frontend) & `docker-compose.yml` — Container configurations for local multi-service orchestration.
* `render.yaml` — Infrastructure-as-code for Render cloud platform deployments (Web Service & Static Frontend).
* `tests/` — Automated test suite with 53 comprehensive unit and integration test cases:
  * `test_alerts.py`, `test_auth.py`, `test_best_time.py`, `test_cpcb_aqi.py`, `test_health.py`, `test_whatsapp.py`, etc.
* `monitoring/prometheus/` & `monitoring/grafana/` — Prometheus metrics scraping configuration and Grafana dashboards.
* `backend/app/monitoring/metrics.py` — Prometheus metrics definitions (ingestion counters, latency histograms, active alerts gauge).
* `backend/app/api/health.py` — Cloud liveness (`/health/live`) and readiness (`/health/ready`) probes.

#### 2. Key Responsibilities
* Manage multi-container Docker development and production build stages.
* Maintain the production deployment pipeline on Render cloud (`airsense-backend` and `airsense-frontend`).
* Implement application health checks and Prometheus metrics for real-time monitoring.
* Enforce code quality via automated Pytest suites (maintaining 100% pass rate across all 53 test cases) and ESLint.

#### 3. Viva & Project Defense Questions
* *Q1: What is the difference between `/health/live` and `/health/ready`?*
  * **Answer:** Liveness verifies the Flask web process is responsive. Readiness verifies connectivity to downstream dependencies (database session and schema readiness) before routing traffic.
* *Q2: How are secrets managed across the development and cloud environments?*
  * **Answer:** Sensitive tokens (JWT secrets, Twilio credentials, database passwords) are stored strictly as environment variables, never committed to Git, and loaded via `Config` from `.env` or Render environment settings.

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
 | Notifications     |    | Member 4: Data/DB  |  | Member 3: ML Model   |
 | (Twilio / Email)  |    | (Ingestion/Worker) |  | (24h AQI Forecasting)|
 +-------------------+    +--------------------+  +----------------------+
                                   ^
                                   | Docker / Prometheus Metrics / CI/CD
 +---------------------------------+-----------------------+
 |                 Member 5: DevOps & QA                   |
 +---------------------------------------------------------+
```

### Shared Responsibilities Checklist
1. **Git Workflow:** Every member creates isolated feature branches (`feat/member1-forecast-charts`, `feat/member4-openmeteo-adapter`) and merges to `master` only after tests pass.
2. **Quality Gate:** Before every commit, each member must run:
   ```bash
   ./venv/bin/pytest tests/ -q
   npm --prefix frontend run lint
   ```
3. **No Hardware Required:** The project is 100% software-driven. All air quality readings are retrieved via official API providers or pre-seeded high-fidelity datasets.

---

## 4. Final Presentation & Demo Script

When presenting AirSense to professors, evaluators, or external examiners, execute this 5-stage demonstration:

1. **Member 1 (UI & UX):**
   * Open the live dashboard. Demonstrate the city selector (Delhi, Bengaluru, Mumbai).
   * Showcase the real-time CPCB badge color transitions (Good 🟢 to Severe 🔴) and pollutant cards.
2. **Member 4 (Data Pipeline):**
   * Explain how raw sensor data from Open-Meteo is normalized into `AirQualityReading`.
   * Show the database schema and explain the CPCB NAQI breakpoint interpolation.
3. **Member 3 (Machine Learning):**
   * Navigate to the 24-Hour Forecast tab.
   * Explain how the Random Forest model leverages time lag and weather features to forecast peak pollution hours.
   * Showcase the "Best Time for Outdoor Activities" recommendation engine.
4. **Member 2 (Backend & Smart Alerts):**
   * Configure an alert rule for Delhi with a 100 AQI threshold.
   * Click **⚡ Send Test** to trigger on-demand evaluation and demonstrate the alert dispatch with full CPCB context.
5. **Member 5 (DevOps & Reliability):**
   * Demonstrate the test runner passing all 53 automated tests.
   * Show Docker containerization, health check endpoints (`/api/v1/health/ready`), and live cloud hosting on Render.
