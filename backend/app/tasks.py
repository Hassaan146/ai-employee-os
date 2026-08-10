import uuid
from datetime import datetime
from app.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.invoice import Invoice, InvoiceStatus

@celery_app.task(name="process_due_date_reminders_task")
def process_due_date_reminders_task():
    """Background task to check for past due invoices and update status to OVERDUE."""
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        # Find unpaid invoices past due date
        overdue_invoices = db.query(Invoice).filter(
            Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.DRAFT, InvoiceStatus.PARTIALLY_PAID]),
            Invoice.due_date < now
        ).all()

        updated_count = 0
        for inv in overdue_invoices:
            inv.status = InvoiceStatus.OVERDUE
            updated_count += 1

        db.commit()
        return {"status": "success", "overdue_invoices_updated": updated_count}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()

@celery_app.task(name="generate_recurring_invoices_task")
def generate_recurring_invoices_task():
    """Background task to generate recurring invoices."""
    db = SessionLocal()
    try:
        recurring_invoices = db.query(Invoice).filter(
            Invoice.is_recurring == True
        ).all()

        generated_count = 0
        date_str = datetime.utcnow().strftime("%Y%m%d")

        for parent_inv in recurring_invoices:
            count = db.query(Invoice).count() + 1
            new_inv_num = f"INV-REC-{date_str}-{1000 + count}"

            new_inv = Invoice(
                company_id=parent_inv.company_id,
                customer_id=parent_inv.customer_id,
                created_by_id=parent_inv.created_by_id,
                invoice_number=new_inv_num,
                status=InvoiceStatus.DRAFT,
                subtotal=parent_inv.subtotal,
                discount_percent=parent_inv.discount_percent,
                discount_amount=parent_inv.discount_amount,
                tax_percent=parent_inv.tax_percent,
                tax_amount=parent_inv.tax_amount,
                total_amount=parent_inv.total_amount,
                currency=parent_inv.currency,
                notes=f"Auto-generated recurring invoice from {parent_inv.invoice_number}",
                is_recurring=False
            )
            db.add(new_inv)
            generated_count += 1

        db.commit()
        return {"status": "success", "recurring_invoices_generated": generated_count}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()