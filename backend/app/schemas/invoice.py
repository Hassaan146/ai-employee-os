import uuid
from pydantic import BaseModel, field_serializer
from typing import List, Optional, Union
from datetime import datetime

class LineItemCreate(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0

class LineItemResponse(BaseModel):
    id: Union[str, uuid.UUID]
    description: str
    quantity: float
    unit_price: float
    line_total: float

    @field_serializer("id", mode="plain")
    def serialize_uuid_fields(self, v):
        return str(v) if v is not None else None

    class Config:
        from_attributes = True

class InvoiceCreate(BaseModel):
    customer_id: Union[str, uuid.UUID]
    line_items: List[LineItemCreate]
    tax_percent: Optional[float] = 0.0
    discount_percent: Optional[float] = 0.0
    currency: Optional[str] = "USD"
    due_date: Optional[datetime] = None
    notes: Optional[str] = None

class InvoiceStatusUpdate(BaseModel):
    status: str
    amount_paid: Optional[float] = None

class InvoiceResponse(BaseModel):
    id: Union[str, uuid.UUID]
    company_id: Union[str, uuid.UUID]
    customer_id: Union[str, uuid.UUID]
    invoice_number: str
    status: str
    subtotal: float
    tax_percent: float
    tax_amount: float
    discount_percent: float
    discount_amount: float
    total_amount: float
    amount_paid: float
    currency: str
    notes: Optional[str] = None
    due_date: Optional[datetime] = None
    issue_date: datetime
    created_at: datetime
    line_items: List[LineItemResponse] = []

    @field_serializer("id", "company_id", "customer_id", mode="plain")
    def serialize_uuid_fields(self, v):
        return str(v) if v is not None else None

    class Config:
        from_attributes = True
