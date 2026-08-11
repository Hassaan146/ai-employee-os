# app/models/whatsapp_message.py

import uuid
from sqlalchemy import Column, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from app.core.database import Base, Uuid


class WhatsAppMessage(Base):
    __tablename__ = "whatsapp_messages"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(Uuid, nullable=False, index=True)

    from_number = Column(String, nullable=False, index=True)
    message_body = Column(Text, nullable=False)
    message_id = Column(String, nullable=True)  # WhatsApp's own message ID

    reply_sent = Column(Boolean, default=False)
    reply_text = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())