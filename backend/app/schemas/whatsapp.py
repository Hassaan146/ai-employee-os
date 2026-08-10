# app/schemas/whatsapp.py

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class WhatsAppIncomingMessage(BaseModel):
    """Payload structure for incoming WhatsApp webhook messages."""
    from_number: str
    message_body: str
    message_id: Optional[str] = None
    timestamp: Optional[datetime] = None


class WhatsAppMessageResponse(BaseModel):
    id: str
    from_number: str
    message_body: str
    reply_sent: bool
    reply_text: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WhatsAppSendMessageRequest(BaseModel):
    to_number: str
    message: str