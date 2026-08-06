import uuid
from typing import Any, Optional
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
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


def to_uuid(val: Any) -> Optional[str]:
    """Universal ID string converter helper.
    Returns clean 36-character UUID string representation.
    """
    if val is None:
        return None
    return str(val)
