"""
TOOLS registry — the interface Member 1 (and other agents) can use to
look up and call any tool by name.
"""

from .crm_tool import search_crm, CRM_TOOL_SCHEMA

# Maps tool name -> the actual Python function to call
TOOLS = {
    "search_crm": search_crm,
}

# Maps tool name -> its OpenAI-style schema (for function calling)
TOOL_SCHEMAS = {
    "search_crm": CRM_TOOL_SCHEMA,
}

__all__ = ["TOOLS", "TOOL_SCHEMAS", "search_crm"]
