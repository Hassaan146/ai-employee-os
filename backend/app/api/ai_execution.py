import uuid
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db, to_uuid
from app.core.deps import get_current_user
from app.core.ws_manager import ws_manager
from app.models.user import User
from app.schemas.ai_execution import AIExecuteRequest, AIExecuteResponse
from app.services.ai_tools_crm import CRM_TOOL_REGISTRY
from app.services.ai_tools_finance import FINANCE_TOOL_REGISTRY
from app.services.audit_logger import log_audit, AuditActorType, AuditStatus

router = APIRouter(prefix="/ai", tags=["Central AI Execution Router"])

# Combine all AI tool registries into unified master registry
MASTER_TOOL_REGISTRY = {**CRM_TOOL_REGISTRY, **FINANCE_TOOL_REGISTRY}

@router.post("/execute", response_model=AIExecuteResponse)
async def execute_ai_action(
    req: AIExecuteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Central AI Action Execution Router (/api/v1/ai/execute).
    Receives AI intent commands, executes tool functions across CRM & Finance modules,
    logs actions in Enterprise Audit Trails, and broadcasts real-time updates via WebSockets.
    """
    company_id = str(current_user.company_id)
    user_id = str(current_user.id)
    tool_name = req.tool_name

    if tool_name not in MASTER_TOOL_REGISTRY:
        
        log_audit(
            db=db,
            company_id=company_id,
            action=f"ai_tool:{tool_name}",
            resource_type="ai_tool",
            actor_id=user_id,
            actor_name=current_user.full_name or current_user.email,
            actor_type=AuditActorType.AI,
            status=AuditStatus.FAILURE,
            details={"parameters": req.parameters}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown AI tool '{tool_name}'. Available tools: {list(MASTER_TOOL_REGISTRY.keys())}"
        )

    # Broadcast AI execution started via WebSockets
    await ws_manager.broadcast_to_company(company_id, {
        "event": "ai_execution_started",
        "tool": tool_name,
        "parameters": req.parameters,
        "ai_employee_id": req.ai_employee_id
    })

    tool_fn = MASTER_TOOL_REGISTRY[tool_name]

    # Execute tool function safely
    try:
        import inspect
        sig = inspect.signature(tool_fn)
        if "created_by_id" in sig.parameters:
            res = tool_fn(params=req.parameters, db=db, company_id=company_id, created_by_id=user_id)
        elif "user_id" in sig.parameters:
            res = tool_fn(params=req.parameters, db=db, company_id=company_id, user_id=user_id)
        else:
            res = tool_fn(params=req.parameters, db=db, company_id=company_id)
    except Exception as e:
        res = {"success": False, "tool": tool_name, "error": str(e)}

    # Audit Action
    result_data = res.get("result") if res.get("success") else None
    resource_id = result_data.get("id") if isinstance(result_data, dict) else None

    log_audit(
        db=db,
        company_id=company_id,
        action=f"ai_tool:{tool_name}",
        resource_type="ai_tool",
        resource_id=resource_id,
        actor_id=user_id,
        actor_name=current_user.full_name or current_user.email,
        actor_type=AuditActorType.AI,
        status=AuditStatus.SUCCESS if res.get("success") else AuditStatus.FAILURE,
        details={"parameters": req.parameters, "result": result_data}
    )

    # Broadcast AI execution completed via WebSockets
    await ws_manager.broadcast_to_company(company_id, {
        "event": "ai_execution_completed",
        "tool": tool_name,
        "success": res.get("success", False),
        "result": result_data,
        "error": res.get("error")
    })

    return AIExecuteResponse(
        success=res.get("success", False),
        tool=tool_name,
        result=res.get("result"),
        error=res.get("error")
    )

@router.get("/tools")
def list_ai_tools(current_user: User = Depends(get_current_user)):
    """List all available AI execution tools."""
    return {
        "tools": list(MASTER_TOOL_REGISTRY.keys()),
        "count": len(MASTER_TOOL_REGISTRY)
    }
