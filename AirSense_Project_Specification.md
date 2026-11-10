# AirSense --- Project Specification & AI Development Handoff

**Purpose:** Single source of truth for building AirSense. Give this
file to Google Antigravity before asking it to create or modify code.

**Project:** College CDD project \| **Team:** 5 \| **Complexity:**
Moderate \| **Implementation:** 100% software-only\
**Hardware is explicitly out of scope:** no ESP32, Arduino, Raspberry
Pi, physical sensors, IoT devices, or hardware integration.

------------------------------------------------------------------------

## 0. Instructions to Antigravity

You are helping a five-member student team build **AirSense**, a
software-only air-quality monitoring, analytics, forecasting, and alert
web application.

Treat this document as the authoritative specification.

Before writing code: 1. Inspect the existing repository and identify
what already exists. 2. Summarise the structure, completed work, missing
work, and conflicts with this specification. 3. Do not overwrite working
code or restructure the repository without explaining why and obtaining
approval. 4. Work incrementally in small, reviewable phases. 5. Before
each major phase, list the files to create/modify and acceptance
criteria. 6. Keep the application runnable after each phase. 7. Never
fabricate readings, API responses, model accuracy, monitoring results,
or deployment success. 8. Clearly label demo/seed data as **simulated**.
Never present it as live measurements. 9. Do not introduce
hardware-related code or dependencies. 10. Do not add Kubernetes, Kafka,
unnecessary microservices, deep learning, or other excessive
infrastructure unless explicitly approved. 11. Write maintainable code
that students can understand, explain, test, and demonstrate. 12.
Document commands for Fedora/Linux and Docker-based setup. 13. Keep
credentials in environment variables or secret stores. Never commit
secrets. 14. If an API, cloud account, or email provider is unavailable,
create a clear adapter/interface and documented mock mode. Do not
pretend the integration is live. 15. Ask questions only when a genuinely
blocking decision cannot be resolved from this specification.

**First response expected:** repository assessment and proposed
implementation plan. Do not generate the entire application in one
uncontrolled operation.

------------------------------------------------------------------------

# 1. Project overview

## 1.1 Name

**AirSense --- Real-Time Air Quality Monitoring and Predictive Alert
System**

## 1.2 Problem statement

Citizens often lack an accessible way to understand local air quality,
examine pollution trends, and receive timely warnings when pollution
becomes unhealthy. AirSense collects air-quality information from
external data providers, presents it clearly, forecasts future pollution
trends using machine learning, and notifies users when configured
thresholds are crossed.

## 1.3 Objectives

-   Retrieve air-quality and relevant weather information from external
    APIs.
-   Store timestamped readings with source/provenance.
-   Display current and historical air-quality information by location.
-   Forecast future pollution levels using an ML model.
-   Allow users to configure alert thresholds.
-   Send notifications when qualifying readings cross thresholds.
-   Demonstrate version control, automated testing, CI/CD,
    containerisation, security scanning, infrastructure automation,
    deployment, and monitoring.

## 1.4 Critical scope clarification

AirSense is **not a physical air-quality measurement device**. It has no
hardware or sensor component.

The system periodically retrieves information from external providers.
"Real-time" means **near-real-time updates subject to provider update
frequency, API limits, and ingestion schedule**. The UI must show the
observation timestamp and last successful update time.

## 1.5 Target users

-   Citizens checking air quality in a city or selected location.
-   Users comparing pollution trends across locations.
-   Users wanting threshold-based notifications.
-   Evaluators inspecting the ML and DevOps workflows.

------------------------------------------------------------------------

# 2. Scope and boundaries

## 2.1 Must-have MVP

1.  Location selection/search.
2.  External air-quality data ingestion.
3.  Data source and timestamp display.
4.  Current AQI/pollutant dashboard.
5.  Historical charts.
6.  User registration and login.
7.  User-configurable AQI alert threshold.
8.  At least one working notification channel. In-app notification
    history is mandatory; email is preferred if credentials are
    available.
9.  Baseline ML forecasting pipeline with honest evaluation.
10. Dockerised application and local one-command startup.
11. Automated tests and CI pipeline.
12. Demonstrable deployment pipeline.
13. Operational monitoring dashboard.

## 2.2 Nice-to-have, only after MVP

-   Compare multiple cities.
-   Saved/favourite locations.
-   More notification channels.
-   Forecast confidence intervals, only if statistically justified.
-   Map view.
-   Admin page showing ingestion status and data freshness.
-   Additional ML model comparison.

## 2.3 Explicitly out of scope

-   ESP32, Arduino, Raspberry Pi, IoT devices, physical sensors, or
    hardware.
