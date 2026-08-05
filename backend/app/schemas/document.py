import uuid
from pydantic import BaseModel, field_serializer
from typing import Optional, List, Union
from datetime import datetime

class DocumentResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    uploaded_by_id: Optional[uuid.UUID] = None
    customer_id: Optional[uuid.UUID] = None
    file_name: str
    file_url: str
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    document_type: str
    status: str
    extracted_text: Optional[str] = None
    ai_summary: Optional[str] = None
    is_searchable: bool
    created_at: datetime

    @field_serializer("id", "company_id", "uploaded_by_id", "customer_id", mode="plain")
    def serialize_uuid_fields(self, v):
        return str(v) if v is not None else None

    class Config:
        from_attributes = True

class DocumentSearchResponse(BaseModel):
    total: int
    query: str
    documents: List[DocumentResponse]
