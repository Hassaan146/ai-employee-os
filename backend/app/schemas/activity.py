# app/schemas/activity.py

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ActivityBase(BaseModel):
    activity_type: str  # call, email, meeting, note, stage_change, task
    description: Optional[str] = None

class ActivityCreate(ActivityBase):
    company_id: int
    lead_id: Optional[int] = None
    customer_id: Optional[int] = None
    performed_by: Optional[int] = None

class ActivityResponse(ActivityBase):
    id: int
    company_id: int
    lead_id: Optional[int] = None
    customer_id: Optional[int] = None
    performed_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True