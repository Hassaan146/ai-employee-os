"""Meeting Assistant routes (Member 3, Day 4).

Tenant-isolated: company_id comes from the authenticated user's JWT.
Covers transcript storage, speaker logs, and action items.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.meeting import Meeting, MeetingActionItem, MeetingSpeakerLog, MeetingStatus
from app.models.user import User
from app.schemas.meeting import (
    MeetingActionItemCreate,
    MeetingActionItemRead,
    MeetingActionItemUpdate,
    MeetingCreate,
    MeetingRead,
    MeetingSpeakerLogCreate,
    MeetingSpeakerLogRead,
    MeetingUpdate,
)

router = APIRouter(prefix="/api/v1/meetings", tags=["Meetings"])


def _get_owned_meeting(mid: uuid.UUID, current_user: User, db: Session) -> Meeting:
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == mid, Meeting.company_id == current_user.company_id)
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.post("", response_model=MeetingRead, status_code=status.HTTP_201_CREATED)
def create_meeting(
    meeting_in: MeetingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = meeting_in.model_dump()
    meeting = Meeting(
        company_id=current_user.company_id,
        organized_by_id=current_user.id,
        **data,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.get("", response_model=list[MeetingRead])
def list_meetings(
    current_user: User = Depends(get_current_user),
    status_filter: Optional[MeetingStatus] = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    query = db.query(Meeting).filter(Meeting.company_id == current_user.company_id)
    if status_filter:
        query = query.filter(Meeting.status == status_filter)
    return query.order_by(Meeting.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{meeting_id}", response_model=MeetingRead)
def get_meeting(
    meeting_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_owned_meeting(meeting_id, current_user, db)


@router.patch("/{meeting_id}", response_model=MeetingRead)
def update_meeting(
    meeting_id: uuid.UUID,
    meeting_in: MeetingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = _get_owned_meeting(meeting_id, current_user, db)
    for field, value in meeting_in.model_dump(exclude_unset=True).items():
        setattr(meeting, field, value)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.post("/{meeting_id}/speakers", response_model=MeetingSpeakerLogRead, status_code=status.HTTP_201_CREATED)
def add_speaker_log(
    meeting_id: uuid.UUID,
    log_in: MeetingSpeakerLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = _get_owned_meeting(meeting_id, current_user, db)
    log = MeetingSpeakerLog(meeting_id=meeting.id, **log_in.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.post("/{meeting_id}/action-items", response_model=MeetingActionItemRead, status_code=status.HTTP_201_CREATED)
def add_action_item(
    meeting_id: uuid.UUID,
    item_in: MeetingActionItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = _get_owned_meeting(meeting_id, current_user, db)
    item = MeetingActionItem(meeting_id=meeting.id, **item_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{meeting_id}/action-items", response_model=list[MeetingActionItemRead])
def list_action_items(
    meeting_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = _get_owned_meeting(meeting_id, current_user, db)
    return (
        db.query(MeetingActionItem)
        .filter(MeetingActionItem.meeting_id == meeting.id)
        .order_by(MeetingActionItem.id)
        .all()
    )


@router.patch("/{meeting_id}/action-items/{item_id}", response_model=MeetingActionItemRead)
def update_action_item(
    meeting_id: uuid.UUID,
    item_id: uuid.UUID,
    item_in: MeetingActionItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = _get_owned_meeting(meeting_id, current_user, db)
    item = (
        db.query(MeetingActionItem)
        .filter(MeetingActionItem.id == item_id, MeetingActionItem.meeting_id == meeting.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")
    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item
