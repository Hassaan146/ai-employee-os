import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base, Uuid

class ActivityTimeline(Base):
    __tablename__ = "activity_timelines"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(Uuid, ForeignKey("companies.id"), nullable=False)
    customer_id = Column(Uuid, ForeignKey("customers.id"), nullable=True)
    lead_id = Column(Uuid, ForeignKey("leads.id"), nullable=True)

    activity_type = Column(String, nullable=False)  # e.g. call, email, meeting, note, stage_change, task
    description = Column(Text, nullable=True)
    performed_by = Column(Uuid, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer", back_populates="activities")
    lead = relationship("Lead", back_populates="activities")