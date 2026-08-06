import os
import uuid

# Use a unique temporary SQLite test database file for each test execution
test_db_filename = f"./test_pdf_tasks_{uuid.uuid4().hex[:8]}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_filename}"

from fastapi.testclient import TestClient
from app.main import app
from app.tasks import process_due_date_reminders_task, generate_recurring_invoices_task

client = TestClient(app)

def test_pdf_and_background_tasks():
    print("--- 1. Registering User to get Auth Token ---")
    reg_payload = {
        "email": f"finance_pdf_{uuid.uuid4().hex[:6]}@company.com",
        "password": "SecretPassword123",
        "full_name": "PDF & Automation Admin",
        "company_name": "Global Enterprise"
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201, f"User registration failed: {reg_resp.text}"
    auth_token = reg_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {auth_token}"}
    print("Auth Token obtained successfully!")

    print("\n--- 2. Creating Customer ---")
    cust_payload = {
        "name": "Global Tech Corp",
        "email": "globaltech@test.com",
        "company_name": "Global Tech"
    }
    cust_resp = client.post("/api/v1/crm/customers", json=cust_payload, headers=headers)
    assert cust_resp.status_code == 200
    customer_id = str(cust_resp.json()["id"])
    print("Customer Created ID:", customer_id)

    print("\n--- 3. Creating Quotation & Testing Quotation PDF Generation ---")
    qtn_payload = {
        "customer_id": customer_id,
        "quotation_number": f"QTN-PDF-{uuid.uuid4().hex[:6]}",
        "tax_percent": 10.0,
        "discount_percent": 5.0,
        "currency": "USD",
        "notes": "Valid for 30 days",
        "line_items": [
            {"description": "AI License Consultation", "quantity": 2, "unit_price": 1500.0}
        ]
    }
    qtn_resp = client.post("/api/v1/quotations", json=qtn_payload, headers=headers)
    assert qtn_resp.status_code == 201, f"Quotation creation failed: {qtn_resp.text}"
    quotation_id = qtn_resp.json()["id"]

    qtn_pdf_resp = client.get(f"/api/v1/quotations/{quotation_id}/pdf", headers=headers)
    print("Quotation PDF Status Code:", qtn_pdf_resp.status_code)
    assert qtn_pdf_resp.status_code == 200
    assert qtn_pdf_resp.headers["content-type"] == "application/pdf"
    assert qtn_pdf_resp.content.startswith(b"%PDF-1.")
    print("Quotation PDF Generation Verification: PASSED!")

    print("\n--- 4. Creating Invoice & Testing Invoice PDF Generation ---")
    inv_payload = {
        "customer_id": customer_id,
        "currency": "USD",
        "tax_percent": 10.0,
        "discount_percent": 5.0,
        "notes": "Thank you!",
        "line_items": [
            {"description": "Enterprise Server", "quantity": 1, "unit_price": 4000.0}
        ]
    }
    inv_resp = client.post("/api/v1/invoices", json=inv_payload, headers=headers)
    assert inv_resp.status_code == 201
    invoice_id = inv_resp.json()["id"]

    inv_pdf_resp = client.get(f"/api/v1/invoices/{invoice_id}/pdf", headers=headers)
    print("Invoice PDF Status Code:", inv_pdf_resp.status_code)
    assert inv_pdf_resp.status_code == 200
    assert inv_pdf_resp.headers["content-type"] == "application/pdf"
    assert inv_pdf_resp.content.startswith(b"%PDF-1.")
    print("Invoice PDF Generation Verification: PASSED!")

    print("\n--- 5. Testing Celery Background Tasks directly ---")
    reminder_result = process_due_date_reminders_task()
    print("Due Date Reminders Task Result:", reminder_result)
    assert reminder_result["status"] == "success"

    recurring_result = generate_recurring_invoices_task()
    print("Recurring Invoices Task Result:", recurring_result)
    assert recurring_result["status"] == "success"

    print("\nSUCCESS! Member 1 Day 5 & Member 3 Day 6 tasks are 100% fully functional!")

if __name__ == "__main__":
    try:
        test_pdf_and_background_tasks()
    finally:
        if os.path.exists(test_db_filename):
            try:
                os.remove(test_db_filename)
            except Exception:
                pass
