"""Recurring invoice generation (Member 3, Day 6).

Celery beat runs `generate_recurring_invoices_task` daily (1 AM, from
app.celery_app). For every paid recurring invoice, creates the next cycle's
invoice (same customer + line items + taxes), with a fresh due date.
Idempotency guard: a follow-up is only created if the reference invoice is the
newest invoice for that company (no later invoice already exists).
"""
import uuid
from datetime import datetime, timedelta

from celery import shared_task
from sqlalchemy import func

from app.core.database import SessionLocal
from app.models.invoice import Invoice, InvoiceLineItem, InvoiceStatus


def _next_due_date(base: datetime) -> datetime:
    """Next cycle due date: 30 days after the reference invoice's due date."""
    anchor = base or datetime.utcnow()
    return anchor + timedelta(days=30)


@shared_task(name="generate_recurring_invoices_task")
def generate_recurring_invoices_task() -> dict:
    db = SessionLocal()
    generated = 0
    try:
        # Completed recurring cycles to clone for the next period.
        recurring = (
            db.query(Invoice)
            .filter(
                Invoice.is_recurring.is_(True),
                Invoice.status.in_([InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID]),
            )
            .all()
        )

        for inv in recurring:
            # Idempotency guard: skip if a newer invoice exists for this company.
            newer = (
                db.query(func.count(Invoice.id))
                .filter(
                    Invoice.company_id == inv.company_id,
                    Invoice.id != inv.id,
                    Invoice.issue_date > inv.issue_date,
                )
                .scalar()
            )
            if newer:
                continue

            new_inv = Invoice(
                company_id=inv.company_id,
                customer_id=inv.customer_id,
                created_by_id=inv.created_by_id,
                invoice_number=f"INV-REC-{uuid.uuid4().hex[:10]}",
                status=InvoiceStatus.DRAFT,
                currency=inv.currency,
                subtotal=inv.subtotal,
                tax_percent=inv.tax_percent,
                tax_amount=inv.tax_amount,
                discount_percent=inv.discount_percent,
                discount_amount=inv.discount_amount,
                total_amount=inv.total_amount,
                amount_paid=0,
                is_recurring=True,
                issue_date=datetime.utcnow(),
                due_date=_next_due_date(inv.due_date),
                notes=inv.notes,
            )
            for li in inv.line_items:
                new_inv.line_items.append(
                    InvoiceLineItem(
                        description=li.description,
                        quantity=li.quantity,
                        unit_price=li.unit_price,
                        line_total=li.line_total,
                    )
                )
            db.add(new_inv)
            generated += 1

        db.commit()
    finally:
        db.close()

    return {"generated": generated}