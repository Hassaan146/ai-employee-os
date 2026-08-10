import uuid
import enum
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base, Uuid


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    DONE = "done"
    CANCELLED = "cancelled"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)

    company_id = Column(Uuid, nullable=False, index=True)  # references companies.id (FK to be added once companies model exists)
    assigned_to_id = Column(Uuid, nullable=True, index=True)  # references users.id (FK to be added once users model exists)
    created_by_id = Column(Uuid, nullable=True)  # references users.id (FK to be added once users model exists)

    # Optional links to related records (task can stand alone or relate to a customer/lead)
    customer_id = Column(Uuid, nullable=True)  # references customers.id (FK to be added once customers model exists)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM, nullable=False)
    status = Column(Enum(TaskStatus), default=TaskStatus.TODO, nullable=False)

    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    reminder_sent = Column(Boolean, default=False, nullable=False)
    is_ai_generated = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
