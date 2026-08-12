# tests/test_crm.py

def test_create_customer(client, auth_headers):
    """Test creating a new customer."""
    payload = {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "03001234567",
        "company_name": "Doe Enterprises",
    }
    response = client.post("/api/v1/crm/customers/", json=payload, headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "John Doe"
    assert data["email"] == "john@example.com"
    assert "id" in data


def test_get_customers_list(client, auth_headers):
    """Test listing customers with pagination."""
    response = client.get("/api/v1/crm/customers/?skip=0&limit=10", headers=auth_headers)
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_customer_by_id(client, auth_headers):
    """Test fetching a single customer, then verify 404 for invalid id."""
    # First create one
    payload = {"name": "Jane Smith", "email": "jane@example.com"}
    create_response = client.post("/api/v1/crm/customers/", json=payload, headers=auth_headers)
    customer_id = create_response.json()["id"]

    # Fetch it
    response = client.get(f"/api/v1/crm/customers/{customer_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == customer_id

    # Invalid ID should 404
    response = client.get("/api/v1/crm/customers/invalid-id-123", headers=auth_headers)
    assert response.status_code == 404


def test_update_customer(client, auth_headers):
    """Test updating a customer's details."""
    payload = {"name": "Update Test", "email": "update@example.com"}
    create_response = client.post("/api/v1/crm/customers/", json=payload, headers=auth_headers)
    customer_id = create_response.json()["id"]

    update_payload = {"status": "inactive"}
    response = client.put(f"/api/v1/crm/customers/{customer_id}", json=update_payload, headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["status"] == "inactive"


def test_delete_customer(client, auth_headers):
    """Test deleting a customer."""
    payload = {"name": "Delete Test", "email": "delete@example.com"}
    create_response = client.post("/api/v1/crm/customers/", json=payload, headers=auth_headers)
    customer_id = create_response.json()["id"]

    response = client.delete(f"/api/v1/crm/customers/{customer_id}", headers=auth_headers)
    assert response.status_code == 200

    # Confirm it's gone
    get_response = client.get(f"/api/v1/crm/customers/{customer_id}", headers=auth_headers)
    assert get_response.status_code == 404


def test_create_lead(client, auth_headers):
    """Test creating a new lead."""
    payload = {
        "name": "Lead Test",
        "email": "lead@example.com",
        "source": "website",
        "stage": "new",
    }
    response = client.post("/api/v1/crm/leads/", json=payload, headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Lead Test"
    assert data["stage"] == "new"


def test_customer_search_filter(client, auth_headers):
    """Test search and filter functionality on customers."""
    client.post("/api/v1/crm/customers/", json={"name": "Searchable Customer", "email": "search@test.com"}, headers=auth_headers)

    response = client.get("/api/v1/crm/customers/?search=Searchable", headers=auth_headers)
    assert response.status_code == 200
    results = response.json()
    assert any("Searchable" in c["name"] for c in results)