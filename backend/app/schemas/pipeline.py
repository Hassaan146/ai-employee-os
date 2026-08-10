import uuid
from pydantic import BaseModel, field_serializer
from typing import Optional, Union
from datetime import datetime

class PipelineBase(BaseModel):
    stage: Optional[str] = "new"
    probability: Optional[float] = 0.0
    expected_close_date: Optional[datetime] = None
    notes: Optional[str] = None

class PipelineCreate(PipelineBase):
    lead_id: Union[str, uuid.UUID]

class PipelineUpdate(BaseModel):
    stage: Optional[str] = None
    probability: Optional[float] = None
    expected_close_date: Optional[datetime] = None
    notes: Optional[str] = None
    changed_by: Optional[Union[str, uuid.UUID]] = None

class PipelineResponse(PipelineBase):
    id: Union[str, uuid.UUID]
    company_id: Union[str, uuid.UUID]
    lead_id: Union[str, uuid.UUID]
    previous_stage: Optional[str] = None
    changed_by: Optional[Union[str, uuid.UUID]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_serializer("id", "company_id", "lead_id", "changed_by", mode="plain")
    def serialize_uuid_fields(self, v):
        return str(v) if v is not None else None

    class Config:
        from_attributes = True