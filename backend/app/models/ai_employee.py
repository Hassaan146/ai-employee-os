import uuid
import enum
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum, JSON, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class AIRoleType(str, enum.Enum):
    EXECUTIVE = "executive"
    SALES = "sales"
    SUPPORT = "support"
    HR = "hr"
    FINANCE = "finance"
    ACCOUNTANT = "accountant"
    MARKETING = "marketing"
    LEGAL = "legal"

class AIEmployee(Base):
    __tablename__ = "ai_employees"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    role_type = Column(SQLEnum(AIRoleType), default=AIRoleType.EXECUTIVE, nullable=False)
    system_prompt = Column(Text, nullable=True)
    permissions = Column(JSON, default={}, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    company = relationship("Company", back_populates="ai_employees")
