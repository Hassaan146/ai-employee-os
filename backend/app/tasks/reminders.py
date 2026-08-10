"""Payment due-date reminders (Member 3, Day 6).

Celery beat runs `process_due_date_reminders_task` daily (midnight). It finds
unpaid invoices that are due soon or already overdue and returns a summary for
a downstream notifier (email/WhatsApp) to consume.
"""
from datetime import datetime, timedelta

from celery import shared_task
from sqlalchemy import func

from app.core.database import SessionLocal
from app.models.invoice import Invoice, InvoiceStatus


@shared_task(name="process_due_date_reminders_task")
def process_due_date_reminders_task() -> dict:
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        soon = now + timedelta(days=3)

        # Invoices that have not been settled/cancelled.
        base = db.query(Invoice).filter(
            Invoice.status.notin_([InvoiceStatus.PAID, InvoiceStatus.CANCELLED])
        )

        overdue = base.filter(Invoice.due_date < now).all()
        due_soon = (
            db.query(Invoice)
            .filter(
                Invoice.status.notin_([InvoiceStatus.PAID, InvoiceStatus.CANCELLED]),
                Invoice.due_date >= now,
                Invoice.due_date <= soon,
            )
            .all()
        )

        return {
            "overdue_count": len(overdue),
            "overdue_invoices": [
                {"id": str(i.id), "number": i.invoice_number, "company_id": str(i.company_id)}
                for i in overdue
            ],
            "due_soon_count": len(due_soon),
            "due_soon_invoices": [
                {"id": str(i.id), "number": i.invoice_number, "company_id": str(i.company_id)}
                for i in due_soon
            ],
        }
    finally:
        db.close()