-   Mobile application; responsive web UI is sufficient.
-   Kubernetes.
-   Complex microservice architecture.
-   Kafka or streaming infrastructure.
-   Paid APIs unless the team approves the cost.
-   Medical advice or guaranteed pollution predictions.
-   Claims that an external API provides official CPCB observations
    unless verified.

------------------------------------------------------------------------

# 3. Product behaviour and user journeys

## 3.1 Visitor journey

1.  Open AirSense.
2.  Search for or select a city/location.
3.  View available air-quality information.
4.  See pollutant concentrations and source.
5.  Explore historical charts.
6.  View available forecasts.

## 3.2 Registered user journey

1.  Register and log in.
2.  Select a preferred location.
3.  Set an AQI threshold.
4.  Receive an in-app notification when a qualifying new reading crosses
    the threshold.
5.  If email is configured, receive an email.
6.  View notification history and alert settings.

## 3.3 Data freshness behaviour

-   Show the observation timestamp, not merely page-load time.
-   Show the last successful ingestion time.
-   Show a visible stale-data warning when data is old.
-   If a provider fails, retain historical data and show the latest
    known observation with its timestamp.
-   Never silently replace missing values with zero.
-   Never label a forecast as an observed measurement.

------------------------------------------------------------------------

# 4. Data providers and data integrity

## 4.1 Provider strategy

Use provider adapters so the backend is not tightly coupled to one
external API.

Candidate providers: - **Open-Meteo Air Quality API:** useful for
model-based air-quality information and forecasts. Verify current
parameters, geographic coverage, terms, and attribution requirements
before implementation. - **CPCB / official Indian AQI sources:**
investigate availability of accessible, documented, permitted data
endpoints or downloadable datasets. Do not assume an undocumented
endpoint is stable or permitted. - Add a secondary provider only if it
improves coverage and its source can be identified clearly.

Documentation starting points: - Open-Meteo Air Quality API:
https://open-meteo.com/en/docs/air-quality-api - CPCB:
https://cpcb.nic.in/ - National AQI portal:
https://airquality.cpcb.gov.in/

The agent must verify current provider documentation before coding an
integration. If web access is unavailable, implement the provider
interface and mock adapter, and mark live integration as pending
verification.

## 4.2 Provider adapter interface

Create a common provider abstraction with operations conceptually
equivalent to: - `get_locations(...)` where supported. -
`fetch_current(location)`. - `fetch_history(location, start, end)` where
supported. - `fetch_forecast(location, horizon)` where supported.

Normalise provider responses into one internal schema while preserving
original source metadata.

## 4.3 Mandatory provenance fields

Every reading must retain: - Provider/source name. - Source record
identifier if available. - Location identifier and coordinates. -
Observation timestamp in UTC. - Ingestion timestamp in UTC. -
Measurement type: `observed`, `modelled`, or `simulated`. - Units. -
Pollutant values. - AQI standard/method, if an AQI value is supplied or
calculated. - Raw payload or a safely retained subset for debugging,
subject to storage/privacy limits.

## 4.4 AQI standard

For Indian-facing AQI, use CPCB Indian National AQI methodology when
calculating AQI from pollutant concentrations. Do not apply US AQI
breakpoints and label the result as Indian AQI.

If a provider supplies AQI calculated under a different standard, show
its standard explicitly or avoid presenting it as CPCB AQI.

Distinguish: - Provider-supplied AQI. - Pollutant concentrations. -
AirSense-calculated Indian AQI.

Do not calculate Indian AQI unless required pollutant measurements,
units, averaging periods, and breakpoint methodology are correctly
available. If required inputs are missing, show pollutant data and state
that Indian AQI cannot be calculated for that record.

## 4.5 Units and validation

-   Store timestamps in UTC; convert to local time in the UI.
-   Store pollutant units explicitly, normally `µg/m³` where
    appropriate.
-   Validate latitude/longitude ranges.
-   Validate pollutant values and reject malformed payloads.
-   Treat missing pollutant fields as null, not zero.
-   Make ingestion idempotent using a unique key such as provider +
    location + observation timestamp + source record identity.

------------------------------------------------------------------------

# 5. Functional requirements

## FR-01: Location management

-   Search/select supported cities or locations.
-   Store name, region, country, latitude, longitude, and optional
    provider location ID.
-   Do not imply station-level precision when data is only
    city/grid-level.

## FR-02: Data ingestion

-   A scheduled backend job fetches data at a configurable interval.
-   Respect provider rate limits and terms.
-   Store successful readings and ingestion status.
-   Retry transient failures with bounded retries/backoff.
-   Record errors without exposing API secrets.

