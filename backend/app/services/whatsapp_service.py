# app/services/whatsapp_service.py

from sqlalchemy.orm import Session
from app.models.whatsapp_message import WhatsAppMessage


def generate_auto_reply(message_body: str) -> str:
    """
    Simple rule-based auto-reply generator.
    Real AI integration (OpenAI/Gemini) can be plugged in here later.
    """
    text = message_body.lower().strip()

    if any(word in text for word in ["hi", "hello", "hey", "salam", "assalam"]):
        return "Hello! 👋 Thanks for reaching out. How can we help you today?"

    if any(word in text for word in ["price", "cost", "quote", "quotation"]):
        return "Thanks for your interest! Our team will send you a quotation shortly."

    if any(word in text for word in ["order", "status", "track"]):
        return "You can check your order status by logging into your account, or our team will update you shortly."

    if any(word in text for word in ["thanks", "thank you", "shukriya"]):
        return "You're welcome! Let us know if you need anything else. 😊"

    return "Thanks for your message! Our team will get back to you shortly."


def save_incoming_message(
    db: Session,
    company_id: str,
    from_number: str,
    message_body: str,
    message_id: str = None,
) -> WhatsAppMessage:
    """Save incoming WhatsApp message and generate auto-reply."""

    reply_text = generate_auto_reply(message_body)

    new_message = WhatsAppMessage(
        company_id=company_id,
        from_number=from_number,
        message_body=message_body,
        message_id=message_id,
        reply_sent=True,
        reply_text=reply_text,
    )

    db.add(new_message)
    db.commit()
    db.refresh(new_message)

    return new_message
  