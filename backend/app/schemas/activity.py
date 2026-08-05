import uuid
from pydantic import BaseModel, field_serializer
from typing import Optional, Union
from datetime import datetime

class ActivityBase(BaseModel):
    activity_type: str  # call, email, meeting, note, stage_change, task
    description: Optional[str] = None

class ActivityCreate(ActivityBase):
    lead_id: Optional[Union[str, uuid.UUID]] = None
    customer_id: Optional[Union[str, uuid.UUID]] = None
    performed_by: Optional[Union[str, uuid.UUID]] = None

class ActivityResponse(ActivityBase):
    id: Union[str, uuid.UUID]
    company_id: Union[str, uuid.UUID]
    lead_id: Optional[Union[str, uuid.UUID]] = None
    customer_id: Optional[Union[str, uuid.UUID]] = None
    performed_by: Optional[Union[str, uuid.UUID]] = None
    created_at: datetime

    @field_serializer("id", "company_id", "lead_id", "customer_id", "performed_by", mode="plain")
    def serialize_uuid_fields(self, v):
        return str(v) if v is not None else None

    class Config:
        from_attributes = True