## FR-03: Current dashboard

Display, when available: - Location. - AQI value and clearly named AQI
standard. - AQI category and explanatory label. - PM2.5, PM10, NO₂, SO₂,
CO, and O₃ where provided. - Observation time. - Data source and
measurement type. - Last successful update time. - Stale-data or
unavailable-data state.

Never invent missing pollutant values or AQI categories.

## FR-04: Historical analytics

-   Select location and time range.
-   Plot AQI and pollutant time series.
-   Switch metric/pollutant.
-   Clearly label units and source.
-   Handle gaps in data.
-   Compare locations if time and data availability permit.

## FR-05: ML forecasting

-   Train from historical time-series data.
-   Generate forecasts for a documented horizon (target: up to 24 hours,
    only if dataset supports it).
-   Show forecast generation time and model version.
-   Keep forecasts visually separate from observations.
-   Evaluate using chronological/time-based validation.
-   Report MAE and RMSE; optionally compare against a persistence
    baseline.
-   Never claim accuracy without measured evaluation results.

## FR-06: Alerts

-   Authenticated users can create/update/delete alert preferences.
-   MVP: location + AQI threshold + enabled/disabled.
-   Evaluate alerts on newly ingested qualifying observations.
-   Avoid repeated notifications for the same crossing. Implement
    cooldown or crossing-state logic.
-   Store notification status and timestamp.
-   Provide in-app notification history.
-   Email is optional/configurable and must fail gracefully without
    credentials.

## FR-07: Authentication and account security

-   Use a modern password-hashing library.
-   Never store plaintext passwords.
-   Validate inputs server-side.
-   Use secure session/token handling.
-   Apply authorization checks to user-specific alert and notification
    data.
-   Do not expose internal stack traces to users.

## FR-08: Health and operations

-   Liveness endpoint.
-   Readiness endpoint that checks critical dependencies appropriately.
-   Prometheus metrics endpoint.
-   Ingestion job status/last-success information.

------------------------------------------------------------------------

# 6. Non-functional requirements

-   Maintainable code with clear module boundaries.
-   Responsive UI for desktop and mobile browsers.
-   Graceful API/network/database failure handling.
-   No secrets in source control or container images.
-   Useful logs that do not expose passwords, tokens, or API keys.
-   Version-controlled database migrations.
-   Basic accessibility: readable contrast, labels, keyboard-accessible
    controls.
-   Reasonable API timeouts and bounded retries.
-   Consistent timestamp handling.
-   Reproducible local environment using Docker Compose.
-   Documented setup and deployment.

------------------------------------------------------------------------

# 7. Recommended architecture

Use a **modular monolith plus a separately deployable ML service**. Do
not split every backend feature into a microservice.

``` text
External AQI / Weather Providers
             |
             v
   Scheduled Ingestion Worker
             |
             v
      Flask REST Backend <------> React Frontend
             |
       +-----+------+
       |            |
       v            v
    MySQL       Alert Engine
       |            |
       v            v
 Forecast Data   In-app / Email
       ^
       |
 ML Forecasting Service

DevOps / Operations:
GitHub -> GitHub Actions -> Jenkins release pipeline
                         -> Docker images
                         -> Terraform infrastructure
                         -> Ansible configuration/deployment
                         -> Cloud VM
Prometheus -> Grafana
SonarQube + Trivy integrated into quality/security checks
```

## 7.1 Suggested containers

1.  `frontend` --- React/Vite production build served by a lightweight
    web server.
2.  `backend` --- Flask API.
3.  `worker` --- scheduled ingestion and alert evaluation. It may share
    backend code but run as a separate process/container.
4.  `ml-service` --- prediction API or clearly isolated ML
    module/service.
5.  `mysql` --- persistent database.
6.  `prometheus` --- metrics collection.
7.  `grafana` --- operational dashboards.

Do not add Redis or a message broker unless a concrete requirement
emerges. A scheduled worker is sufficient.

------------------------------------------------------------------------

# 8. Technology stack

