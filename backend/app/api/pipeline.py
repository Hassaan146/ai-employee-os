from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.pipeline_rules import is_valid_transition
from app.models.sales_pipeline import SalesPipeline
from app.models.activity_timeline import ActivityTimeline
from app.schemas.pipeline import PipelineCreate, PipelineUpdate, PipelineResponse

router = APIRouter(prefix="/api/v1/crm/pipeline", tags=["Pipeline"])


@router.post("/", response_model=PipelineResponse)
def create_pipeline_entry(pipeline: PipelineCreate, db: Session = Depends(get_db)):
    new_entry = SalesPipeline(**pipeline.model_dump())
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry


@router.get("/", response_model=list[PipelineResponse])
def get_pipeline_entries(skip: int = 0, limit: int = 20, stage: str | None = None, db: Session = Depends(get_db)):
    query = db.query(SalesPipeline)
    if stage:
        query = query.filter(SalesPipeline.stage == stage)
    return query.offset(skip).limit(limit).all()


@router.get("/{pipeline_id}", response_model=PipelineResponse)
def get_pipeline_entry(pipeline_id: int, db: Session = Depends(get_db)):
    entry = db.query(SalesPipeline).filter(SalesPipeline.id == pipeline_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Pipeline entry not found")
    return entry


@router.put("/{pipeline_id}", response_model=PipelineResponse)
def update_pipeline_entry(pipeline_id: int, updates: PipelineUpdate, db: Session = Depends(get_db)):
    entry = db.query(SalesPipeline).filter(SalesPipeline.id == pipeline_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Pipeline entry not found")

    update_data = updates.model_dump(exclude_unset=True)

    # Agar stage change ho rahi hai, toh pehle validate karo
    if "stage" in update_data and update_data["stage"] != entry.stage:
        new_stage = update_data["stage"]

        if not is_valid_transition(entry.stage, new_stage):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid stage transition: '{entry.stage}' -> '{new_stage}'"
            )

        # previous stage save karo
        entry.previous_stage = entry.stage

        # Activity log automatically create karo transition ke liye
        activity = ActivityTimeline(
            company_id=entry.company_id,
            lead_id=entry.lead_id,
            activity_type="stage_change",
            description=f"Pipeline stage changed from '{entry.stage}' to '{new_stage}'",
            performed_by=update_data.get("changed_by"),
        )
        db.add(activity)

    for field, value in update_data.items():
        setattr(entry, field, value)

    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{pipeline_id}")
def delete_pipeline_entry(pipeline_id: int, db: Session = Depends(get_db)):
    entry = db.query(SalesPipeline).filter(SalesPipeline.id == pipeline_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Pipeline entry not found")

    db.delete(entry)
    db.commit()
    return {"message": "Pipeline entry deleted successfully"}