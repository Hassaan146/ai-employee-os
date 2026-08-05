import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.pipeline_rules import VALID_STAGES
from app.models.lead import Lead
from app.models.customer import Customer
from app.models.user import User
from app.schemas.lead import LeadCreate, LeadUpdate, LeadResponse

router = APIRouter(prefix="/api/v1/crm/leads", tags=["Leads"])


@router.post("/", response_model=LeadResponse)
def create_lead(
    lead: LeadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if lead.stage not in VALID_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage: '{lead.stage}'")

    if lead.customer_id:
        try:
            valid_cust_id = uuid.UUID(str(lead.customer_id))
        except ValueError:
            raise HTTPException(status_code=404, detail="Customer not found in this company")
            
        customer = db.query(Customer).filter(
            Customer.id == valid_cust_id,
            Customer.company_id == current_user.company_id
        ).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found in this company")

    data = lead.model_dump()
    data["company_id"] = current_user.company_id
    new_lead = Lead(**data)
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    return new_lead


@router.get("/", response_model=list[LeadResponse])
def get_leads(
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20,
    stage: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Lead).filter(Lead.company_id == current_user.company_id)
    if stage:
        query = query.filter(Lead.stage == stage)
    return query.offset(skip).limit(limit).all()


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

    if updates.stage is not None and updates.stage not in VALID_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage: '{updates.stage}'")

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
