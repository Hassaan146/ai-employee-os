# tests/test_documents.py

import io


def test_upload_text_document(client, auth_headers):
    """Test uploading a simple text document."""
    file_content = b"This is a test document for OCR extraction."
    file = io.BytesIO(file_content)

    response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("test_doc.txt", file, "text/plain")},
        data={"document_type": "other"},
        headers=auth_headers,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["file_name"] == "test_doc.txt"
    assert data["is_searchable"] is True
    assert "test document" in data["extracted_text"].lower()


def test_list_documents(client, auth_headers):
    """Test listing uploaded documents."""
    response = client.get("/api/v1/documents", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_document_by_id(client, auth_headers):
    """Test fetching a specific document, then verify 404 for invalid id."""
    file_content = b"Another test file content."
    file = io.BytesIO(file_content)

    upload_response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("another_doc.txt", file, "text/plain")},
        data={"document_type": "other"},
        headers=auth_headers,
    )
    doc_id = upload_response.json()["id"]

    response = client.get(f"/api/v1/documents/{doc_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == doc_id

    # Invalid ID should 404
    response = client.get("/api/v1/documents/invalid-id-123", headers=auth_headers)
    assert response.status_code == 404


def test_search_documents(client, auth_headers):
    """Test full-text search across document content."""
    file_content = b"Unique searchable keyword xyz123 inside this document."
    file = io.BytesIO(file_content)

    client.post(
        "/api/v1/documents/upload",
        files={"file": ("searchable.txt", file, "text/plain")},
        data={"document_type": "other"},
        headers=auth_headers,
    )

    response = client.get("/api/v1/documents/search?query=xyz123", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


def test_delete_document(client, auth_headers):
    """Test deleting an uploaded document."""
    file_content = b"File to be deleted."
    file = io.BytesIO(file_content)

    upload_response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("delete_me.txt", file, "text/plain")},
        data={"document_type": "other"},
        headers=auth_headers,
    )
    doc_id = upload_response.json()["id"]

    response = client.delete(f"/api/v1/documents/{doc_id}", headers=auth_headers)
    assert response.status_code == 204

    # Confirm it's gone
    get_response = client.get(f"/api/v1/documents/{doc_id}", headers=auth_headers)
    assert get_response.status_code == 404