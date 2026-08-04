"""Quotation engine routes (Member 3, Day 3).

Tenant-isolated: company_id always comes from the authenticated user's JWT.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.customer import Customer
from app.models.quotation import Quotation, QuotationLineItem, QuotationStatus
from app.models.user import User
from app.schemas.quotation import (
    QuotationCreate,
    QuotationUpdate,
    QuotationRead,
)
from app.services.calculations import compute_line_total, compute_totals
from app.services.quotation_calculator import (
    can_approve,
    can_edit,
    can_reject,
    can_send,
)

router = APIRouter(prefix="/api/v1/quotations", tags=["Quotations"])


def _get_owned_quotation(qid: uuid.UUID, current_user: User, db: Session) -> Quotation:
    quotation = (
        db.query(Quotation)
        .filter(Quotation.id == qid, Quotation.company_id == current_user.company_id)
        .first()
    )
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quotation


@router.post("", response_model=QuotationRead, status_code=status.HTTP_201_CREATED)
def create_quotation(
    quotation_in: QuotationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # The referenced customer must belong to this tenant.
    customer = (
        db.query(Customer)
        .filter(
            Customer.id == quotation_in.customer_id,
            Customer.company_id == current_user.company_id,
        )
        .first()
    )
    if not customer:
        raise HTTPException(status_code=400, detail="Customer not found in this company")

    existing = (
        db.query(Quotation)
        .filter(Quotation.quotation_number == quotation_in.quotation_number)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Quotation number already exists")

    line_totals = [compute_line_total(li.quantity, li.unit_price) for li in quotation_in.line_items]
    totals = compute_totals(line_totals, quotation_in.tax_percent, quotation_in.discount_percent)

    quotation = Quotation(
        company_id=current_user.company_id,
        created_by_id=current_user.id,
        customer_id=quotation_in.customer_id,
        quotation_number=quotation_in.quotation_number,
        currency=quotation_in.currency,
        tax_percent=quotation_in.tax_percent,
        discount_percent=quotation_in.discount_percent,
        valid_until=quotation_in.valid_until,
        notes=quotation_in.notes,
        status=QuotationStatus.DRAFT,
        subtotal=totals["subtotal"],
        tax_amount=totals["tax_amount"],
        discount_amount=totals["discount_amount"],
        total_amount=totals["total_amount"],
    )
    for li in quotation_in.line_items:
        quotation.line_items.append(
            QuotationLineItem(
                description=li.description,
                quantity=li.quantity,
                unit_price=li.unit_price,
                line_total=compute_line_total(li.quantity, li.unit_price),
            )
        )

    db.add(quotation)
    db.commit()
    db.refresh(quotation)
    return quotation


@router.get("", response_model=list[QuotationRead])
def list_quotations(
    current_user: User = Depends(get_current_user),
    status_filter: Optional[QuotationStatus] = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    query = db.query(Quotation).filter(Quotation.company_id == current_user.company_id)
    if status_filter:
        query = query.filter(Quotation.status == status_filter)
    return (
        query.order_by(Quotation.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{quotation_id}", response_model=QuotationRead)
def get_quotation(
    quotation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_owned_quotation(quotation_id, current_user, db)


@router.patch("/{quotation_id}", response_model=QuotationRead)
def update_quotation(
    quotation_id: uuid.UUID,
    quotation_in: QuotationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    quotation = _get_owned_quotation(quotation_id, current_user, db)

    if not can_edit(quotation.status):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit a quotation in status '{quotation.status.value}'",
        )

    data = quotation_in.model_dump(exclude_unset=True)
    new_line_items = data.pop("line_items", None)

    for field, value in data.items():
        setattr(quotation, field, value)

    if new_line_items is not None:
        for old in list(quotation.line_items):
            db.delete(old)
        db.flush()
        for li in new_line_items:
            db.add(
                QuotationLineItem(
                    quotation_id=quotation.id,
                    description=li["description"],
                    quantity=li["quantity"],
                    unit_price=li["unit_price"],
                    line_total=compute_line_total(li["quantity"], li["unit_price"]),
                )
            )
        db.flush()

    # Recompute totals from the (possibly changed) line items + current tax/discount.
    db.refresh(quotation)
    line_totals = [compute_line_total(li.quantity, li.unit_price) for li in quotation.line_items]
    totals = compute_totals(line_totals, quotation.tax_percent, quotation.discount_percent)
    quotation.subtotal = totals["subtotal"]
    quotation.discount_amount = totals["discount_amount"]
    quotation.tax_amount = totals["tax_amount"]
    quotation.total_amount = totals["total_amount"]

    db.commit()
    db.refresh(quotation)
    return quotation


@router.post("/{quotation_id}/send", response_model=QuotationRead)
def send_quotation(
    quotation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    quotation = _get_owned_quotation(quotation_id, current_user, db)
    if not can_send(quotation.status):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot send a quotation in status '{quotation.status.value}'",
        )
    quotation.status = QuotationStatus.SENT
    db.commit()
    db.refresh(quotation)
    return quotation


@router.post("/{quotation_id}/approve", response_model=QuotationRead)
def approve_quotation(
    quotation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    quotation = _get_owned_quotation(quotation_id, current_user, db)
    if not can_approve(quotation.status):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve a quotation in status '{quotation.status.value}'",
        )
    quotation.status = QuotationStatus.APPROVED
    quotation.approved_by_id = current_user.id
    quotation.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(quotation)
    return quotation


@router.post("/{quotation_id}/reject", response_model=QuotationRead)
def reject_quotation(
    quotation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    quotation = _get_owned_quotation(quotation_id, current_user, db)
    if not can_reject(quotation.status):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject a quotation in status '{quotation.status.value}'",
        )
    quotation.status = QuotationStatus.REJECTED
    db.commit()
    db.refresh(quotation)
    return quotation
