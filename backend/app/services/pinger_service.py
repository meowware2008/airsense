"""
AirSense — Self-Ping / Keep-Alive Service
Prevents cloud web services (e.g. Render, Koyeb, Glitch, Heroku free tiers)
from spinning down due to inactivity by periodically pinging their public HTTP endpoints.
"""

import logging
import os
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import requests
from backend.app.config import Config

logger = logging.getLogger("airsense.pinger")

# Module-level thread and state locks
_pinger_thread: Optional[threading.Thread] = None
_stop_event = threading.Event()
_state_lock = threading.Lock()

_last_run_summary: Optional[Dict[str, Any]] = None
_is_running = False


def resolve_ping_urls() -> List[str]:
    """
    Resolve the deduplicated list of target URLs to ping.
    Combines Config.PING_URLS, RENDER_EXTERNAL_URL, and common frontend URLs.
    """
    urls: List[str] = []

    # 1. Read explicitly configured PING_URLS / SELF_PING_URLS
    raw_urls = getattr(Config, "PING_URLS", "") or os.getenv("PING_URLS", "") or os.getenv("SELF_PING_URLS", "")
    if raw_urls:
        for entry in raw_urls.split(","):
            cleaned = entry.strip()
            if cleaned and (cleaned.startswith("http://") or cleaned.startswith("https://")):
                urls.append(cleaned)

    # 2. Check Render's auto-injected external URL for the backend
    render_url = os.getenv("RENDER_EXTERNAL_URL", "").strip()
    if render_url:
        if not render_url.startswith("http://") and not render_url.startswith("https://"):
            render_url = f"https://{render_url}"
        backend_health_url = f"{render_url.rstrip('/')}/api/v1/health/live"
        if backend_health_url not in urls:
            urls.append(backend_health_url)

    # 3. Check frontend URL if configured
    frontend_url = os.getenv("FRONTEND_URL", "").strip() or os.getenv("RENDER_FRONTEND_URL", "").strip()
    if frontend_url:
        if not frontend_url.startswith("http://") and not frontend_url.startswith("https://"):
            frontend_url = f"https://{frontend_url}"
        if frontend_url not in urls:
            urls.append(frontend_url)

    # Preserve order while deduplicating
    seen = set()
    deduped: List[str] = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            deduped.append(u)

    return deduped


def ping_target(url: str, timeout: int = 15) -> Dict[str, Any]:
    """
    Send an HTTP GET request to a single target URL and measure response time.
    """
    start_time = time.time()
    try:
        response = requests.get(
            url,
            timeout=timeout,
            headers={
                "User-Agent": "AirSense-SelfPing/1.0 (+https://airsense.org)",
                "X-Keep-Alive": "AirSense-SelfPing",
            },
        )
        elapsed = round(time.time() - start_time, 3)
        status_code = response.status_code
        success = 200 <= status_code < 400

        result = {
            "url": url,
            "status_code": status_code,
            "success": success,
            "latency_seconds": elapsed,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": None,
        }
        if success:
            logger.info(f"[KeepAlive] Successfully pinged {url} -> HTTP {status_code} ({elapsed}s)")
        else:
            logger.warning(f"[KeepAlive] Warning pinging {url} -> HTTP {status_code} ({elapsed}s)")
        return result

    except Exception as exc:
        elapsed = round(time.time() - start_time, 3)
        err_msg = str(exc)
        logger.error(f"[KeepAlive] Failed pinging {url} ({elapsed}s): {err_msg}")
        return {
            "url": url,
            "status_code": None,
            "success": False,
            "latency_seconds": elapsed,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": err_msg,
        }


def ping_all_targets() -> Dict[str, Any]:
    """
    Execute a ping cycle across all resolved target URLs and update last results.
    """
    global _last_run_summary
    targets = resolve_ping_urls()
    results: List[Dict[str, Any]] = []

    for target in targets:
        result = ping_target(target)
        results.append(result)

    summary = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_targets": len(targets),
        "successful": sum(1 for r in results if r["success"]),
        "failed": sum(1 for r in results if not r["success"]),
        "results": results,
    }

    with _state_lock:
        _last_run_summary = summary

    return summary


def _pinger_worker_loop(interval_minutes: int):
    """
    Background worker loop that runs continuously while the app is alive.
    """
    global _is_running
    interval_seconds = max(60, interval_minutes * 60)
    logger.info(
        f"[KeepAlive] Self-ping background worker started. "
        f"Cycle interval: {interval_minutes} minutes ({interval_seconds}s)."
    )

    # Initial 10-second pause to allow web application to complete startup
    if _stop_event.wait(timeout=10):
        _is_running = False
        return

    while not _stop_event.is_set():
        try:
            ping_all_targets()
        except Exception as exc:
            logger.error(f"[KeepAlive] Unexpected error in self-ping cycle: {exc}", exc_info=True)

        # Wait for interval or stop event
        if _stop_event.wait(timeout=interval_seconds):
            break

    _is_running = False
    logger.info("[KeepAlive] Self-ping background worker stopped.")


def start_pinger(interval_minutes: Optional[int] = None) -> bool:
    """
    Start the background self-ping thread if enabled and not already running.
    """
    global _pinger_thread, _is_running

    if not getattr(Config, "SELF_PING_ENABLED", True):
        logger.info("[KeepAlive] Self-ping is disabled by configuration (SELF_PING_ENABLED=False).")
        return False

    if getattr(Config, "APP_ENV", "") == "testing":
        logger.info("[KeepAlive] Self-ping background worker skipped in testing environment.")
        return False

    with _state_lock:
        if _pinger_thread is not None and _pinger_thread.is_alive():
            logger.debug("[KeepAlive] Self-ping worker already running.")
            return True

        interval = interval_minutes or getattr(Config, "SELF_PING_INTERVAL_MINUTES", 10)
        _stop_event.clear()
        _is_running = True
        _pinger_thread = threading.Thread(
            target=_pinger_worker_loop,
            args=(interval,),
            name="AirSense-SelfPing-Thread",
            daemon=True,
        )
        _pinger_thread.start()
        logger.info(f"[KeepAlive] Spawned self-ping daemon thread (interval={interval}m).")
        return True


def stop_pinger(timeout: float = 5.0):
    """
    Stop the background self-ping worker thread gracefully.
    """
    global _pinger_thread, _is_running
    with _state_lock:
        _stop_event.set()
        if _pinger_thread is not None and _pinger_thread.is_alive():
            _pinger_thread.join(timeout=timeout)
        _is_running = False
        _pinger_thread = None


def get_pinger_status() -> Dict[str, Any]:
    """
    Return current status of the self-ping service for monitoring.
    """
    is_alive = _pinger_thread is not None and _pinger_thread.is_alive()
    targets = resolve_ping_urls()
    interval = getattr(Config, "SELF_PING_INTERVAL_MINUTES", 10)
    enabled = getattr(Config, "SELF_PING_ENABLED", True)

    with _state_lock:
        last_run = _last_run_summary

    return {
        "status": "active" if is_alive else ("disabled" if not enabled else "idle"),
        "enabled": enabled,
        "worker_thread_alive": is_alive,
        "interval_minutes": interval,
        "target_count": len(targets),
        "targets": targets,
        "last_run": last_run,
    }
