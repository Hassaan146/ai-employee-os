import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.activity_timeline import ActivityTimeline
from app.models.lead import Lead
from app.models.customer import Customer
from app.models.user import User
from app.schemas.activity import ActivityCreate, ActivityResponse

router = APIRouter(prefix="/api/v1/crm", tags=["Activity History"])


@router.post("/activities", response_model=ActivityResponse)
def create_activity(
    activity: ActivityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = activity.model_dump()
    data["company_id"] = str(current_user.company_id)
    if data.get("performed_by") is None:
        data["performed_by"] = str(current_user.id)

    # Validate Customer if provided
    if data.get("customer_id"):
        try:
            valid_cust_id = str(uuid.UUID(str(data["customer_id"])))
        except ValueError:
            raise HTTPException(status_code=404, detail="Customer not found in your company")

        customer = db.query(Customer).filter(
            Customer.id == valid_cust_id,
            Customer.company_id == str(current_user.company_id)
        ).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found in your company")

    # Validate Lead if provided
    if data.get("lead_id"):
        try:
            valid_lead_id = str(uuid.UUID(str(data["lead_id"])))
        except ValueError:
            raise HTTPException(status_code=404, detail="Lead not found in your company")

        lead = db.query(Lead).filter(
            Lead.id == valid_lead_id,
            Lead.company_id == str(current_user.company_id)
        ).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found in your company")

    new_activity = ActivityTimeline(**data)
    db.add(new_activity)
    db.commit()
    db.refresh(new_activity)
    return new_activity


@router.get("/leads/{lead_id}/activities", response_model=list[ActivityResponse])
def get_lead_activities(
    lead_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        valid_lead_id = str(uuid.UUID(str(lead_id)))
    except ValueError:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead = (
        db.query(Lead)
        .filter(Lead.id == valid_lead_id, Lead.company_id == str(current_user.company_id))
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    activities = (
        db.query(ActivityTimeline)
        .filter(
            ActivityTimeline.lead_id == valid_lead_id,
            ActivityTimeline.company_id == str(current_user.company_id),
        )
        .order_by(ActivityTimeline.created_at.desc())
        .all()
    )
    return activities
