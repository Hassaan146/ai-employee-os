import uuid
from pydantic import BaseModel, field_serializer
from typing import Optional, Union
from datetime import datetime

class LeadBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    stage: Optional[str] = "new"
    value: Optional[float] = 0.0

class LeadCreate(LeadBase):
    customer_id: Optional[Union[str, uuid.UUID]] = None
    assigned_to: Optional[Union[str, uuid.UUID]] = None

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    stage: Optional[str] = None
    value: Optional[float] = None
    assigned_to: Optional[Union[str, uuid.UUID]] = None

class LeadResponse(LeadBase):
    id: Union[str, uuid.UUID]
    company_id: Union[str, uuid.UUID]
    customer_id: Optional[Union[str, uuid.UUID]] = None
    assigned_to: Optional[Union[str, uuid.UUID]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_serializer("id", "company_id", "customer_id", "assigned_to", mode="plain")
    def serialize_uuid_fields(self, v):
        return str(v) if v is not None else None

    class Config:
        from_attributes = True