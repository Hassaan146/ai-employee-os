import uuid
from typing import Optional, Union

from datetime import datetime
from pydantic import BaseModel, field_serializer


class AuditLogResponse(BaseModel):
    id: Union[str, uuid.UUID]
    company_id: Union[str, uuid.UUID]
    actor_type: str
    actor_id: Optional[Union[str, uuid.UUID]] = None
    actor_name: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[dict] = None
    status: str
    ip_address: Optional[str] = None
    created_at: datetime

    @field_serializer("id", "company_id", "actor_id", mode="plain")
    def serialize_uuid_fields(self, v):
        return str(v) if v is not None else None

    class Config:
        from_attributes = True
