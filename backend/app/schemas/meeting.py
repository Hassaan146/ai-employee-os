"""Meeting Assistant schemas (Member 3, Day 4)."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.meeting import MeetingStatus


class MeetingCreate(BaseModel):
    title: str
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    customer_id: Optional[uuid.UUID] = None


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[MeetingStatus] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    transcript_text: Optional[str] = None
    ai_summary: Optional[str] = None
    recording_url: Optional[str] = None


class MeetingSpeakerLogCreate(BaseModel):
    speaker_label: str
    start_time_seconds: Optional[int] = None
    end_time_seconds: Optional[int] = None
    text: Optional[str] = None


class MeetingSpeakerLogRead(MeetingSpeakerLogCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_id: uuid.UUID


class MeetingActionItemCreate(BaseModel):
    description: str
    assigned_to_id: Optional[uuid.UUID] = None
    deadline: Optional[datetime] = None


class MeetingActionItemUpdate(BaseModel):
    description: Optional[str] = None
    is_completed: Optional[bool] = None


class MeetingActionItemRead(MeetingActionItemCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_id: uuid.UUID
    is_completed: bool = False
    linked_task_id: Optional[uuid.UUID] = None


class MeetingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID
    customer_id: Optional[uuid.UUID] = None
    organized_by_id: Optional[uuid.UUID] = None

    title: str
    status: MeetingStatus
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None

    transcript_text: Optional[str] = None
    ai_summary: Optional[str] = None
    recording_url: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    speakers: list[MeetingSpeakerLogRead] = []
    action_items: list[MeetingActionItemRead] = []
