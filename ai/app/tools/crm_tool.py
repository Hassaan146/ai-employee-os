"""
CRM Tool
--------
search_crm(customer_name) -> dict

Currently backed by mock/fake data so agents can be built and tested
immediately, without waiting on a real CRM integration. Swap the
MOCK_CUSTOMERS lookup for a real database/API call later — the
function signature stays the same, so nothing else needs to change.
"""

MOCK_CUSTOMERS = {
    "john": {
        "name": "John Smith",
        "company": "Smith Traders",
        "email": "john@smithtraders.com",
        "open_deals": ["25 laptops - pending quotation"],
        "last_contact": "2026-07-20",
    },
    "sara": {
        "name": "Sara Khan",
        "company": "Khan Textiles",
        "email": "sara@khantextiles.com",
        "open_deals": [],
        "last_contact": "2026-07-15",
    },
}

# OpenAI-style function/tool schema — this is what gets passed to the
# LLM so it knows this tool exists and how to call it.
CRM_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "search_crm",
        "description": "Look up a customer's record in the CRM by name.",
        "parameters": {
            "type": "object",
            "properties": {
                "customer_name": {
                    "type": "string",
                    "description": "The customer's first name or full name to search for.",
                }
            },
            "required": ["customer_name"],
        },
    },
}


def search_crm(customer_name: str) -> dict:
    """
    Look up a customer by name (case-insensitive partial match).

    Returns a dict with customer info, or a "not_found" flag if no
    match exists.
    """
    key = customer_name.strip().lower()
    for name_key, record in MOCK_CUSTOMERS.items():
        if key in name_key or name_key in key:
            return record
    return {"found": False, "message": f"No customer found matching '{customer_name}'"}
