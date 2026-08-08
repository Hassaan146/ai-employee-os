# app/api/ai_tools_test.py
"""
Temporary test endpoint to verify AI CRM/Task tools independently,
until Member 1's central AI Execution Router (/api/v1/ai/execute) is ready.
Once that router exists, these tools will be registered there instead.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.ai_tools_crm import CRM_TOOL_REGISTRY
from app.services.ai_tools_finance import FINANCE_TOOL_REGISTRY

# Combined registry: everything the central AI Router will expose once ready.
ALL_TOOL_REGISTRY = {**CRM_TOOL_REGISTRY, **FINANCE_TOOL_REGISTRY}

# Tools that need the calling user's id (creator context).
NEEDS_USER_ID = {"create_task", "generate_quotation", "create_invoice", "send_email"}

router = APIRouter(prefix="/api/v1/ai-tools-test", tags=["AI Tools (Test)"])


@router.post("/{tool_name}")
def run_tool(
    tool_name: str,
    params: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tool_fn = ALL_TOOL_REGISTRY.get(tool_name)
    if not tool_fn:
        return {"success": False, "error": f"Unknown tool: {tool_name}"}

    if tool_name in NEEDS_USER_ID:
        return tool_fn(params, db, str(current_user.company_id), str(current_user.id))

    return tool_fn(params, db, str(current_user.company_id))
  