from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    ip_address: Optional[str] = None
    rincian_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True
