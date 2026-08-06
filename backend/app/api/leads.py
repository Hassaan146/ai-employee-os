import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.lead import Lead
from app.models.user import User
from app.schemas.lead import LeadCreate, LeadUpdate, LeadResponse

router = APIRouter(prefix="/api/v1/crm/leads", tags=["Leads"])


@router.post("/", response_model=LeadResponse)
def create_lead(
    lead: LeadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = lead.model_dump()
    data["company_id"] = current_user.company_id
    new_lead = Lead(**data)
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    return new_lead


@router.get("/", response_model=list[LeadResponse])
def get_leads(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    stage: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get leads with pagination, filtering, and search."""
    query = db.query(Lead).filter(Lead.company_id == current_user.company_id)
    
    # Filter by stage
    if stage:
        query = query.filter(Lead.stage == stage)
    
    # Filter by source
    if source:
        query = query.filter(Lead.source == source)
    
    # Full-text search
    if search:
        query = query.filter(
            (Lead.name.ilike(f"%{search}%")) |
            (Lead.email.ilike(f"%{search}%"))
        )
    
    return query.order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(
    lead_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        valid_lead_id = uuid.UUID(str(lead_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead = (
        db.query(Lead)
        .filter(Lead.id == valid_lead_id, Lead.company_id == current_user.company_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: str,
    updates: LeadUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        valid_lead_id = uuid.UUID(str(lead_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead = (
        db.query(Lead)
        .filter(Lead.id == valid_lead_id, Lead.company_id == current_user.company_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/{lead_id}")
def delete_lead(
    lead_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        valid_lead_id = uuid.UUID(str(lead_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead = (
        db.query(Lead)
        .filter(Lead.id == valid_lead_id, Lead.company_id == current_user.company_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    db.delete(lead)
    db.commit()
    return {"message": "Lead deleted successfully"}