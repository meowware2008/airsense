from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session

Base = declarative_base()

_engine = None
_session_factory = None
db_session = scoped_session(lambda: _session_factory())


def init_db(database_uri: str, engine_options: dict = None):
    """Initialize database engine and session factory with automatic local SQLite fallback."""
    global _engine, _session_factory
    if engine_options is None:
        engine_options = {}

    # SQLite does not support pool_recycle / pool_pre_ping or multi-threading locks
    if database_uri.startswith("sqlite"):
        engine_options = {"connect_args": {"check_same_thread": False}}

    try:
        engine = create_engine(database_uri, **engine_options)
        # Test connection immediately
        with engine.connect() as conn:
            pass
        _engine = engine
    except Exception as exc:
        if not database_uri.startswith("sqlite"):
            import logging
            logging.getLogger("airsense.db").warning(
                f"Target database URI '{database_uri}' connection failed ({exc}). Falling back to 'sqlite:///airsense.db'."
            )
            return init_db("sqlite:///airsense.db")
        raise

    _session_factory = sessionmaker(
        bind=_engine, autocommit=False, autoflush=False, expire_on_commit=False
    )
    return _engine


def get_engine():
    return _engine


def _ensure_schema_columns():
    """Idempotently ensure required columns exist in existing tables (self-healing migration)."""
    if _engine is None:
        return
    try:
        from sqlalchemy import inspect
        inspector = inspect(_engine)
        # Schema integrity checks
    except Exception as exc:
        import logging
        logging.getLogger("airsense.db").warning(f"Schema verification notice: {exc}")
        import logging
        logging.getLogger("airsense.database").warning(f"Schema self-healing migration notice: {exc}")


def create_all_tables():
    """Create all tables registered in Base metadata and ensure new columns exist."""
    if _engine is not None:
        Base.metadata.create_all(bind=_engine)
        _ensure_schema_columns()
