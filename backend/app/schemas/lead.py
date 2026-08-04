import uuid
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class LeadBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    stage: Optional[str] = "new"
    value: Optional[float] = 0.0

class LeadCreate(LeadBase):
    """company_id comes from the authenticated user's JWT, not the client."""
    customer_id: Optional[uuid.UUID] = None
    assigned_to: Optional[uuid.UUID] = None

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    stage: Optional[str] = None
    value: Optional[float] = None
    assigned_to: Optional[uuid.UUID] = None

class LeadResponse(LeadBase):
    id: uuid.UUID
    company_id: uuid.UUID
    customer_id: Optional[uuid.UUID] = None
    assigned_to: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True