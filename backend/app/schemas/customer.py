from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class CustomerBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = "active"

class CustomerCreate(CustomerBase):
    company_id: str  # tenant id, jab auth ready hoga tab yeh JWT token se aayega

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: int
    company_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True