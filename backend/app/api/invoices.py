import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.company import Company
from app.models.user import User
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceLineItem, InvoiceStatus
from app.schemas.invoice import InvoiceCreate, InvoiceStatusUpdate, InvoiceResponse
from app.services.pdf_generator import generate_invoice_pdf

router = APIRouter(prefix="/invoices", tags=["AI Invoice Generator"])

def generate_invoice_number(db: Session) -> str:
    date_str = datetime.utcnow().strftime("%Y%m%d")
    count = db.query(Invoice).count() + 1
    return f"INV-{date_str}-{1000 + count}"

@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    invoice_in: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not invoice_in.line_items:
        raise HTTPException(status_code=400, detail="Invoice must contain at least one line item")

    # 0. Verify customer exists in user's company
    try:
        valid_customer_id = uuid.UUID(str(invoice_in.customer_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="Customer not found in your company. Please create customer first.")

    customer = db.query(Customer).filter(
        Customer.id == valid_customer_id,
        Customer.company_id == current_user.company_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found in your company. Please create customer first.")

    # 1. Calculate line item subtotals
    subtotal = 0.0
    db_line_items = []
    
    for item in invoice_in.line_items:
        line_total = round(item.quantity * item.unit_price, 2)
        subtotal += line_total
        
        db_line_items.append(
            InvoiceLineItem(
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=line_total
            )
        )

    # 2. Calculate discounts, taxes, and total amount
    discount_pct = invoice_in.discount_percent or 0.0
    tax_pct = invoice_in.tax_percent or 0.0

    discount_amount = round(subtotal * (discount_pct / 100.0), 2)
    taxable_amount = max(0.0, subtotal - discount_amount)
    tax_amount = round(taxable_amount * (tax_pct / 100.0), 2)
    total_amount = round(taxable_amount + tax_amount, 2)

    # 3. Create Invoice Record
    new_invoice = Invoice(
        company_id=current_user.company_id,
        customer_id=customer.id,
        created_by_id=current_user.id,
        invoice_number=generate_invoice_number(db),
        status=InvoiceStatus.DRAFT,
        subtotal=subtotal,
        discount_percent=discount_pct,
        discount_amount=discount_amount,
        tax_percent=tax_pct,
        tax_amount=tax_amount,
        total_amount=total_amount,
        currency=invoice_in.currency or "USD",
        due_date=invoice_in.due_date,
        notes=invoice_in.notes,
        line_items=db_line_items
    )

    db.add(new_invoice)
    db.commit()
    db.refresh(new_invoice)
    return new_invoice

@router.get("", response_model=List[InvoiceResponse])
def list_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all invoices belonging to the authenticated user's company."""
    invoices = db.query(Invoice).filter(
        Invoice.company_id == current_user.company_id
    ).order_by(Invoice.created_at.desc()).all()
    return invoices

@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(invoice_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.company_id == current_user.company_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.patch("/{invoice_id}/status", response_model=InvoiceResponse)
def update_invoice_status(
    invoice_id: uuid.UUID,
    update_in: InvoiceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Updates the status of an invoice (e.g. mark as sent, paid, or cancelled)."""
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.company_id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.status = update_in.status
    if update_in.status == "paid":
        invoice.amount_paid = invoice.total_amount
        invoice.paid_at = datetime.utcnow()
    elif update_in.amount_paid is not None:
        invoice.amount_paid = update_in.amount_paid

    db.commit()
    db.refresh(invoice)
    return invoice

@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes an invoice."""
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.company_id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    db.delete(invoice)
    db.commit()
    return None


@router.get("/{invoice_id}/pdf")
def invoice_pdf(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate and return a branded PDF for an invoice owned by the caller's company."""
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.company_id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first() if invoice.customer_id else None
    company = db.query(Company).filter(Company.id == current_user.company_id).first()

    pdf_bytes = generate_invoice_pdf(invoice, customer, company.name if company else "")
    invoice.pdf_url = f"/api/v1/invoices/{invoice.id}/pdf"
    db.commit()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="invoice-{invoice.invoice_number}.pdf"'},
    )
