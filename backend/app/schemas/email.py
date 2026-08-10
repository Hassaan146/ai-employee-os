from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class EmailSendRequest(BaseModel):
    to_email: EmailStr
    subject: str
    body_html: str
    customer_id: Optional[str] = None
    invoice_id: Optional[str] = None
    quotation_id: Optional[str] = None

class EmailResponse(BaseModel):
    status: str
    message: str
    to_email: str
    subject: str
    sent_at: datetime
