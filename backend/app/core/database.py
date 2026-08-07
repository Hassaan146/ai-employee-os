import uuid
from typing import Any, Optional
from sqlalchemy import String, create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.types import TypeDecorator
from app.core.config import settings

# Pure PostgreSQL Engine Connection (No SQLite fallback)
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency for FastAPI routes to get a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Uuid(TypeDecorator):
    """ID column type that is a union of `str` and `uuid.UUID`.

    Stores IDs as CHAR(36). Accepts either a str or a uuid.UUID on bind
    (both are coerced to their canonical string form), so routes can pass
    either form without type errors across Postgres and SQLite.
    """
    impl = String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return str(value)

    def process_result_value(self, value, dialect):
        return value


def to_uuid(val: Any) -> Optional[uuid.UUID]:
    """Coerce any UUID-like value to a uuid.UUID for binding against UUID columns.
    Returns None when the value is empty or not a parseable UUID (callers should
    treat None as 'not found').
    """
    if val is None:
        return None
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except (ValueError, AttributeError, TypeError):
        return None
