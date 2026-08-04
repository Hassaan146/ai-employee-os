# backend/app/models/sales_pipeline.py

import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class SalesPipeline(Base):
    __tablename__ = "sales_pipelines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False)

    stage = Column(String, default="new")  # new, contacted, qualified, proposal, negotiation, won, lost
    previous_stage = Column(String, nullable=True)  # stage transition track karne ke liye
    probability = Column(Float, default=0.0)  # win probability %
    expected_close_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)

    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # kis user ne stage change ki
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lead = relationship("Lead", back_populates="pipeline_entries")