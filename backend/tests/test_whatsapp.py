# tests/test_whatsapp.py

def test_webhook_verification_success(client):
    """Test WhatsApp webhook verification with correct token."""
    response = client.get(
        "/api/v1/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "ai_employee_os_verify_token",
            "hub.challenge": "12345",
        },
    )
    assert response.status_code == 200
    assert response.json() == 12345


def test_webhook_verification_failure(client):
    """Test WhatsApp webhook verification with wrong token."""
    response = client.get(
        "/api/v1/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong_token",
            "hub.challenge": "12345",
        },
    )
    assert response.status_code == 403


def test_receive_whatsapp_message(client, auth_headers):
    """Test receiving an incoming WhatsApp message via webhook."""
    # Get company_id from a fresh registration for isolation
    import uuid
    company_id = str(uuid.uuid4())

    payload = {
        "from_number": "+923001234567",
        "message_body": "Hello, I need help",
    }
    response = client.post(
        f"/api/v1/whatsapp/webhook?company_id={company_id}",
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["from_number"] == "+923001234567"
    assert data["reply_sent"] is True
    assert data["reply_text"] is not None


def test_auto_reply_greeting(client):
    """Test that greeting messages get an appropriate auto-reply."""
    import uuid
    company_id = str(uuid.uuid4())

    payload = {"from_number": "+923009999999", "message_body": "Hi there!"}
    response = client.post(f"/api/v1/whatsapp/webhook?company_id={company_id}", json=payload)

    assert response.status_code == 200
    reply = response.json()["reply_text"]
    assert "Hello" in reply or "Thanks" in reply


def test_list_whatsapp_messages(client, auth_headers):
    """Test listing WhatsApp messages for authenticated company."""
    response = client.get("/api/v1/whatsapp/messages", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)