Use these technologies unless repository constraints or a documented
technical reason require a change.

  --------------------------------------------------------------------------
  Layer                      Technology              Responsibility
  -------------------------- ----------------------- -----------------------
  Frontend                   React + Vite            Responsive UI

  Styling                    CSS / modest component  Dashboard design
                             library                 

  Charts                     Chart.js or Recharts    AQI and pollutant
                                                     trends

  Backend                    Python + Flask          REST API and business
                                                     logic

  Database                   MySQL                   Users, locations,
                                                     readings, forecasts,
                                                     alerts

  ORM/migrations             SQLAlchemy +            Data access and schema
                             Flask-Migrate/Alembic   evolution

  Data processing            Pandas, NumPy           Cleaning and feature
                                                     engineering

  ML                         Scikit-learn            Baseline forecasting

  API testing                Postman                 API verification

  Automated testing          Pytest                  Backend and ML tests

  Version control            Git + GitHub            Collaboration

  CI                         GitHub Actions          Pull-request checks

  Release pipeline           Jenkins                 Controlled
                                                     release/deploy

  Containers                 Docker                  Package services

  Local orchestration        Docker Compose          Run complete stack

  Infrastructure as code     Terraform               Provision cloud
                                                     infrastructure

  Configuration/deployment   Ansible                 Configure VM and deploy

  Code quality               SonarQube               Static analysis

  Image/dependency scanning  Trivy                   Vulnerability scanning

  Monitoring                 Prometheus              Metrics collection

  Dashboards                 Grafana                 Operational
                                                     visualisation

  Reverse proxy              Nginx                   Serve frontend and
                                                     route API traffic
  --------------------------------------------------------------------------

Pin compatible, stable dependency versions. Do not blindly install the
newest major versions without checking compatibility.

------------------------------------------------------------------------

# 9. DevOps implementation requirements

Tools must perform real, demonstrable work. Do not add tools merely to
list them in the report.

## 9.1 Git and GitHub

-   Shared GitHub repository.
-   Protect `main` where possible.
-   Feature branches, e.g. `feature/frontend-dashboard`,
    `feature/aqi-ingestion`, `feature/ml-forecast`.
-   Pull requests and code reviews.
-   Meaningful commits and issues.
-   PR template and issue templates if useful.
-   Keep `.env`, credentials, generated secrets, and local data out of
    Git.

## 9.2 GitHub Actions --- CI

On pull requests and pushes: 1. Checkout source. 2. Set up Python and
Node. 3. Install pinned dependencies. 4. Run frontend lint/build checks.
5. Run backend and ML unit tests. 6. Run formatting/lint checks. 7.
Optionally run dependency checks. 8. Publish useful test
results/artifacts.

Required workflow checks must fail when required tests fail.

## 9.3 Jenkins --- release/CD

Use Jenkins for a separate release pipeline: 1. Checkout approved
branch/tag. 2. Build Docker images. 3. Run tests or consume verified
test results. 4. Run Trivy image scans. 5. Apply configured
quality/security gates. 6. Push versioned images to a registry if
credentials/registry are available. 7. Deploy to target VM using
Ansible. 8. Run post-deployment health checks. 9. Report
success/failure.

Avoid circular GitHub Actions/Jenkins triggers. Document which system
owns PR validation and which owns release/deployment.

## 9.4 Docker and Docker Compose

-   Dockerfile for each deployable service.
-   Multi-stage frontend build where appropriate.
-   Non-root users where practical.
-   Health checks.
-   Named volumes for persistent MySQL data.
-   `.env.example` with safe placeholders only.
-   Never bake secrets into images.
-   `docker compose up --build` should provide a documented local
    startup path.

## 9.5 Terraform

-   Provision a modest cloud environment, preferably one VM and minimum
    networking/firewall resources.
-   Provider and credentials configurable.
-   Never commit cloud credentials or Terraform state.
-   Variables for region, VM size, and SSH configuration.
-   Avoid paid resources without explicit approval.
-   Document state handling, cost warnings, and teardown
    (`terraform destroy`).
-   If credentials are unavailable, validate configuration and
    demonstrate workflow without claiming live deployment.

## 9.6 Ansible

-   Install required packages and Docker.
-   Configure users safely.
-   Create application directories.
-   Retrieve deployment configuration/images.
-   Start/update services.
-   Run health checks.
-   Do not store secrets in plaintext playbooks or committed inventory.

## 9.7 SonarQube

-   Scan backend and frontend.
-   Configure project keys and quality gate.
-   Demonstrate a report and explain findings.
-   Do not claim zero issues unless output confirms it.
-   If self-hosting is too resource-intensive, propose a
    lightweight/local or hosted alternative for approval.

## 9.8 Trivy

Scan Docker images, filesystem/dependencies, and IaC where applicable.
Document severity thresholds and remediation. Do not suppress findings
merely to make the pipeline green.

## 9.9 Prometheus and Grafana

Collect: - HTTP request count. - HTTP request latency. - HTTP error
count. - Ingestion success/failure count. - Last successful ingestion
timestamp or age. - Forecast generation success/failure. -
Database/service availability where practical.

Create dashboards for: 1. API health and latency. 2. Ingestion health
and data freshness. 3. Forecast job health.

Do not confuse operational metrics with environmental AQI charts. They
are different dashboards.

