import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db, to_uuid
from app.core.deps import get_current_user
from app.models.user import User
from app.models.company import Company
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.quotation import Quotation
from app.schemas.email import EmailSendRequest, EmailResponse
from app.services.email_service import send_email_smtp, build_invoice_email_html, build_quotation_email_html
from app.services.pdf_generator import generate_invoice_pdf, generate_quotation_pdf

router = APIRouter(prefix="/email", tags=["AI Email Assistant"])

@router.post("/send", response_model=EmailResponse)
def send_custom_email(
    req: EmailSendRequest,
    current_user: User = Depends(get_current_user)
):
    """Send a custom HTML email or AI-drafted message."""
    res = send_email_smtp(
        to_email=req.to_email,
        subject=req.subject,
        body_html=req.body_html
    )
    if res["status"] == "error":
        raise HTTPException(status_code=500, detail=res["message"])

    return EmailResponse(
        status="success",
        message=res["message"],
        to_email=req.to_email,
        subject=req.subject,
        sent_at=datetime.utcnow()
    )

@router.post("/send-invoice/{invoice_id}", response_model=EmailResponse)
def send_invoice_email(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Auto-generates Invoice PDF and emails it directly to the customer."""
    inv_uuid = to_uuid(invoice_id)
    company_uuid = to_uuid(current_user.company_id)

    invoice = db.query(Invoice).filter(
        Invoice.id == inv_uuid,
        Invoice.company_id == company_uuid
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first() if invoice.customer_id else None
    if not customer or not customer.email:
        raise HTTPException(status_code=400, detail="Customer has no valid email address registered")

    company = db.query(Company).filter(Company.id == company_uuid).first()
    company_name = company.name if company else "AI Employee OS"

    # Generate PDF Attachment
    pdf_bytes = generate_invoice_pdf(invoice, customer, company_name)
    pdf_name = f"Invoice-{invoice.invoice_number}.pdf"

    # Build HTML Email Body
    html_body = build_invoice_email_html(invoice, customer, company_name)
    subject = f"Invoice #{invoice.invoice_number} from {company_name}"

    res = send_email_smtp(
        to_email=customer.email,
        subject=subject,
        body_html=html_body,
        pdf_bytes=pdf_bytes,
        pdf_filename=pdf_name
    )

    if res["status"] == "error":
        raise HTTPException(status_code=500, detail=res["message"])

    return EmailResponse(
        status="success",
        message=f"Invoice #{invoice.invoice_number} successfully emailed to {customer.email}",
        to_email=customer.email,
        subject=subject,
        sent_at=datetime.utcnow()
    )

@router.post("/send-quotation/{quotation_id}", response_model=EmailResponse)
def send_quotation_email(
    quotation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Auto-generates Quotation PDF and emails it directly to the customer."""
    q_uuid = to_uuid(quotation_id)
    company_uuid = to_uuid(current_user.company_id)

    quotation = db.query(Quotation).filter(
        Quotation.id == q_uuid,
        Quotation.company_id == company_uuid
    ).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    customer = db.query(Customer).filter(Customer.id == quotation.customer_id).first() if quotation.customer_id else None
    if not customer or not customer.email:
        raise HTTPException(status_code=400, detail="Customer has no valid email address registered")

    company = db.query(Company).filter(Company.id == company_uuid).first()
    company_name = company.name if company else "AI Employee OS"

    # Generate PDF Attachment
    pdf_bytes = generate_quotation_pdf(quotation, customer, company_name)
    pdf_name = f"Quotation-{quotation.quotation_number}.pdf"

    # Build HTML Email Body
    html_body = build_quotation_email_html(quotation, customer, company_name)
    subject = f"Quotation #{quotation.quotation_number} from {company_name}"

    res = send_email_smtp(
        to_email=customer.email,
        subject=subject,
        body_html=html_body,
        pdf_bytes=pdf_bytes,
        pdf_filename=pdf_name
    )

    if res["status"] == "error":
        raise HTTPException(status_code=500, detail=res["message"])

    return EmailResponse(
        status="success",
        message=f"Quotation #{quotation.quotation_number} successfully emailed to {customer.email}",
        to_email=customer.email,
        subject=subject,
        sent_at=datetime.utcnow()
    )
