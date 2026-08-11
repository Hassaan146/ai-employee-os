"""Background task package (Day 6). Auto-discovered by Celery via app.celery_app."""
from app.tasks.reminders import process_due_date_reminders_task
from app.tasks.recurring_invoices import generate_recurring_invoices_task

__all__ = ["process_due_date_reminders_task", "generate_recurring_invoices_task"]