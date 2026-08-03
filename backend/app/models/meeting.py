import uuid
import enum
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class MeetingStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    company_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # references companies.id (FK to be added once companies model exists)
    customer_id = Column(UUID(as_uuid=True), nullable=True)  # references customers.id (FK to be added once customers model exists)
    organized_by_id = Column(UUID(as_uuid=True), nullable=True)  # references users.id (FK to be added once users model exists)

    title = Column(String(255), nullable=False)
    status = Column(Enum(MeetingStatus), default=MeetingStatus.SCHEDULED, nullable=False)

    scheduled_at = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)

    # Transcript & AI outputs
    transcript_text = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)

    recording_url = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    speakers = relationship("MeetingSpeakerLog", back_populates="meeting", cascade="all, delete-orphan")
    action_items = relationship("MeetingActionItem", back_populates="meeting", cascade="all, delete-orphan")


class MeetingSpeakerLog(Base):
    __tablename__ = "meeting_speaker_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id"), nullable=False, index=True)

    speaker_label = Column(String(100), nullable=False)  # e.g. "Speaker 1" or identified name
    start_time_seconds = Column(Integer, nullable=True)
    end_time_seconds = Column(Integer, nullable=True)
    text = Column(Text, nullable=True)

    meeting = relationship("Meeting", back_populates="speakers")


class MeetingActionItem(Base):
    __tablename__ = "meeting_action_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id"), nullable=False, index=True)

    description = Column(Text, nullable=False)
    assigned_to_id = Column(UUID(as_uuid=True), nullable=True)  # references users.id (FK to be added once users model exists)
    deadline = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False, nullable=False)

    # Optional link if this action item was converted into a Task
    linked_task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=True)

    meeting = relationship("Meeting", back_populates="action_items")
