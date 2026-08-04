import uuid
import enum
from datetime import datetime

from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Enum, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Tenant isolation
    company_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # references companies.id (FK to be added once companies model exists)

    # Relations (owned by other members' models)
    customer_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # references customers.id (FK to be added once customers model exists)
    created_by_id = Column(UUID(as_uuid=True), nullable=True)  # references users.id (FK to be added once users model exists)

    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.DRAFT, nullable=False)

    # Financials
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    tax_percent = Column(Numeric(5, 2), nullable=False, default=0)
    tax_amount = Column(Numeric(12, 2), nullable=False, default=0)
    discount_percent = Column(Numeric(5, 2), nullable=False, default=0)
    discount_amount = Column(Numeric(12, 2), nullable=False, default=0)
    total_amount = Column(Numeric(12, 2), nullable=False, default=0)
    amount_paid = Column(Numeric(12, 2), nullable=False, default=0)

    currency = Column(String(10), nullable=False, default="USD")

    # Payment
    payment_link = Column(String(500), nullable=True)
    is_recurring = Column(Boolean, default=False, nullable=False)

    # Dates
    issue_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    due_date = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)

    notes = Column(Text, nullable=True)
    pdf_url = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    line_items = relationship("InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False, index=True)

    description = Column(String(500), nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False, default=1)
    unit_price = Column(Numeric(12, 2), nullable=False, default=0)
    line_total = Column(Numeric(12, 2), nullable=False, default=0)

    invoice = relationship("Invoice", back_populates="line_items")