------------------------------------------------------------------------

# 10. ML forecasting design

## 10.1 Baseline

Start with Scikit-learn `RandomForestRegressor`. Compare it against a
persistence baseline (future value equals latest known value). Do not
assume Random Forest is better; measure it.

Avoid LSTM/deep learning in the MVP. The project is moderate complexity
and the model must be explainable.

## 10.2 Data and features

Assess historical data before promising 24-hour forecasts.

Potential features, only when available: - Lagged PM2.5 values. - Lagged
PM10 values. - Lagged pollutant/AQI values. - Rolling mean/min/max over
past windows. - Hour of day. - Day of week. - Month/season. -
Temperature, humidity, wind speed/direction, if available.

Target: - Forecast PM2.5 first. - Derive AQI only with valid methodology
and required inputs. - Add other pollutant targets after the first
target works.

## 10.3 Leakage prevention

-   Use chronological train/validation/test splits.
-   Never randomly shuffle time-series observations for main evaluation.
-   Build lag/rolling features using past data only.
-   Ensure predictions use only information available at prediction
    time.
-   Fit preprocessing on training data only.
-   Compare against a naive baseline.

## 10.4 Evaluation

Report MAE, RMSE, test period, sample count, baseline performance, model
performance, and limitations/data gaps. Never fabricate metrics.

## 10.5 Model lifecycle

-   Save model artifact with version.
-   Record training timestamp and dataset period.
-   Record feature schema and evaluation metrics.
-   Load model safely for inference.
-   Provide a retraining command.
-   Do not retrain on every API request.

------------------------------------------------------------------------

# 11. Database design

Use relational tables.

## `users`

-   `id` (primary key)
-   `name`
-   `email` (unique)
-   `password_hash`
-   `created_at`

## `locations`

-   `id`
-   `name`
-   `region`
-   `country`
-   `latitude`
-   `longitude`
-   `provider_location_id` (nullable)
-   `created_at`

## `air_quality_readings`

-   `id`
-   `location_id` (foreign key)
-   `provider`
-   `source_record_id` (nullable)
-   `measurement_type` (`observed`, `modelled`, `simulated`)
-   `aqi_value` (nullable)
-   `aqi_standard` (nullable)
-   `pm25`, `pm10`, `no2`, `so2`, `co`, `o3` (nullable)
-   `temperature`, `humidity`, `wind_speed` (nullable)
-   `units_metadata` (JSON or normalised fields)
-   `observed_at`
-   `ingested_at`
-   `raw_payload` (optional JSON, subject to size policy)

Add indexes for location and observation time. Add a uniqueness strategy
to prevent duplicate ingestion.

## `forecasts`

-   `id`
-   `location_id`
-   `model_name`
-   `model_version`
-   `target_metric`
-   `predicted_value`
-   `unit`
-   `forecast_for`
-   `generated_at`
-   `evaluation_context` (optional JSON)

## `alert_preferences`

-   `id`
-   `user_id`
-   `location_id`
-   `threshold_value`
-   `enabled`
-   `created_at`
-   `updated_at`

## `notifications`

-   `id`
-   `user_id`
-   `alert_preference_id`
-   `location_id`
-   `message`
-   `channel`
-   `status`
-   `triggering_reading_id`
-   `created_at`
-   `sent_at` (nullable)

## `ingestion_runs`

-   `id`
-   `provider`
-   `location_id` (nullable)
-   `started_at`
-   `finished_at`
-   `status`
-   `records_fetched`
-   `records_saved`
-   `error_summary` (sanitised)

Use migrations. Do not rely on manually editing production tables.

------------------------------------------------------------------------

# 12. Backend API contract (initial proposal)

Use `/api/v1` prefix. Adjust only with a documented reason.

  Method   Endpoint                        Purpose
  -------- ------------------------------- -------------------------------------
  POST     `/api/v1/auth/register`         Register
  POST     `/api/v1/auth/login`            Login
  POST     `/api/v1/auth/logout`           Logout if session auth
  GET      `/api/v1/locations`             List/search locations
  GET      `/api/v1/air-quality/current`   Latest reading for location
  GET      `/api/v1/air-quality/history`   Historical readings
  GET      `/api/v1/forecasts`             Forecasts for location
  GET      `/api/v1/alerts`                Current user's alert preferences
  POST     `/api/v1/alerts`                Create alert
  PATCH    `/api/v1/alerts/{id}`           Update alert
  DELETE   `/api/v1/alerts/{id}`           Delete alert
  GET      `/api/v1/notifications`         Current user's notification history
  GET      `/api/v1/health/live`           Liveness
  GET      `/api/v1/health/ready`          Readiness
  GET      `/metrics`                      Prometheus metrics

