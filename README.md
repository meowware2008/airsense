# AirSense --- Real-Time Air Quality Monitoring & Predictive Alert System

AirSense is a **100% software-only** air-quality monitoring, analytics, ML forecasting, and alert platform developed as a college Continuous Delivery & DevOps (CDD) project.

> **Hardware Notice:** Physical sensors, microcontrollers (ESP32, Arduino, Raspberry Pi), and IoT hardware are **explicitly out of scope**. AirSense ingests atmospheric data from verified external providers (Open-Meteo CAMS models) via extensible adapters.

---

## Architecture & Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend REST API** | Python 3.11+, Flask | REST API endpoints, auth, and business logic |
| **Database** | MySQL 8.0, SQLAlchemy | Persistent relational storage for readings, users, and alerts |
| **Ingestion Worker** | Python Daemon | Scheduled background polling with idempotency and retry logic |
| **AQI Engine** | Custom Python Engine | Official CPCB Indian National AQI calculation |
| **Machine Learning** | Scikit-learn, Pandas | 24-hr PM2.5 forecasting (Random Forest vs Persistence Baseline) |
| **Orchestration** | Docker, Docker Compose | One-command local containerized stack |
| **CI / CD** | GitHub Actions, Jenkins | Pull-request verification and release automation |
| **Infrastructure as Code** | Terraform, Ansible | Cloud VM provisioning and configuration automation |
| **Security Scanning** | Trivy, SonarQube | Image vulnerability scanning and code quality gates |
| **Monitoring** | Prometheus, Grafana | Health metrics scraping and operational visualization |

---

## Quickstart

### Option 1: One-Command Docker Compose (Recommended)

1. Clone the repository:
   ```bash
   git clone <repository_url> airsense
   cd airsense
   ```
2. Copy the environment configuration template:
   ```bash
   cp .env.example .env
   ```
3. Build and launch all services (MySQL, Flask API, Ingestion Worker, Prometheus, Grafana):
   ```bash
   docker compose up --build
   ```
4. Access endpoints:
   - **Backend API:** `http://localhost:5000/api/v1/health/live`
   - **Prometheus:** `http://localhost:9090`
   - **Grafana Dashboards:** `http://localhost:3001` (login: `admin` / `admin`)

---

### Option 2: Local Linux Setup (Virtual Environment)

1. Set up Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install --upgrade pip
   pip install -r backend/requirements.txt -r ml/requirements.txt
   ```
2. Run the automated test suite:
   ```bash
   pytest tests/ -v
   ```
3. Train or evaluate the ML forecasting model:
   ```bash
   python ml/src/train.py
   ```
4. Start the backend server:
   ```bash
   python backend/wsgi.py
   ```
5. In another terminal, run an ingestion cycle:
   ```bash
   python worker/worker.py --once
   ```

---

## Testing & Quality Assurance

Run the test suite covering CPCB calculations, provider normalization, JWT authentication, locations, alert cooldown suppression, and ML leakage prevention:

```bash
pytest tests/ -v
```

All 29 tests run against an in-memory test database fixture and require zero external network dependencies.

---

## Documentation Links

- [System Architecture & Design Decisions](docs/architecture/ARCHITECTURE.md)
- [REST API Reference](docs/api/API_REFERENCE.md)
- [Authoritative Specification](AirSense_Project_Specification.md)
