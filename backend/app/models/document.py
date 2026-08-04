import uuid
import enum
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class DocumentType(str, enum.Enum):
    CONTRACT = "contract"
    INVOICE_ATTACHMENT = "invoice_attachment"
    POLICY = "policy"
    ID_PROOF = "id_proof"
    OTHER = "other"


class DocumentStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    OCR_COMPLETE = "ocr_complete"
    FAILED = "failed"


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    company_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # references companies.id (FK to be added once companies model exists)
    uploaded_by_id = Column(UUID(as_uuid=True), nullable=True)  # references users.id (FK to be added once users model exists)
    customer_id = Column(UUID(as_uuid=True), nullable=True)  # references customers.id (FK to be added once customers model exists)

    file_name = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)

    document_type = Column(Enum(DocumentType), default=DocumentType.OTHER, nullable=False)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.UPLOADED, nullable=False)

    # OCR / AI extracted content
    extracted_text = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    is_searchable = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
