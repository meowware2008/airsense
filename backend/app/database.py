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


def create_all_tables():
    """Create all tables registered in Base metadata."""
    if _engine is not None:
        Base.metadata.create_all(bind=_engine)
