# app/api/whatsapp.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.whatsapp_message import WhatsAppMessage
from app.schemas.whatsapp import (
    WhatsAppIncomingMessage,
    WhatsAppMessageResponse,
    WhatsAppSendMessageRequest,
)
from app.services.whatsapp_service import save_incoming_message

router = APIRouter(prefix="/api/v1/whatsapp", tags=["WhatsApp Assistant"])


# ------------------------------------------------------------------
# Webhook Verification (WhatsApp Cloud API requires this on setup)
# ------------------------------------------------------------------
@router.get("/webhook")
def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
):
    VERIFY_TOKEN = "ai_employee_os_verify_token"  # can move to .env later

    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Webhook verification failed")


# ------------------------------------------------------------------
# Webhook Receiver (incoming messages hit this endpoint)
# ------------------------------------------------------------------
@router.post("/webhook")
def receive_whatsapp_message(
    payload: WhatsAppIncomingMessage,
    company_id: str = Query(..., description="Company ID for tenant isolation"),
    db: Session = Depends(get_db),
):
    """
    Receives incoming WhatsApp messages, logs them, and auto-generates a reply.
    In production, this would be called by Meta's WhatsApp Cloud API webhook.
    """
    message = save_incoming_message(
        db=db,
        company_id=company_id,
        from_number=payload.from_number,
        message_body=payload.message_body,
        message_id=payload.message_id,
    )
    return message


# ------------------------------------------------------------------
# List all WhatsApp conversations (for internal dashboard use)
# ------------------------------------------------------------------
@router.get("/messages", response_model=list[WhatsAppMessageResponse])
def list_whatsapp_messages(
    from_number: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(WhatsAppMessage).filter(
        WhatsAppMessage.company_id == current_user.company_id
    )
    if from_number:
        query = query.filter(WhatsAppMessage.from_number == from_number)

    return query.order_by(WhatsAppMessage.created_at.desc()).offset(skip).limit(limit).all()