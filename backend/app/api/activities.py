# app/api/activities.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.activity_timeline import ActivityTimeline
from app.models.lead import Lead
from app.schemas.activity import ActivityCreate, ActivityResponse

router = APIRouter(prefix="/api/v1/crm", tags=["Activity History"])


@router.post("/activities", response_model=ActivityResponse)
def create_activity(activity: ActivityCreate, db: Session = Depends(get_db)):
    new_activity = ActivityTimeline(**activity.model_dump())
    db.add(new_activity)
    db.commit()
    db.refresh(new_activity)
    return new_activity


@router.get("/leads/{lead_id}/activities", response_model=list[ActivityResponse])
def get_lead_activities(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    activities = (
        db.query(ActivityTimeline)
        .filter(ActivityTimeline.lead_id == lead_id)
        .order_by(ActivityTimeline.created_at.desc())
        .all()
    )
    return activities