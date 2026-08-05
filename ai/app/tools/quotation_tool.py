"""
Quotation Tool
---------------
generate_quotation(customer_name, items, price) -> dict

Currently mocked — generates a fake quotation record instead of a
real branded PDF. Swap the inside of the function later — the
signature stays the same.
"""

import uuid
from datetime import datetime

QUOTATION_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "generate_quotation",
        "description": "Generate a price quotation for a customer.",
        "parameters": {
            "type": "object",
            "properties": {
                "customer_name": {
                    "type": "string",
                    "description": "Name of the customer requesting the quotation.",
                },
                "items": {
                    "type": "string",
                    "description": "Description of items/services being quoted, e.g. '25 laptops'.",
                },
                "price": {
                    "type": "string",
                    "description": "Quoted total price as a number, e.g. '12500'.",
                },
            },
            "required": ["customer_name", "items", "price"],
        },
    },
}

GENERATED_QUOTATIONS_LOG = []


def generate_quotation(customer_name: str, items: str, price: float) -> dict:
    price = float(price)
    """
    Mocked quotation generation. Creates a fake quotation record with
    an id instead of a real branded PDF.

    Returns a dict with the quotation details.
    """
    quote_id = f"QUO-{uuid.uuid4().hex[:8].upper()}"
    record = {
        "quote_id": quote_id,
        "customer_name": customer_name,
        "items": items,
        "price": price,
        "issued_date": datetime.utcnow().strftime("%Y-%m-%d"),
        "status": "pending_approval",
    }
    GENERATED_QUOTATIONS_LOG.append(record)

    print(f"[MOCK QUOTATION] {quote_id} for {customer_name}: {items} — ${price}")

    return {
        "success": True,
        "quote_id": quote_id,
        "message": f"Quotation {quote_id} generated for {customer_name}: {items}, price ${price}.",
    }
