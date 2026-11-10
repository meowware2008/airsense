import os
import sys
import time
import argparse
import logging
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.config import Config
from backend.app.database import init_db, create_all_tables
from backend.app.services.ingestion_service import IngestionService
from backend.app.api.locations import seed_default_locations

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [AirSense-Worker]: %(message)s"
)
logger = logging.getLogger("worker")


def run_single_cycle(provider_name: str = None):
    """Execute a single ingestion and alert evaluation cycle."""
    provider_name = provider_name or Config.AQI_PROVIDER
    logger.info(f"Starting ingestion cycle with provider='{provider_name}'...")
    service = IngestionService(provider_name=provider_name)
    run = service.ingest_all_locations()
    logger.info(
        f"Ingestion run completed: status={run.status}, "
        f"fetched={run.records_fetched}, saved={run.records_saved}"
    )
    if run.error_summary:
        logger.warning(f"Ingestion run warnings: {run.error_summary}")
    return run


def run_daemon(interval_minutes: int, provider_name: str = None):
    """Run persistent ingestion worker at scheduled interval."""
    logger.info(
        f"AirSense Ingestion Worker started in daemon mode. "
        f"Polling interval: {interval_minutes} minutes."
    )
    while True:
        try:
            run_single_cycle(provider_name=provider_name)
        except Exception as e:
            logger.error(f"Unexpected error during worker cycle: {e}", exc_info=True)

        logger.info(f"Worker sleeping for {interval_minutes * 60} seconds...")
        time.sleep(interval_minutes * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AirSense Data Ingestion & Alert Evaluation Worker")
    parser.add_argument("--once", action="store_true", help="Run a single ingestion cycle and exit")
    parser.add_argument("--provider", type=str, default=None, help="Air quality provider to use (open_meteo or mock)")
    parser.add_argument("--interval", type=int, default=None, help="Polling interval in minutes")
    args = parser.parse_args()

    # Initialize Database
    init_db(Config.DATABASE_URL)
    create_all_tables()
    seed_default_locations()

    interval = args.interval or Config.INGESTION_INTERVAL_MINUTES

    if args.once:
        run_single_cycle(provider_name=args.provider)
    else:
        run_daemon(interval_minutes=interval, provider_name=args.provider)
