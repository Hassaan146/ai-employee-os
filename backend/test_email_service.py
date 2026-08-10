import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_email_service():
    print("--- 1. Registering User to get Auth Token ---")
    reg_payload = {
        "email": f"email_admin_{uuid.uuid4().hex[:6]}@company.com",
        "password": "SecretPassword123",
        "full_name": "Email Service Tester",
        "company_name": "Email Enterprise"
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201, f"User registration failed: {reg_resp.text}"
    auth_token = reg_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {auth_token}"}
    print("Auth Token obtained successfully!")

    print("\n--- 2. Creating Customer ---")
    cust_payload = {
        "name": "Acme Global Solutions",
        "email": "acme_billing@testcompany.com",
        "phone": "+1999888777",
        "company_name": "Acme Global"
    }
    cust_resp = client.post("/api/v1/crm/customers", json=cust_payload, headers=headers)
    assert cust_resp.status_code == 200, f"Customer creation failed: {cust_resp.text}"
    customer_id = str(cust_resp.json()["id"])
    print("Customer Created ID:", customer_id)

    print("\n--- 3. Testing Custom HTML Email Dispatch ---")
    custom_email_payload = {
        "to_email": "client_followup@testcompany.com",
        "subject": "Follow up regarding AI Employee OS demo",
        "body_html": "<p>Hi team,</p><p>Following up on our call yesterday.</p>"
    }
    send_resp = client.post("/api/v1/email/send", json=custom_email_payload, headers=headers)
    print("Send Custom Email Status Code:", send_resp.status_code)
    assert send_resp.status_code == 200, f"Custom email failed: {send_resp.text}"
    print("Custom Email Verification: PASSED!")

    print("\n--- 4. Creating Invoice & Testing Send Invoice PDF Email ---")
    inv_payload = {
        "customer_id": customer_id,
        "currency": "USD",
        "tax_percent": 10.0,
        "discount_percent": 5.0,
        "notes": "Thank you for working with us!",
        "line_items": [
            {"description": "AI Employee License", "quantity": 1, "unit_price": 2500.0}
        ]
    }
    inv_resp = client.post("/api/v1/invoices", json=inv_payload, headers=headers)
    assert inv_resp.status_code == 201
    invoice_id = str(inv_resp.json()["id"])

    send_inv_resp = client.post(f"/api/v1/email/send-invoice/{invoice_id}", headers=headers)
    print("Send Invoice Email Status Code:", send_inv_resp.status_code)
    assert send_inv_resp.status_code == 200, f"Send Invoice Email failed: {send_inv_resp.text}"
    print("Send Invoice PDF Email Verification: PASSED!")

    print("\n--- 5. Creating Quotation & Testing Send Quotation PDF Email ---")
    qtn_payload = {
        "customer_id": customer_id,
        "quotation_number": f"QTN-EML-{uuid.uuid4().hex[:6]}",
        "tax_percent": 10.0,
        "discount_percent": 5.0,
        "currency": "USD",
        "notes": "Proposal valid for 30 days",
        "line_items": [
            {"description": "Enterprise AI Integration Setup", "quantity": 1, "unit_price": 5000.0}
        ]
    }
    qtn_resp = client.post("/api/v1/quotations", json=qtn_payload, headers=headers)
    assert qtn_resp.status_code == 201
    quotation_id = str(qtn_resp.json()["id"])

    send_qtn_resp = client.post(f"/api/v1/email/send-quotation/{quotation_id}", headers=headers)
    print("Send Quotation Email Status Code:", send_qtn_resp.status_code)
    assert send_qtn_resp.status_code == 200, f"Send Quotation Email failed: {send_qtn_resp.text}"
    print("Send Quotation PDF Email Verification: PASSED!")

    print("\nSUCCESS! Member 1 Day 7 AI Email Assistant & SMTP Dispatch Engine is 100% fully functional!")

if __name__ == "__main__":
    test_email_service()
