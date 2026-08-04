import uuid
import enum
from datetime import datetime

from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Enum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class QuotationStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CONVERTED = "converted"  # converted into an invoice


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    company_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # references companies.id (FK to be added once companies model exists)
    customer_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # references customers.id (FK to be added once customers model exists)
    created_by_id = Column(UUID(as_uuid=True), nullable=True)  # references users.id (FK to be added once users model exists)

    quotation_number = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(Enum(QuotationStatus), default=QuotationStatus.DRAFT, nullable=False)

    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    tax_percent = Column(Numeric(5, 2), nullable=False, default=0)
    tax_amount = Column(Numeric(12, 2), nullable=False, default=0)
    discount_percent = Column(Numeric(5, 2), nullable=False, default=0)
    discount_amount = Column(Numeric(12, 2), nullable=False, default=0)
    total_amount = Column(Numeric(12, 2), nullable=False, default=0)

    currency = Column(String(10), nullable=False, default="USD")

    valid_until = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    approved_by_id = Column(UUID(as_uuid=True), nullable=True)  # references users.id (FK to be added once users model exists)

    # If converted to an invoice
    converted_invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=True)

    notes = Column(Text, nullable=True)
    pdf_url = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    line_items = relationship("QuotationLineItem", back_populates="quotation", cascade="all, delete-orphan")


class QuotationLineItem(Base):
    __tablename__ = "quotation_line_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_id = Column(UUID(as_uuid=True), ForeignKey("quotations.id"), nullable=False, index=True)

    description = Column(String(500), nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False, default=1)
    unit_price = Column(Numeric(12, 2), nullable=False, default=0)
    line_total = Column(Numeric(12, 2), nullable=False, default=0)

    quotation = relationship("Quotation", back_populates="line_items")
