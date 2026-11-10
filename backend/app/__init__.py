import time
from flask import Flask, request, g
from flask_cors import CORS
from backend.app.config import Config
from backend.app.database import init_db, create_all_tables, db_session
from backend.app.api.health import health_bp
from backend.app.api.auth import auth_bp
from backend.app.api.locations import locations_bp
from backend.app.api.air_quality import air_quality_bp
from backend.app.api.alerts import alerts_bp
from backend.app.api.forecasts import forecasts_bp
from backend.app.monitoring.metrics import HTTP_REQUESTS_TOTAL, HTTP_REQUEST_DURATION_SECONDS


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize Database
    init_db(app.config["SQLALCHEMY_DATABASE_URI"])
    create_all_tables()

    # Register Blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(locations_bp)
    app.register_blueprint(air_quality_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(forecasts_bp)

    # Prometheus Metric Request Hooks
    @app.before_request
    def record_request_start():
        g.start_time = time.time()

    @app.after_request
    def record_metrics(response):
        if hasattr(g, "start_time") and request.endpoint != "health.metrics":
            latency = time.time() - g.start_time
            endpoint = request.endpoint or "unknown"
            HTTP_REQUEST_DURATION_SECONDS.labels(endpoint=endpoint).observe(latency)
            HTTP_REQUESTS_TOTAL.labels(
                method=request.method,
                endpoint=endpoint,
                status=response.status_code,
            ).inc()
        return response

    # Teardown scoped session
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db_session.remove()

    return app
