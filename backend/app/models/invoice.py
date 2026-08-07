import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum as SQLEnum, Text, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base, Uuid

class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Uuid, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    company_id = Column(Uuid, nullable=False, index=True)
    customer_id = Column(Uuid, nullable=False, index=True)
    created_by_id = Column(Uuid, nullable=True, index=True)

    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(SQLEnum(InvoiceStatus), default=InvoiceStatus.DRAFT, nullable=False)

    subtotal = Column(Float, nullable=False, default=0.0)
    tax_percent = Column(Float, nullable=False, default=0.0)
    tax_amount = Column(Float, nullable=False, default=0.0)
    discount_percent = Column(Float, nullable=False, default=0.0)
    discount_amount = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)
    amount_paid = Column(Float, nullable=False, default=0.0)

    currency = Column(String(10), nullable=False, default="USD")
    payment_link = Column(String(500), nullable=True)
    is_recurring = Column(Boolean, default=False, nullable=False)

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

    id = Column(Uuid, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    invoice_id = Column(Uuid, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)

    description = Column(String(500), nullable=False)
    quantity = Column(Float, nullable=False, default=1.0)
    unit_price = Column(Float, nullable=False, default=0.0)
    line_total = Column(Float, nullable=False, default=0.0)

    invoice = relationship("Invoice", back_populates="line_items")
