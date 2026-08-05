import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, Text, Integer, Boolean
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

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    company_id = Column(String(36), nullable=False, index=True)
    uploaded_by_id = Column(String(36), nullable=True)
    customer_id = Column(String(36), nullable=True)

    file_name = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)

    document_type = Column(SQLEnum(DocumentType), default=DocumentType.OTHER, nullable=False)
    status = Column(SQLEnum(DocumentStatus), default=DocumentStatus.UPLOADED, nullable=False)

    # OCR / AI extracted content
    extracted_text = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    is_searchable = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
