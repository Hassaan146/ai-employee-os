# backend/app/models/activity_timeline.py

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class ActivityTimeline(Base):
    __tablename__ = "activity_timelines"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)

    activity_type = Column(String, nullable=False)  # e.g. call, email, meeting, note, stage_change, task
    description = Column(Text, nullable=True)
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer", back_populates="activities")
    lead = relationship("Lead", back_populates="activities")