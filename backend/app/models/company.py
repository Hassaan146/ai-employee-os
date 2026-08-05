import uuid
import enum
from sqlalchemy import Column, String, Integer, DateTime, Enum as SQLEnum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class PricingTier(str, enum.Enum):
    BASIC = "basic"
    PRO = "pro"
    BUSINESS = "business"

class Company(Base):
    __tablename__ = "companies"

    #fields
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    pricing_tier = Column(SQLEnum(PricingTier), default=PricingTier.BASIC, nullable=False)
    
    #some deafult parameters
    max_users = Column(Integer, default=1, nullable=False)
    max_ai_requests = Column(Integer, default=500, nullable=False)
    max_storage_gb = Column(Integer, default=1, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    users = relationship("User", back_populates="company", cascade="all, delete-orphan")
    ai_employees = relationship("AIEmployee", back_populates="company", cascade="all, delete-orphan")
