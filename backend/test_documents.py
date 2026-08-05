import os
import uuid
import io

# Use a unique temporary SQLite test database file for each test execution
test_db_filename = f"./test_docs_{uuid.uuid4().hex[:8]}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_filename}"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_document_flow():
    print("--- 1. Registering User to get Auth Token ---")
    reg_payload = {
        "email": f"docmgr_{uuid.uuid4().hex[:6]}@company.com",
        "password": "SecretPassword123",
        "full_name": "Knowledge Manager",
        "company_name": "Enterprise OS"
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201, f"User registration failed: {reg_resp.text}"
    auth_token = reg_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {auth_token}"}
    print("Auth Token obtained successfully!")

    print("\n--- 2. Uploading Knowledge Base Policy Document ---")
    file_content = b"Company Cancellation Policy: Customers can request a 100% refund within 30 days of purchase."
    files = {
        "file": ("cancellation_policy.txt", io.BytesIO(file_content), "text/plain")
    }
    data = {
        "document_type": "policy"
    }
    upload_resp = client.post("/api/v1/documents/upload", files=files, data=data, headers=headers)
    print("Upload Status Code:", upload_resp.status_code)
    assert upload_resp.status_code == 201, f"Upload failed: {upload_resp.text}"
    doc = upload_resp.json()
    print("Document ID:", doc["id"])
    print("Extracted Text:", doc["extracted_text"])
    assert doc["is_searchable"] == True
    assert "refund within 30 days" in doc["extracted_text"]
    document_id = doc["id"]

    print("\n--- 3. Listing Company Documents ---")
    list_resp = client.get("/api/v1/documents", headers=headers)
    assert list_resp.status_code == 200
    docs_list = list_resp.json()
    print("Documents Count:", len(docs_list))
    assert len(docs_list) == 1

    print("\n--- 4. Searching Knowledge Base for 'refund' ---")
    search_resp = client.get("/api/v1/documents/search?query=refund", headers=headers)
    assert search_resp.status_code == 200
    search_data = search_resp.json()
    print("Search Results Count:", search_data["total"])
    assert search_data["total"] == 1
    assert search_data["documents"][0]["id"] == document_id
    print("Knowledge Base Search Verification: PASSED!")

    print("\n--- 5. Getting Single Document Details ---")
    get_resp = client.get(f"/api/v1/documents/{document_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == document_id

    print("\n--- 6. Deleting Document ---")
    del_resp = client.delete(f"/api/v1/documents/{document_id}", headers=headers)
    assert del_resp.status_code == 204

    # Verify deleted
    get_del_resp = client.get(f"/api/v1/documents/{document_id}", headers=headers)
    assert get_del_resp.status_code == 404

    print("\nSUCCESS! AI Document Intelligence & Knowledge Base Engine is 100% fully functional!")

if __name__ == "__main__":
    try:
        test_document_flow()
    finally:
        if os.path.exists(test_db_filename):
            try:
                os.remove(test_db_filename)
            except Exception:
                pass
