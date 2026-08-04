from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PipelineBase(BaseModel):
    stage: Optional[str] = "new"
    probability: Optional[float] = 0.0
    expected_close_date: Optional[datetime] = None
    notes: Optional[str] = None

class PipelineCreate(PipelineBase):
    company_id: Optional[str] = None
    lead_id: int

class PipelineUpdate(BaseModel):
    stage: Optional[str] = None
    probability: Optional[float] = None
    expected_close_date: Optional[datetime] = None
    notes: Optional[str] = None
    changed_by: Optional[str] = None

class PipelineResponse(PipelineBase):
    id: int
    company_id: str
    lead_id: int
    previous_stage: Optional[str] = None
    changed_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True