"""Prometheus metrics definitions for AirSense backend and workers."""
from prometheus_client import Counter, Histogram, Gauge

# HTTP Metrics
HTTP_REQUESTS_TOTAL = Counter(
    "airsense_http_requests_total",
    "Total HTTP requests handled by the Flask backend",
    ["method", "endpoint", "status"]
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "airsense_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["endpoint"]
)

# Ingestion Metrics
INGESTION_RUNS_TOTAL = Counter(
    "airsense_ingestion_runs_total",
    "Total ingestion runs executed",
    ["provider", "status"]
)

INGESTION_RECORDS_SAVED_TOTAL = Counter(
    "airsense_ingestion_records_saved_total",
    "Total air quality observation records saved to database",
    ["provider"]
)

LAST_INGESTION_TIMESTAMP_SECONDS = Gauge(
    "airsense_last_ingestion_timestamp_seconds",
    "UNIX timestamp of the most recent successful data ingestion",
    ["provider"]
)

# Forecast Metrics
FORECAST_GENERATION_TOTAL = Counter(
    "airsense_forecast_generation_total",
    "Total forecast requests/generations executed",
    ["status"]
)

# Active Alerts Metric
ACTIVE_ALERTS_COUNT = Gauge(
    "airsense_active_alerts_total",
    "Total number of active user alert preferences"
)
