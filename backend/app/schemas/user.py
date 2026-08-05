import uuid
from pydantic import BaseModel, field_serializer
from typing import Optional, Union

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    company_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    email: str
    full_name: Optional[str] = None
    role: str = "employee"
    is_active: bool = True

    @field_serializer("id", "company_id", mode="plain")
    def serialize_uuid_fields(self, v):
        return str(v) if v is not None else None

    class Config:
        from_attributes = True
