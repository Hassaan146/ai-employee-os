import uuid
import enum

from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, JSON, func

from app.core.database import Base, Uuid


class AuditActorType(str, enum.Enum):
    """Who performed the operation: a logged-in user, an AI employee/tool, or the system."""
    USER = "user"
    AI = "ai"
    SYSTEM = "system"


class AuditStatus(str, enum.Enum):
    SUCCESS = "success"
    FAILURE = "failure"


class AuditLog(Base):
    """Enterprise audit trail (Member 3, Day 9).

    Append-only, tenant-scoped record of every AI and user operation.
    Rows are written via app.services.audit_logger.log_audit() and are
    never updated or deleted through the public API.
    """
    __tablename__ = "audit_logs"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(Uuid, nullable=False, index=True)

    # Who performed the operation
    actor_type = Column(SQLEnum(AuditActorType), default=AuditActorType.USER, nullable=False, index=True)
    actor_id = Column(Uuid, nullable=True, index=True)  # user id for human actors
    actor_name = Column(String(255), nullable=True)  # denormalized name/email (or AI tool name) for display

    # What was done
    action = Column(String(100), nullable=False, index=True)  # login, register, create, update, send_email, execute_tool
    resource_type = Column(String(50), nullable=False, index=True)  # customer, lead, invoice, quotation, task, meeting, document, email, ai_tool, auth
    resource_id = Column(String(64), nullable=True, index=True)  # stringified id of the affected record
    details = Column(JSON, nullable=True)  # request params / outcome summary
    status = Column(SQLEnum(AuditStatus), default=AuditStatus.SUCCESS, nullable=False, index=True)

    ip_address = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
