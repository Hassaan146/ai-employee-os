"""Business analytics endpoints (Member 3, Day 5). Tenant-scoped."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.reports import PERIODS, productivity_report, revenue_report, sales_report

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])


def _valid_period(period: str) -> str:
    return period if period in PERIODS else "all"


@router.get("/sales")
def sales(
    period: str = Query("all"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return sales_report(db, current_user.company_id, _valid_period(period))


@router.get("/revenue")
def revenue(
    period: str = Query("all"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return revenue_report(db, current_user.company_id, _valid_period(period))


@router.get("/expense")
def expense(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    raise HTTPException(
        status_code=501,
        detail="Expense analytics requires an Expense model, which is not implemented yet",
    )


@router.get("/productivity")
def productivity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return productivity_report(db, current_user.company_id)