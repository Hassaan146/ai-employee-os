import os
import uuid

# Use a unique temporary SQLite test database file for each test execution
test_db_filename = f"./test_invoices_{uuid.uuid4().hex[:8]}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_filename}"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_invoice_flow():
    print("--- 1. Registering User to get Auth Token ---")
    reg_payload = {
        "email": f"finance_{uuid.uuid4().hex[:6]}@company.com",
        "password": "SecretPassword123",
        "full_name": "Finance Manager",
        "company_name": "Tech Corp"
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201, f"User registration failed: {reg_resp.text}"
    auth_token = reg_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {auth_token}"}
    print("Auth Token obtained successfully!")

    print("\n--- 2. Testing Non-Existent Customer Validation ---")
    bad_inv_payload = {
        "customer_id": "non_existent_id",
        "line_items": [{"description": "Item", "quantity": 1, "unit_price": 100.0}]
    }
    bad_create_resp = client.post("/api/v1/invoices", json=bad_inv_payload, headers=headers)
    print("Bad Customer Status Code:", bad_create_resp.status_code)
    assert bad_create_resp.status_code == 404, "Should reject invoice for non-existent customer!"
    print("Customer Existence Validation: PASSED!")

    print("\n--- 3. Creating Real Customer in CRM ---")
    cust_payload = {
        "name": "Acme Industries",
        "email": "acme@test.com",
        "company_name": "Acme Corp"
    }
    cust_resp = client.post("/api/v1/crm/customers", json=cust_payload, headers=headers)
    assert cust_resp.status_code == 200, f"Customer creation failed: {cust_resp.text}"
    customer_id = str(cust_resp.json()["id"])
    print("Customer Created with ID:", customer_id)

    print("\n--- 4. Creating New Invoice with Math Calculations ---")
    inv_payload = {
        "customer_id": customer_id,
        "currency": "USD",
        "tax_percent": 10.0,        # 10% Tax
        "discount_percent": 5.0,     # 5% Discount
        "notes": "Thank you for your business!",
        "line_items": [
            {"description": "MacBook Pro 16", "quantity": 2, "unit_price": 2000.0},  # Line 1: $4000
            {"description": "USB-C Hub", "quantity": 5, "unit_price": 50.0}          # Line 2: $250
        ]
    }
    create_resp = client.post("/api/v1/invoices", json=inv_payload, headers=headers)
    print("Create Invoice Status Code:", create_resp.status_code)
    assert create_resp.status_code == 201, f"Create invoice failed: {create_resp.text}"
    inv = create_resp.json()

    print("Invoice Number:", inv["invoice_number"])
    print("Subtotal (Expected 4250.0):", inv["subtotal"])
    print("Discount Amount (5% of 4250 = 212.5):", inv["discount_amount"])
    print("Tax Amount (10% of 4037.5 = 403.75):", inv["tax_amount"])
    print("Total Amount (Expected 4441.25):", inv["total_amount"])

    assert inv["subtotal"] == 4250.0
    assert inv["discount_amount"] == 212.5
    assert inv["tax_amount"] == 403.75
    assert inv["total_amount"] == 4441.25
    print("Financial Math Verification: PASSED!")

    invoice_id = inv["id"]

    print("\n--- 5. Listing Company Invoices ---")
    list_resp = client.get("/api/v1/invoices", headers=headers)
    assert list_resp.status_code == 200
    invoices_list = list_resp.json()
    print("Invoices Count:", len(invoices_list))
    assert len(invoices_list) == 1

    print("\n--- 6. Getting Single Invoice Details ---")
    get_resp = client.get(f"/api/v1/invoices/{invoice_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == invoice_id

    print("\n--- 7. Updating Invoice Status to PAID ---")
    status_payload = {"status": "paid"}
    patch_resp = client.patch(f"/api/v1/invoices/{invoice_id}/status", json=status_payload, headers=headers)
    assert patch_resp.status_code == 200
    updated_inv = patch_resp.json()
    print("Updated Status:", updated_inv["status"])
    print("Amount Paid:", updated_inv["amount_paid"])
    assert updated_inv["status"] == "paid"
    assert updated_inv["amount_paid"] == 4441.25

    print("\n--- 8. Deleting Invoice ---")
    del_resp = client.delete(f"/api/v1/invoices/{invoice_id}", headers=headers)
    assert del_resp.status_code == 204

    # Verify deleted
    get_del_resp = client.get(f"/api/v1/invoices/{invoice_id}", headers=headers)
    assert get_del_resp.status_code == 404

    print("\nSUCCESS! AI Invoice Generator Engine is 100% fully functional!")

if __name__ == "__main__":
    try:
        test_invoice_flow()
    finally:
        if os.path.exists(test_db_filename):
            try:
                os.remove(test_db_filename)
            except Exception:
                pass
