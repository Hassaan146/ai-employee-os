from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class LineItemCreate(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0

class LineItemResponse(BaseModel):
    id: str
    description: str
    quantity: float
    unit_price: float
    line_total: float

    class Config:
        from_attributes = True

class InvoiceCreate(BaseModel):
    customer_id: str
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
    id: str
    company_id: str
    customer_id: str
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

    class Config:
        from_attributes = True
