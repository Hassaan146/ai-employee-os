"""Enterprise Audit Log endpoints (Member 3, Day 9).

Append-only, tenant-scoped trail of every AI and user operation. Rows are
written via app.services.audit_logger.log_audit() from auth and AI tool
execution (and, going forward, every mutating endpoint).
"""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.audit_log import AuditLog, AuditActorType, AuditStatus
from app.models.user import User
from app.schemas.audit import AuditLogResponse

router = APIRouter(prefix="/api/v1/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=list[AuditLogResponse])
def list_audit_logs(
    current_user: User = Depends(get_current_user),
    actor_type: Optional[AuditActorType] = Query(None),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    status: Optional[AuditStatus] = Query(None),
    search: Optional[str] = Query(None, description="Free-text match on actor_name / action / resource_type / resource_id"),
    date_from: Optional[datetime] = Query(None, description="ISO datetime; only logs on/after this are returned"),
    date_to: Optional[datetime] = Query(None, description="ISO datetime; only logs on/before this are returned"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog).filter(AuditLog.company_id == current_user.company_id)

    if actor_type:
        query = query.filter(AuditLog.actor_type == actor_type)
    if action:
        query = query.filter(AuditLog.action == action)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if status:
        query = query.filter(AuditLog.status == status)
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                AuditLog.actor_name.ilike(like),
                AuditLog.action.ilike(like),
                AuditLog.resource_type.ilike(like),
                AuditLog.resource_id.ilike(like),
            )
        )
    if date_from:
        query = query.filter(AuditLog.created_at >= date_from)
    if date_to:
        query = query.filter(AuditLog.created_at <= date_to)

    return (
        query.order_by(AuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/stats")
def audit_stats(
    current_user: User = Depends(get_current_user),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
):
    """Roll-up of the company's audit trail: totals and breakdowns by action, resource and actor."""
    base = [AuditLog.company_id == current_user.company_id]
    if date_from:
        base.append(AuditLog.created_at >= date_from)
    if date_to:
        base.append(AuditLog.created_at <= date_to)

    total = db.query(func.count(AuditLog.id)).filter(*base).scalar() or 0
    success_count = (
        db.query(func.count(AuditLog.id))
        .filter(*base, AuditLog.status == AuditStatus.SUCCESS)
        .scalar() or 0
    )
    failure_count = (
        db.query(func.count(AuditLog.id))
        .filter(*base, AuditLog.status == AuditStatus.FAILURE)
        .scalar() or 0
    )

    by_action = _count_rows(db, AuditLog.action, base)
    by_resource = _count_rows(db, AuditLog.resource_type, base)
    by_actor_type = _count_rows(db, AuditLog.actor_type, base)

    return {
        "total": total,
        "success_count": success_count,
        "failure_count": failure_count,
        "success_rate": round(success_count / total, 4) if total else 0,
        "by_action": by_action,
        "by_resource": by_resource,
        "by_actor_type": by_actor_type,
    }


@router.get("/{log_id}", response_model=AuditLogResponse)
def get_audit_log(
    log_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        valid_log_id = uuid.UUID(str(log_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="Audit log entry not found")

    entry = (
        db.query(AuditLog)
        .filter(AuditLog.id == valid_log_id, AuditLog.company_id == current_user.company_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Audit log entry not found")
    return entry


def _count_rows(db: Session, column, base_filters) -> dict:
    """Group count helper — normalizes enum keys to their string values for JSON."""
    rows = (
        db.query(column, func.count(AuditLog.id))
        .filter(*base_filters)
        .group_by(column)
        .all()
    )
    return {getattr(k, "value", k): v for k, v in rows}
