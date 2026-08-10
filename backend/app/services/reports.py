"""Analytics aggregation for the Reports API (Member 3, Day 5).

All queries are tenant-scoped: pass the authenticated user's company_id.
Returns plain dicts for JSON responses.
"""
from datetime import datetime, timedelta

from sqlalchemy import Integer, cast, func
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceStatus
from app.models.meeting import Meeting, MeetingActionItem, MeetingStatus
from app.models.quotation import Quotation, QuotationStatus
from app.models.task import Task, TaskStatus

PERIODS = {"7d", "30d", "this_month", "all"}


def period_cutoff(period: str):
    now = datetime.utcnow()
    if period == "7d":
        return now - timedelta(days=7)
    if period == "30d":
        return now - timedelta(days=30)
    if period == "this_month":
        return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return None


def _f(v):
    """Coerce Decimal/None -> float."""
    return float(v) if v is not None else 0.0


def sales_report(db: Session, company_id, period: str = "all") -> dict:
    cutoff = period_cutoff(period)
    inv_filter = [Invoice.company_id == company_id]
    q_filter = [Quotation.company_id == company_id]
    if cutoff:
        inv_filter.append(Invoice.issue_date >= cutoff)
        q_filter.append(Quotation.created_at >= cutoff)

    # Invoices: counts + money
    inv_total = db.query(func.count(Invoice.id)).filter(*inv_filter).scalar() or 0
    inv_sum = db.query(func.sum(Invoice.total_amount)).filter(*inv_filter, Invoice.status != InvoiceStatus.CANCELLED).scalar() or 0
    paid_sum = db.query(func.sum(Invoice.amount_paid)).filter(*inv_filter, Invoice.status != InvoiceStatus.CANCELLED).scalar() or 0

    inv_by_status = {
        row[0].value: {"count": row[1], "total": _f(row[2])}
        for row in db.query(Invoice.status, func.count(Invoice.id), func.sum(Invoice.total_amount))
        .filter(*inv_filter).group_by(Invoice.status).all()
    }

    # Quotations
    q_total = db.query(func.count(Quotation.id)).filter(*q_filter).scalar() or 0
    q_sum = db.query(func.sum(Quotation.total_amount)).filter(*q_filter, Quotation.status != QuotationStatus.REJECTED).scalar() or 0
    q_by_status = {
        row[0].value: {"count": row[1], "total": _f(row[2])}
        for row in db.query(Quotation.status, func.count(Quotation.id), func.sum(Quotation.total_amount))
        .filter(*q_filter).group_by(Quotation.status).all()
    }

    # Top customers by invoiced amount
    top_customers = [
        {"name": row[0], "total_amount": _f(row[1])}
        for row in db.query(Customer.name, func.sum(Invoice.total_amount))
        .join(Invoice, Invoice.customer_id == Customer.id)
        .filter(Invoice.company_id == company_id, Invoice.status != InvoiceStatus.CANCELLED)
        .group_by(Customer.id).order_by(func.sum(Invoice.total_amount).desc()).limit(5).all()
    ]

    return {
        "period": period,
        "invoices": {
            "total": inv_total,
            "total_amount": _f(inv_sum),
            "collected": _f(paid_sum),
            "outstanding": _f(inv_sum - paid_sum),
            "by_status": inv_by_status,
        },
        "quotations": {
            "total": q_total,
            "total_amount": _f(q_sum),
            "by_status": q_by_status,
        },
        "top_customers": top_customers,
    }


def revenue_report(db: Session, company_id, period: str = "all") -> dict:
    cutoff = period_cutoff(period)
    inv_filter = [Invoice.company_id == company_id, Invoice.status != InvoiceStatus.CANCELLED]
    if cutoff:
        inv_filter.append(Invoice.issue_date >= cutoff)

    monthly = [
        {"month": row[0], "total_amount": _f(row[1]), "collected": _f(row[2])}
        for row in db.query(
            func.strftime("%Y-%m", Invoice.issue_date).label("month"),
            func.sum(Invoice.total_amount),
            func.sum(Invoice.amount_paid),
        ).filter(*inv_filter).group_by("month").order_by("month").all()
    ]

    return {
        "period": period,
        "total_revenue": _f(db.query(func.sum(Invoice.total_amount)).filter(*inv_filter).scalar()),
        "total_collected": _f(db.query(func.sum(Invoice.amount_paid)).filter(*inv_filter).scalar()),
        "monthly": monthly,
    }


def productivity_report(db: Session, company_id) -> dict:
    # Tasks
    task_total = db.query(func.count(Task.id)).filter(Task.company_id == company_id).scalar() or 0
    task_done = db.query(func.count(Task.id)).filter(Task.company_id == company_id, Task.status == TaskStatus.DONE).scalar() or 0
    tasks_by_status = {
        row[0].value: row[1]
        for row in db.query(Task.status, func.count(Task.id)).filter(Task.company_id == company_id).group_by(Task.status).all()
    }
    tasks_by_user = [
        {"assigned_to_id": str(row[0]) if row[0] else None, "total": row[1], "done": row[2]}
        for row in db.query(
            Task.assigned_to_id, func.count(Task.id),
            func.sum(cast(Task.status == TaskStatus.DONE, Integer)),
        ).filter(Task.company_id == company_id).group_by(Task.assigned_to_id).all()
    ]

    # Meetings + action items
    meeting_total = db.query(func.count(Meeting.id)).filter(Meeting.company_id == company_id).scalar() or 0
    meeting_done = db.query(func.count(Meeting.id)).filter(Meeting.company_id == company_id, Meeting.status == MeetingStatus.COMPLETED).scalar() or 0
    ai_total = db.query(func.count(MeetingActionItem.id)).join(Meeting, MeetingActionItem.meeting_id == Meeting.id).filter(Meeting.company_id == company_id).scalar() or 0
    ai_done = db.query(func.count(MeetingActionItem.id)).join(Meeting, MeetingActionItem.meeting_id == Meeting.id).filter(Meeting.company_id == company_id, MeetingActionItem.is_completed.is_(True)).scalar() or 0

    return {
        "tasks": {
            "total": task_total,
            "done": task_done,
            "completion_rate": round(task_done / task_total, 4) if task_total else 0.0,
            "by_status": tasks_by_status,
            "by_user": tasks_by_user,
        },
        "meetings": {"total": meeting_total, "completed": meeting_done},
        "action_items": {"total": ai_total, "completed": ai_done},
    }
