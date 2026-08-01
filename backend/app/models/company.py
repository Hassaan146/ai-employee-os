from sqlalchemy import Column, Integer, String, DateTime, Enum, func
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base

class PricingTier(str, enum.Enum):
    BASIC = "basic"
    PRO = "pro"
    BUSINESS = "business"

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    pricing_tier = Column(Enum(PricingTier), default=PricingTier.BASIC, nullable=False)
    
    # Tier usage limits (from EmployeeOS.md spec)
    max_users = Column(Integer, default=1, nullable=False)
    max_ai_requests = Column(Integer, default=500, nullable=False)
    max_storage_gb = Column(Integer, default=1, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    users = relationship("User", back_populates="company", cascade="all, delete-orphan")
    ai_employees = relationship("AIEmployee", back_populates="company", cascade="all, delete-orphan")
