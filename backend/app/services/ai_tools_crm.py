# app/services/ai_tools_crm.py
"""
AI-callable tool functions for CRM and Task management.
These functions are designed to be invoked by the central AI Execution Router
(/api/v1/ai/execute) when the AI determines a CRM/Task action is needed.

Each tool follows the pattern:
    - Accepts a dict of parameters (from AI intent parsing)
    - Accepts db session and company_id (tenant context)
    - Returns a dict result (success/failure + data)
"""

from sqlalchemy.orm import Session
from app.models.customer import Customer
from app.models.lead import Lead
from app.models.task import Task


def create_customer_tool(params: dict, db: Session, company_id: str) -> dict:
    """
    AI Tool: create_customer
    Expected params: name, email, phone, company_name, address
    """
    try:
        new_customer = Customer(
            company_id=company_id,
            name=params.get("name"),
            email=params.get("email"),
            phone=params.get("phone"),
            company_name=params.get("company_name"),
            address=params.get("address"),
            status="active",
        )
        db.add(new_customer)
        db.commit()
        db.refresh(new_customer)

        return {
            "success": True,
            "tool": "create_customer",
            "result": {
                "id": str(new_customer.id),
                "name": new_customer.name,
                "email": new_customer.email,
            },
        }
    except Exception as e:
        db.rollback()
        return {"success": False, "tool": "create_customer", "error": str(e)}


def update_lead_tool(params: dict, db: Session, company_id: str) -> dict:
    """
    AI Tool: update_lead
    Expected params: lead_id, stage (optional), value (optional), notes (optional)
    """
    try:
        lead_id = params.get("lead_id")
        lead = db.query(Lead).filter(
            Lead.id == lead_id, Lead.company_id == company_id
        ).first()

        if not lead:
            return {"success": False, "tool": "update_lead", "error": "Lead not found"}

        if "stage" in params:
            lead.stage = params["stage"]
        if "value" in params:
            lead.value = params["value"]

        db.commit()
        db.refresh(lead)

        return {
            "success": True,
            "tool": "update_lead",
            "result": {"id": str(lead.id), "stage": lead.stage, "value": lead.value},
        }
    except Exception as e:
        db.rollback()
        return {"success": False, "tool": "update_lead", "error": str(e)}


def create_task_tool(params: dict, db: Session, company_id: str, created_by_id: str) -> dict:
    """
    AI Tool: create_task
    Expected params: title, description (optional), due_date (optional), priority (optional), assigned_to_id (optional)
    """
    try:
        new_task = Task(
            company_id=company_id,
            created_by_id=created_by_id,
            title=params.get("title"),
            description=params.get("description"),
            due_date=params.get("due_date"),
            priority=params.get("priority", "medium"),
            status="pending",
            assigned_to_id=params.get("assigned_to_id"),
        )
        db.add(new_task)
        db.commit()
        db.refresh(new_task)

        return {
            "success": True,
            "tool": "create_task",
            "result": {"id": str(new_task.id), "title": new_task.title},
        }
    except Exception as e:
        db.rollback()
        return {"success": False, "tool": "create_task", "error": str(e)}


# Tool registry — Router isse use karega function ko naam se dhoondne ke liye
CRM_TOOL_REGISTRY = {
    "create_customer": create_customer_tool,
    "update_lead": update_lead_tool,
    "create_task": create_task_tool,
}