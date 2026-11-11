# Deploying AirSense on Render (512 MB Free Tier)

This guide walks you through deploying **AirSense** onto the **Render Free Tier** (512 MB RAM Web Service + Free Static Site + Free PostgreSQL).

---

## Architecture on Render

```
                                      +--------------------------+
                                      |   Render Free CDN        |
                                      |   (Static Site)          |
                                      |   https://airsense.      |
                                      |   onrender.com           |
                                      +------------+-------------+
                                                   |
                                                   | HTTPS API Requests
                                                   v
+--------------------------+          +------------+-------------+
|  Render Free PostgreSQL  | <------- |  Render Free Web Service |
|  (512MB / 1GB Free)      |          |  (512 MB RAM / 0.1 CPU)  |
|  airsense-db             |          |  Flask + Gunicorn        |
+--------------------------+          +--------------------------+
```

| Service | Render Service Type | Plan | Cost | Description |
|---|---|---|---|---|
| **Frontend** | Static Site | Free | $0 | React SPA built with Vite, served via global CDN with free SSL. |
| **Backend API** | Web Service | Free | $0 | Flask RESTful API running on Gunicorn (1 worker, 4 threads). |
| **Database** | PostgreSQL | Free | $0 | Managed PostgreSQL database on Render. |

---

## Method 1: 1-Click Deployment (Render Blueprint)

The repository includes a ready-to-use [`render.yaml`](../../render.yaml) blueprint specification that automatically provisions the Backend, Frontend, and Database in one step.

### Steps:
1. Push your branch to GitHub (`git push origin backend` or merge to `main`).
2. Log in to [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** &rarr; **Blueprint**.
4. Connect your GitHub repository (`airsense`).
5. Select branch `backend` (or `main`).
6. Render will automatically detect [`render.yaml`](../../render.yaml) and display:
   - `airsense-backend` (Web Service)
   - `airsense-frontend` (Static Site)
   - `airsense-db` (PostgreSQL Database)
7. Click **Apply**.
8. Render will provision the database, build the backend, and deploy the frontend.

---

## Method 2: Manual UI Setup (Step-by-Step)

If you prefer to configure each service manually in the Render dashboard:

### Step 1: Create Free PostgreSQL Database
1. Go to [Render Dashboard](https://dashboard.render.com/) &rarr; Click **New +** &rarr; **PostgreSQL**.
2. **Name:** `airsense-db`
3. **Database:** `airsense`
4. **User:** `airsense`
5. **Region:** Oregon (US West) or Frankfurt (EU)
6. **Plan:** Free
7. Click **Create Database**.
8. Once created, copy the **Internal Database URL** (e.g. `postgres://airsense:...@dpg-...-a/airsense`).

---

### Step 2: Create Backend Web Service
1. In Render Dashboard, click **New +** &rarr; **Web Service**.
2. Connect your GitHub repository (`airsense`).
3. Fill in the service configuration:
   - **Name:** `airsense-backend`
   - **Region:** Same region as your database (e.g., Oregon)
   - **Branch:** `backend` (or `main`)
   - **Root Directory:** *(leave blank)*
   - **Runtime:** `Python 3`
   - **Build Command:**
     ```bash
     pip install -r backend/requirements.txt
     ```
   - **Start Command:**
     ```bash
     gunicorn backend.wsgi:app --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120 --worker-class gthread
     ```
   - **Plan:** **Free (512 MB RAM / 0.1 CPU)**
4. In **Advanced** &rarr; **Environment Variables**, add:

| Key | Value | Description |
|---|---|---|
| `APP_ENV` | `production` | Enables production mode |
| `SECRET_KEY` | *(Click "Generate" in Render)* | JWT and session signing key |
| `PYTHONPATH` | `.` | Ensures Python finds `backend` and `ml` packages |
| `DATABASE_URL` | *(Paste Internal Database URL from Step 1)* | PostgreSQL connection string |
| `AQI_PROVIDER` | `open_meteo` | Live weather & air quality provider |
| `MODEL_PATH` | `/opt/render/project/src/ml/artifacts/random_forest_pm25.joblib` | Path to trained Random Forest model artifact |

5. Under **Health Check Path**, enter: `/api/v1/health/live`
6. Click **Create Web Service**.
7. Once deployment finishes, note your Backend URL (e.g., `https://airsense-backend.onrender.com`).

---

### Step 3: Create Frontend Static Site
1. In Render Dashboard, click **New +** &rarr; **Static Site**.
2. Connect your GitHub repository (`airsense`).
3. Fill in the static site configuration:
   - **Name:** `airsense-frontend`
   - **Branch:** `backend` (or `main`)
   - **Root Directory:** `frontend`
   - **Build Command:**
     ```bash
     npm install && npm run build
     ```
   - **Publish Directory:** `dist`
4. In **Advanced** &rarr; **Environment Variables**, add:

| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://airsense-backend.onrender.com/api/v1` *(replace with your backend URL)* |

5. In **Redirects / Rewrites**, add an SPA fallback rewrite rule:
   - **Type:** `Rewrite`
   - **Source:** `/*`
   - **Destination:** `/index.html`
6. Click **Create Static Site**.
7. Once deployed, open your live dashboard URL (e.g., `https://airsense-frontend.onrender.com`).

---

## 512 MB RAM Optimization Checklist

> [!IMPORTANT]
> The Render Free Tier strictly enforces a **512 MB memory limit**. Exceeding 512 MB triggers an out-of-memory (OOM) termination. The following configurations protect against this:

1. **Gunicorn Worker Configuration (`--workers 1 --threads 4`)**:
   - Python packages (`pandas`, `scikit-learn`, `SQLAlchemy`) consume ~150-180 MB per process.
   - Running multiple workers (`--workers 4`) would require >700 MB and immediately crash.
   - Using **1 worker process with 4 threads** (`--worker-class gthread`) shares the model and library memory across all threads, maintaining memory around **~180-210 MB** (leaving >300 MB headroom).

2. **Model Caching**:
   - The Random Forest model (`random_forest_pm25.joblib`, 3.4 MB) is cached once upon startup in memory. Individual prediction requests do not re-read from disk.

3. **Free Tier Cold Starts**:
   - Free Web Services on Render spin down after 15 minutes of inactivity.
   - The first request after a spin-down takes ~30-50 seconds to boot up. Subsequent requests respond in <100ms.
   - The `--timeout 120` setting in Gunicorn prevents gateway timeouts during cold starts.

---

## Default Login Credentials

Upon startup, `backend/wsgi.py` automatically initializes the database tables and seeds the demo user:

- **Email:** `demo@airsense.org`
- **Password:** `demo12345`

You can also use the registration form on the login screen to register new users.