No sensor-ingestion endpoint is required. The project has no hardware.

Use consistent JSON response shapes, validation errors, HTTP status
codes, pagination where needed, and documented query parameters.
Generate OpenAPI/Swagger documentation if practical.

------------------------------------------------------------------------

# 13. Frontend requirements and design

Build a clean, modern, readable environmental dashboard.

## Main pages

1.  **Home/Dashboard:** location search, current AQI, category/standard,
    pollutant cards, observation timestamp, source, freshness indicator.
2.  **Analytics:** historical AQI chart, pollutant selector, time-range
    selector, visible data gaps.
3.  **Forecast:** forecast chart, observed-vs-predicted distinction,
    model version/generated timestamp, evaluation summary and
    limitations.
4.  **Alerts:** create/edit/delete threshold, select location,
    enable/disable, notification history.
5.  **Authentication:** register/login/account/logout.
6.  **Optional operations page:** last ingestion status, provider
    failures, data freshness.

## UI rules

-   Responsive layout.
-   Clear typography and hierarchy.
-   Do not use colour alone for AQI status; include text labels.
-   Show units on every pollutant measurement.
-   Show source and timestamp near the value.
-   Include loading, empty, stale, error, and offline states.
-   Include a mock/demo banner when using simulated data.
-   Avoid decorative charts with invented values.

------------------------------------------------------------------------

# 14. Testing strategy

## Backend

-   Authentication validation.
-   Location validation.
-   Provider response normalisation.
-   Missing pollutant values.
-   Duplicate ingestion prevention.
-   Historical query filtering.
-   Alert threshold evaluation.
-   Notification cooldown/deduplication.
-   API error handling.
-   Health endpoints.

## ML

-   Feature generation does not use future data.
-   Chronological split correctness.
-   Model trains on a known fixture dataset.
-   Prediction output schema and units.
-   Metrics calculation.
-   Baseline comparison.

## Frontend

-   Dashboard loading and error states.
-   AQI/source/timestamp rendering.
-   Location selection.
-   Chart data handling.
-   Alert form validation.
-   Authentication flow.

## Integration

-   Backend + MySQL.
-   Ingestion adapter + database.
-   Forecast service + backend.
-   Alert creation + notification record.
-   Docker Compose startup and health checks.

## End-to-end acceptance tests

1.  User can register and log in.
2.  User can select a location.
3.  System ingests or loads clearly labelled data.
4.  Dashboard displays source and observation time.
5.  Historical data is charted.
6.  Forecast endpoint returns a model-generated result or clearly
    labelled unavailable/experimental state.
7.  User can create a threshold alert.
8.  A controlled fixture triggers an alert without pretending it is a
    real pollution event.
9.  CI runs tests.
10. Docker deployment starts and health checks pass.
11. Prometheus scrapes metrics and Grafana displays them.

------------------------------------------------------------------------

# 15. Team allocation (five members)

Each person owns a primary workstream, but all members must use Git,
understand API contracts, and participate in code review/testing.

  -----------------------------------------------------------------------
  Member                  Primary ownership       Deliverables
  ----------------------- ----------------------- -----------------------
  Member 1                Frontend                React pages, dashboard,
                                                  charts, responsive UI

  Member 2                Backend                 Flask APIs, auth,
                                                  validation, application
                                                  logic

  Member 3                ML                      Dataset assessment,
                                                  preprocessing,
                                                  baseline, evaluation,
                                                  inference

  Member 4                Data/database           Provider adapters,
                                                  ingestion worker, MySQL
                                                  schema/migrations, data
                                                  quality

  Member 5                DevOps/integration      Docker, Compose, CI/CD,
                                                  Jenkins, Terraform,
                                                  Ansible, SonarQube,
                                                  Trivy, Prometheus,
                                                  Grafana
  -----------------------------------------------------------------------

Shared responsibilities: - Every member writes tests for their module. -
Every member uses feature branches and pull requests. - Member 5
coordinates deployment but must not be the only person who can run the
application. - Member 2 and Member 4 jointly agree API/database
contracts. - Member 3 and Member 4 jointly agree the ML dataset
schema. - Member 1 and Member 2 jointly agree frontend/backend API
contracts.

------------------------------------------------------------------------

# 16. Six-week implementation plan

Adjust to the actual academic deadline. This is a suggested sequence,
not a guarantee.

## Week 1 --- Foundation

-   Confirm provider and data availability.
-   Create repository and branch workflow.
-   Agree API and database contracts.
-   Scaffold frontend/backend/ML directories.
-   Create initial UI wireframe.
-   Establish Docker Compose development environment.

