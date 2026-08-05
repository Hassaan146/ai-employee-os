import uuid
from datetime import datetime
from typing import Optional, Union, List
from pydantic import BaseModel, ConfigDict, field_serializer

from app.models.task import TaskPriority, TaskStatus


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.TODO
    due_date: Optional[datetime] = None
    assigned_to_id: Optional[Union[str, uuid.UUID]] = None
    customer_id: Optional[Union[str, uuid.UUID]] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[datetime] = None
    assigned_to_id: Optional[Union[str, uuid.UUID]] = None
    customer_id: Optional[Union[str, uuid.UUID]] = None


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: Union[str, uuid.UUID]
    company_id: Union[str, uuid.UUID]
    created_by_id: Optional[Union[str, uuid.UUID]] = None
    completed_at: Optional[datetime] = None
    reminder_sent: bool
    is_ai_generated: bool
    created_at: datetime
    updated_at: datetime

    @field_serializer("id", "company_id", "created_by_id", "assigned_to_id", "customer_id", mode="plain")
    def serialize_uuid_fields(self, v):
        return str(v) if v is not None else None


class TaskListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[TaskRead]
