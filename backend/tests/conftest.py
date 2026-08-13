# tests/conftest.py

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Test database (SQLite in-memory, fast aur isolated)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables before tests run, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def auth_headers(client):
    """Register a test user and return auth headers with access token."""
    register_payload = {
        "email": "pytest_user@example.com",
        "password": "testpass123",
        "full_name": "Pytest User",
        "company_name": "Pytest Company",
    }
    response = client.post("/api/v1/auth/register", json=register_payload)
    
    if response.status_code == 400:
        # User already exists, login instead
        login_response = client.post(
            "/api/v1/auth/login",
            data={"username": register_payload["email"], "password": register_payload["password"]},
        )
        token = login_response.json()["access_token"]
    else:
        token = response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}