**Exit criteria:** all members can run the skeleton application locally.

## Week 2 --- Data and dashboard

-   Implement provider adapter.
-   Implement ingestion worker and database persistence.
-   Implement current and historical APIs.
-   Build dashboard and charts.
-   Add source/timestamp/data freshness display.

**Exit criteria:** real provider data flows into UI, or mock mode is
explicitly labelled if provider access is blocked.

## Week 3 --- Accounts, alerts and ML baseline

-   Implement authentication.
-   Implement alert preferences and in-app notification history.
-   Prepare historical dataset.
-   Train baseline model and persistence baseline.
-   Evaluate with chronological split.

**Exit criteria:** basic user journey works; model results are
reproducible and honestly reported.

## Week 4 --- Testing and CI

-   Add backend/frontend/ML tests.
-   Add GitHub Actions.
-   Add SonarQube and Trivy.
-   Improve error handling and documentation.

**Exit criteria:** pull requests run automated checks and fail on
required test/security gates.

## Week 5 --- Release and deployment

-   Complete production Dockerfiles.
-   Configure Jenkins release pipeline.
-   Write Terraform configuration.
-   Write Ansible playbooks.
-   Deploy if cloud access and budget are available.

**Exit criteria:** reproducible local deployment and, if provisioned,
verified cloud deployment.

## Week 6 --- Monitoring and final verification

-   Configure Prometheus and Grafana.
-   Test ingestion failures and stale-data handling.
-   Test alert workflow.
-   Verify deployment and recovery procedure.
-   Prepare screenshots, demo script, report, and architecture diagrams.

**Exit criteria:** end-to-end demonstration with evidence for
application functionality and DevOps stages.

------------------------------------------------------------------------

# 17. Repository structure

Use a monorepo for easier coordination:

``` text
AirSense/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── styles/
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── models/
│   │   ├── services/
│   │   ├── providers/
│   │   ├── alerts/
│   │   └── monitoring/
│   ├── migrations/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── worker/
│   ├── ingestion/
│   ├── scheduling/
│   ├── tests/
│   └── Dockerfile
│
├── ml/
│   ├── data/
│   ├── notebooks/
│   ├── src/
│   ├── artifacts/
│   ├── tests/
│   └── requirements.txt
│
├── infrastructure/
│   ├── terraform/
│   └── ansible/
│
├── monitoring/
│   ├── prometheus/
│   └── grafana/
│
├── jenkins/
│   └── Jenkinsfile
│
├── .github/
│   └── workflows/
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── decisions/
│   └── demo/
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

The agent may adjust this if an existing repository already has a sound
layout. Avoid empty folders created only for appearance.

------------------------------------------------------------------------

# 18. Environment configuration

Create `.env.example` with safe placeholders, for example:

``` dotenv
APP_ENV=development
SECRET_KEY=replace_me
DATABASE_URL=mysql+pymysql://airsense:replace_me@mysql:3306/airsense

AQI_PROVIDER=open_meteo
AQI_API_KEY=
INGESTION_INTERVAL_MINUTES=60

MAIL_HOST=
MAIL_PORT=
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM=

MODEL_PATH=/app/ml/artifacts/model.joblib

