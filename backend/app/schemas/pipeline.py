import uuid
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PipelineBase(BaseModel):
    stage: Optional[str] = "new"
    probability: Optional[float] = 0.0
    expected_close_date: Optional[datetime] = None
    notes: Optional[str] = None

class PipelineCreate(PipelineBase):
    """company_id comes from the authenticated user's JWT, not the client."""
    lead_id: uuid.UUID

class PipelineUpdate(BaseModel):
    stage: Optional[str] = None
    probability: Optional[float] = None
    expected_close_date: Optional[datetime] = None
    notes: Optional[str] = None
    changed_by: Optional[uuid.UUID] = None

class PipelineResponse(PipelineBase):
    id: uuid.UUID
    company_id: uuid.UUID
    lead_id: uuid.UUID
    previous_stage: Optional[str] = None
    changed_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True