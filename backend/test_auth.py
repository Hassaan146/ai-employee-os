import os
import uuid

# Use a unique temporary SQLite test database file for each test execution
test_db_filename = f"./test_auth_{uuid.uuid4().hex[:8]}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_filename}"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_auth_flow():
    print("--- 1. Testing User Registration ---")
    reg_payload = {
        "email": f"testadmin_{uuid.uuid4().hex[:6]}@company.com",
        "password": "SuperSecretPassword123",
        "full_name": "Test Admin",
        "company_name": "Acme Software Corp"
    }
    response = client.post("/api/v1/auth/register", json=reg_payload)
    print("Register Status Code:", response.status_code)
    assert response.status_code == 201, f"Registration failed: {response.text}"
    data = response.json()
    token = data["access_token"]
    user_id = data["user"]["id"]
    company_id = data["user"]["company_id"]
    print("Registration Successful!")
    print(f"Token: {token[:20]}...")
    print(f"User ID: {user_id}")
    print(f"Company ID: {company_id}")

    print("\n--- 2. Testing Duplicate Registration Prevention ---")
    dup_response = client.post("/api/v1/auth/register", json=reg_payload)
    print("Duplicate Status Code:", dup_response.status_code)
    assert dup_response.status_code == 400

    print("\n--- 3. Testing User Login ---")
    login_data_form = {
        "username": reg_payload["email"],
        "password": reg_payload["password"]
    }
    login_response = client.post("/api/v1/auth/login", data=login_data_form)
    print("Login Status Code:", login_response.status_code)
    assert login_response.status_code == 200
    login_data = login_response.json()
    new_token = login_data["access_token"]
    print("Login Successful!")

    print("\n--- 4. Testing Authenticated /auth/me Endpoint ---")
    headers = {"Authorization": f"Bearer {new_token}"}
    me_response = client.get("/api/v1/auth/me", headers=headers)
    print("/auth/me Status Code:", me_response.status_code)
    assert me_response.status_code == 200
    me_data = me_response.json()
    print("Current User Profile:", me_data["email"], "-", me_data["full_name"], "(Company:", me_data["company_id"], ")")

    print("\nSUCCESS! All Authentication endpoints are fully working!")

if __name__ == "__main__":
    try:
        test_auth_flow()
    finally:
        if os.path.exists(test_db_filename):
            try:
                os.remove(test_db_filename)
            except Exception:
                pass
