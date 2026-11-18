from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session

Base = declarative_base()

_engine = None
_session_factory = None
db_session = scoped_session(lambda: _session_factory())


def init_db(database_uri: str, engine_options: dict = None):
    """Initialize database engine and session factory."""
    global _engine, _session_factory
    if engine_options is None:
        engine_options = {}

    # SQLite does not support certain MySQL pool parameters
    if database_uri.startswith("sqlite"):
        engine_options = {"connect_args": {"check_same_thread": False}}

    _engine = create_engine(database_uri, **engine_options)
    _session_factory = sessionmaker(
        bind=_engine, autocommit=False, autoflush=False, expire_on_commit=False
    )
    return _engine


def get_engine():
    return _engine


def _ensure_schema_columns():
    """Idempotently ensure newly added model columns exist in existing tables (self-healing migration)."""
    if _engine is None:
        return
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(_engine)
        table_names = set(inspector.get_table_names())

        with _engine.connect() as conn:
            # 1. users.whatsapp_number
            if "users" in table_names:
                user_cols = {c["name"] for c in inspector.get_columns("users")}
                if "whatsapp_number" not in user_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN whatsapp_number VARCHAR(20)"))
                    conn.commit()

            # 2. alert_preferences.whatsapp_enabled
            if "alert_preferences" in table_names:
                alert_cols = {c["name"] for c in inspector.get_columns("alert_preferences")}
                if "whatsapp_enabled" not in alert_cols:
                    conn.execute(text("ALTER TABLE alert_preferences ADD COLUMN whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE"))
                    conn.commit()
    except Exception as exc:
        import logging
        logging.getLogger("airsense.database").warning(f"Schema self-healing migration notice: {exc}")


def create_all_tables():
    """Create all tables registered in Base metadata and ensure new columns exist."""
    if _engine is not None:
        Base.metadata.create_all(bind=_engine)
        _ensure_schema_columns()
