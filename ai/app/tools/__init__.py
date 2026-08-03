"""
TOOLS registry — the interface agents (and Member 1) use to look up
and call any tool by name.
"""

from .crm_tool import search_crm, CRM_TOOL_SCHEMA
from .email_tool import send_email, EMAIL_TOOL_SCHEMA
from .calendar_tool import create_meeting, CALENDAR_TOOL_SCHEMA
from .invoice_tool import generate_invoice, INVOICE_TOOL_SCHEMA
from .quotation_tool import generate_quotation, QUOTATION_TOOL_SCHEMA

# Maps tool name -> the actual Python function to call
TOOLS = {
    "search_crm": search_crm,
    "send_email": send_email,
    "create_meeting": create_meeting,
    "generate_invoice": generate_invoice,
    "generate_quotation": generate_quotation,
}

# Maps tool name -> its OpenAI-style schema (for function calling)
TOOL_SCHEMAS = {
    "search_crm": CRM_TOOL_SCHEMA,
    "send_email": EMAIL_TOOL_SCHEMA,
    "create_meeting": CALENDAR_TOOL_SCHEMA,
    "generate_invoice": INVOICE_TOOL_SCHEMA,
    "generate_quotation": QUOTATION_TOOL_SCHEMA,
}

__all__ = [
    "TOOLS",
    "TOOL_SCHEMAS",
    "search_crm",
    "send_email",
    "create_meeting",
    "generate_invoice",
    "generate_quotation",
]
