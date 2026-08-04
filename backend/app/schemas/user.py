from pydantic import BaseModel
from typing import Optional

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    company_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    company_id: str
    email: str
    full_name: Optional[str] = None
    role: str = "employee"
    is_active: bool = True

    class Config:
        from_attributes = True
