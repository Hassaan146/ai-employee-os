from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Attempt PostgreSQL connection; if PostgreSQL is not running locally, fallback to SQLite (employeeos.db)
try:
    if settings.DATABASE_URL.startswith("sqlite"):
        engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
        # Verify connection instantly
        with engine.connect() as conn:
            pass
except Exception:
    # Fallback to local SQLite file database when PostgreSQL is not active
    engine = create_engine("sqlite:///./employeeos.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()