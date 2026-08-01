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
    company_id: int
    customer_id: Optional[int] = None
    assigned_to: Optional[int] = None

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    stage: Optional[str] = None
    value: Optional[float] = None
    assigned_to: Optional[int] = None

class LeadResponse(LeadBase):
    id: int
    company_id: int
    customer_id: Optional[int] = None
    assigned_to: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True