# backend/app/models/lead.py

import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Lead(Base):
    __tablename__ = "leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)

    name = Column(String, nullable=False)
    email = Column(String, index=True)
    phone = Column(String)
    source = Column(String)  # e.g. website, referral, cold call, whatsapp
    stage = Column(String, default="new")  # new, contacted, qualified, proposal, won, lost
    value = Column(Float, default=0.0)  # potential deal value
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("Customer", back_populates="leads")
    pipeline_entries = relationship("SalesPipeline", back_populates="lead")
    activities = relationship("ActivityTimeline", back_populates="lead")