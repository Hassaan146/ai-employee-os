from pydantic import BaseModel
from typing import Optional, Dict, Any

class AIExecuteRequest(BaseModel):
    tool_name: str
    parameters: Dict[str, Any] = {}
    ai_employee_id: Optional[str] = None

class AIExecuteResponse(BaseModel):
    success: bool
    tool: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