PROMETHEUS_ENABLED=true
```

This is illustrative. Use only variables required by the actual
implementation. Do not commit a real `.env`.

If the chosen provider does not require an API key, leave it blank and
document that fact. Do not invent a requirement.

------------------------------------------------------------------------

# 19. Security requirements

-   Hash passwords with a suitable password-hashing algorithm/library.
-   Validate and sanitise user input.
-   Enforce ownership checks for alerts and notifications.
-   Use parameterised database operations/ORM.
-   Configure CORS narrowly.
-   Add sensible rate limiting to authentication and public endpoints.
-   Store secrets in environment variables or deployment secret
    mechanisms.
-   Do not expose secrets in logs, screenshots, Git history, or error
    responses.
-   Use HTTPS in cloud deployment.
-   Run containers as non-root where practical.
-   Scan dependencies and images with Trivy.
-   Keep dependencies patched.
-   Do not claim SonarQube/Trivy makes the application fully secure.

------------------------------------------------------------------------

# 20. Risks and mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Provider has no stable free API     Keep provider adapter; verify
                                      access early; use clearly labelled
                                      mock mode during development

  API rate limits/downtime            Cache/store readings, bounded
                                      retries, stale-data state

  Insufficient historical data for ML Assess data in Week 1; reduce
                                      forecast scope or label model
                                      experimental

  Inconsistent AQI standards          Store source and standard;
                                      implement CPCB methodology only
                                      with valid inputs

  DevOps tools consume too much time  Prioritise Docker, GitHub Actions,
                                      tests and deployment; add remaining
                                      tools incrementally

  Cloud costs                         Use one modest VM, set budget
                                      alerts, shut down/destroy resources
                                      after demonstration

  Team integration conflicts          API contracts, feature branches,
                                      pull requests, small integration
                                      milestones

  False/repeated alerts               Deduplication, cooldown and
                                      controlled test fixtures
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 21. Acceptance criteria --- definition of done

## Product

-   [ ] Responsive web application loads.
-   [ ] Location selection works.
-   [ ] Air-quality data is shown with source, timestamp, units, and
    measurement type.
-   [ ] Historical charts use stored data.
-   [ ] Stale/unavailable provider data is handled clearly.
-   [ ] User authentication works.
-   [ ] Alert preferences can be managed.
-   [ ] In-app notifications are stored and displayed.
-   [ ] ML model has reproducible evaluation against a baseline, or
    experimental limitations are documented.

## DevOps

-   [ ] GitHub repository and branch/PR workflow are used.
-   [ ] GitHub Actions runs automated checks.
-   [ ] Jenkins release pipeline is documented and demonstrable.
-   [ ] Docker images build.
-   [ ] Docker Compose starts the local stack.
-   [ ] SonarQube analysis is available.
-   [ ] Trivy scan is available.
-   [ ] Terraform configuration validates.
-   [ ] Ansible playbook is available and tested where infrastructure
    exists.
-   [ ] Cloud deployment is verified if resources are provisioned.
-   [ ] Prometheus collects application metrics.
-   [ ] Grafana displays operational dashboards.

## Documentation

-   [ ] README setup guide.
-   [ ] Architecture diagram.
-   [ ] Database schema/ER diagram.
-   [ ] API documentation.
-   [ ] ML methodology and evaluation.
-   [ ] CI/CD pipeline explanation.
-   [ ] Security scan evidence.
-   [ ] Deployment instructions and teardown.
-   [ ] Demo script and screenshots.

------------------------------------------------------------------------

# 22. Suggested order of work for Antigravity

Do not ask the agent to build everything in one prompt. Use this
sequence:

1.  **Repository audit:** inspect repository and report what exists;
    propose a plan.
2.  **Architecture/contracts:** create architecture diagram, database
    schema, API contract, and design decisions.
3.  **Project scaffold:** create React, Flask, MySQL configuration, and
    Docker Compose; verify startup.
4.  **Data ingestion:** implement one verified provider adapter,
    normalisation, persistence, and failure handling.
5.  **Dashboard:** implement current conditions, location selection,
    history, source labels, and freshness states.
6.  **Authentication and alerts:** implement secure accounts, threshold
    preferences, notification records, and tests.
7.  **ML baseline:** inspect dataset quality, create time-safe features,
    train baseline and Random Forest, evaluate, and expose predictions.
8.  **CI and quality:** add tests, GitHub Actions, SonarQube and Trivy.
9.  **Release/deployment:** add Jenkins, Docker release flow, Terraform
    and Ansible.
10. **Monitoring:** add Prometheus metrics and Grafana dashboards.
11. **Final verification:** run acceptance tests, inspect security
    findings, verify documentation and prepare demo evidence.

At every stage, ask the agent to: - List changed files. - Explain
important design choices. - Provide exact commands to run. - Run
available tests/builds. - Report failures honestly. - Avoid moving to
the next phase while the current phase is broken.

------------------------------------------------------------------------

# 23. First prompt to give Antigravity

After attaching/opening this specification, use this prompt:

> Read `AirSense_Project_Specification.md` completely and treat it as
> the authoritative project specification.
>
> Do not start generating the entire project immediately. First inspect
> the current workspace/repository.
>
> Give me: 1. A concise understanding of the product and its
> software-only scope. 2. The existing repository structure and what is
> already implemented. 3. Any conflicts between existing code and the
> specification. 4. A proposed architecture and implementation sequence.
> 5. External API/data-provider assumptions that need verification. 6.
> The first small implementation milestone, with files to create/change
> and acceptance criteria.
>
> Wait for approval before making large structural changes. Keep the
> project suitable for a five-member college team with moderate
> complexity. Do not introduce hardware, Kubernetes, unnecessary
> microservices, or fabricated data/results.

------------------------------------------------------------------------

## Final project principle

**Build a working air-quality product first; use DevOps to build, test,
secure, deploy, and monitor that product.**

The tools are not decorations for the project report. Every tool must
have a real role and demonstrable output. The team must be able to
explain every major component and reproduce the project from the
documentation.
