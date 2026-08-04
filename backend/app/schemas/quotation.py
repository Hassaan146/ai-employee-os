"""Pydantic schemas for the Quotation engine (Member 3, Day 3)."""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.quotation import QuotationStatus


# --- line items -----------------------------------------------------
class QuotationLineItemCreate(BaseModel):
    description: str
    quantity: Decimal = Decimal("1")
    unit_price: Decimal = Decimal("0")


class QuotationLineItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    description: str
    quantity: Decimal
    unit_price: Decimal
    line_total: Decimal


# --- quotation ------------------------------------------------------
class QuotationCreate(BaseModel):
    customer_id: uuid.UUID
    quotation_number: str
    currency: str = "USD"
    tax_percent: Decimal = Decimal("0")
    discount_percent: Decimal = Decimal("0")
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None
    line_items: list[QuotationLineItemCreate] = []


class QuotationUpdate(BaseModel):
    """Editing is only honoured while the quotation is DRAFT or SENT."""
    currency: Optional[str] = None
    tax_percent: Optional[Decimal] = None
    discount_percent: Optional[Decimal] = None
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None
    line_items: Optional[list[QuotationLineItemCreate]] = None


class QuotationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID
    customer_id: uuid.UUID
    created_by_id: Optional[uuid.UUID] = None

    quotation_number: str
    currency: str
    status: QuotationStatus

    subtotal: Decimal
    tax_percent: Decimal
    tax_amount: Decimal
    discount_percent: Decimal
    discount_amount: Decimal
    total_amount: Decimal

    valid_until: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by_id: Optional[uuid.UUID] = None
    converted_invoice_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    pdf_url: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    line_items: list[QuotationLineItemRead] = []