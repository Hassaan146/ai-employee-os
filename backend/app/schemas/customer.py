import uuid
from pydantic import BaseModel, EmailStr, field_serializer
from typing import Optional, Union
from datetime import datetime

class CustomerBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = "active"

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: uuid.UUID
    company_id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_serializer("id", "company_id", mode="plain")
    def serialize_uuid_fields(self, v):
        return str(v) if v is not None else None

    class Config:
        from_attributes = True