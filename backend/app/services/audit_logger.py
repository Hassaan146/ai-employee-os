"""Central audit-logging helper (Member 3, Day 9).

Call log_audit() from any user, AI, or system operation that should be
traceable (auth, AI tool execution, and — going forward — every mutating
endpoint). Rows are append-only; there is no public update/delete path.
"""
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog, AuditActorType, AuditStatus


def log_audit(
    db: Session,
    company_id: Any,
    action: str,
    resource_type: str,
    resource_id: Optional[Any] = None,
    actor_type: AuditActorType = AuditActorType.USER,
    actor_id: Optional[Any] = None,
    actor_name: Optional[str] = None,
    details: Optional[dict] = None,
    status: AuditStatus = AuditStatus.SUCCESS,
    ip_address: Optional[str] = None,
) -> Optional[AuditLog]:
    """Persist one audit-log row and return it.

    Never raises: audit logging must not break the business operation it
    records. On any write error the row is rolled back and None is returned.
    """
    try:
        entry = AuditLog(
            company_id=str(company_id),
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            actor_type=actor_type,
            actor_id=str(actor_id) if actor_id is not None else None,
            actor_name=actor_name,
            details=details,
            status=status,
            ip_address=ip_address,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry
    except Exception:
        db.rollback()
        return None
