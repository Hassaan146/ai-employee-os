import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.customer import Customer
from app.models.document import Document, DocumentType, DocumentStatus
from app.schemas.document import DocumentResponse, DocumentSearchResponse
from app.services.document_parser import extract_text

router = APIRouter(prefix="/documents", tags=["AI Document Intelligence"])

# Local storage folder for uploads
UPLOAD_DIR = os.path.join(os.getcwd(), "uploads", "documents")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(DocumentType.OTHER.value),
    customer_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify customer if provided
    if customer_id:
        try:
            valid_cust_id = uuid.UUID(str(customer_id))
        except ValueError:
            raise HTTPException(status_code=404, detail="Customer not found in your company")

        customer = db.query(Customer).filter(
            Customer.id == valid_cust_id,
            Customer.company_id == current_user.company_id
        ).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found in your company")

    # 2. Save file locally
    filename = file.filename or "uploaded_file"
    file_ext = os.path.splitext(filename)[1]
    unique_filename = f"{uuid.uuid4().hex[:12]}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    file_bytes = await file.read()
    file_size = len(file_bytes)

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # 3. Text Extraction for Knowledge Base Search (PDF via PyPDF, else UTF-8)
    parsed = extract_text(file_bytes, file.content_type, filename)
    extracted_text = parsed["text"]
    is_searchable = parsed["is_searchable"]

    # 4. Create Document Record
    new_doc = Document(
        company_id=current_user.company_id,
        uploaded_by_id=current_user.id,
        customer_id=customer_id if customer_id else None,
        file_name=filename,
        file_url=f"/uploads/documents/{unique_filename}",
        file_size_bytes=file_size,
        mime_type=file.content_type or "application/octet-stream",
        document_type=document_type,
        status=DocumentStatus.OCR_COMPLETE if is_searchable else DocumentStatus.UPLOADED,
        extracted_text=extracted_text,
        ai_summary=extracted_text[:300] if extracted_text else None,
        is_searchable=is_searchable
    )

    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return new_doc

@router.get("", response_model=List[DocumentResponse])
def list_documents(
    document_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists company documents."""
    query = db.query(Document).filter(Document.company_id == current_user.company_id)
    if document_type:
        query = query.filter(Document.document_type == document_type)
    return query.order_by(Document.created_at.desc()).all()

@router.get("/search", response_model=DocumentSearchResponse)
def search_documents(
    query: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Searches extracted text across company knowledge base documents."""
    matching_docs = db.query(Document).filter(
        Document.company_id == current_user.company_id,
        Document.is_searchable == True,
        Document.extracted_text.ilike(f"%{query}%")
    ).order_by(Document.created_at.desc()).all()

    return DocumentSearchResponse(
        total=len(matching_docs),
        query=query,
        documents=matching_docs
    )

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Gets details for a specific document."""
    try:
        valid_doc_id = uuid.UUID(str(document_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = db.query(Document).filter(
        Document.id == valid_doc_id,
        Document.company_id == current_user.company_id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes a document."""
    try:
        valid_doc_id = uuid.UUID(str(document_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = db.query(Document).filter(
        Document.id == valid_doc_id,
        Document.company_id == current_user.company_id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    db.delete(doc)
    db.commit()
    return None


@router.post("/{document_id}/parse", response_model=DocumentResponse)
def parse_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Re-run text extraction on an already-uploaded document."""
    try:
        valid_doc_id = uuid.UUID(str(document_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = db.query(Document).filter(
        Document.id == valid_doc_id,
        Document.company_id == current_user.company_id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Re-read the stored file from local storage.
    stored_name = os.path.basename(doc.file_url or "")
    path = os.path.join(UPLOAD_DIR, stored_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Stored file not found")

    with open(path, "rb") as f:
        content = f.read()

    parsed = extract_text(content, doc.mime_type, doc.file_name)
    doc.extracted_text = parsed["text"]
    doc.is_searchable = parsed["is_searchable"]
    doc.status = DocumentStatus.OCR_COMPLETE if doc.is_searchable else DocumentStatus.UPLOADED
    doc.ai_summary = parsed["text"][:300] if parsed["text"] else None
    db.commit()
    db.refresh(doc)
    return doc
