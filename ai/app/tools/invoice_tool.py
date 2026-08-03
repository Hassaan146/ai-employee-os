"""
Invoice Tool
-------------
generate_invoice(customer_name, items, total_amount) -> dict

Currently mocked — generates a fake invoice record instead of a real
PDF/accounting-system entry. Swap the inside of the function later —
the signature stays the same.
"""

import uuid
from datetime import datetime

INVOICE_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "generate_invoice",
        "description": "Generate an invoice for a customer.",
        "parameters": {
            "type": "object",
            "properties": {
                "customer_name": {
                    "type": "string",
                    "description": "Name of the customer being invoiced.",
                },
                "items": {
                    "type": "string",
                    "description": "Description of items/services being billed, e.g. '25 laptops'.",
                },
                "total_amount": {
                    "type": "string",
                    "description": "Total invoice amount as a number, e.g. '12500'.",
                },
            },
            "required": ["customer_name", "items", "total_amount"],
        },
    },
}

GENERATED_INVOICES_LOG = []


def generate_invoice(customer_name: str, items: str, total_amount: float) -> dict:
    total_amount = float(total_amount)
    """
    Mocked invoice generation. Creates a fake invoice record with an
    id and due date instead of a real PDF/accounting entry.

    Returns a dict with the invoice details.
    """
    invoice_id = f"INV-{uuid.uuid4().hex[:8].upper()}"
    record = {
        "invoice_id": invoice_id,
        "customer_name": customer_name,
        "items": items,
        "total_amount": total_amount,
        "issued_date": datetime.utcnow().strftime("%Y-%m-%d"),
        "status": "pending",
    }
    GENERATED_INVOICES_LOG.append(record)

    print(f"[MOCK INVOICE] {invoice_id} for {customer_name}: {items} — ${total_amount}")

    return {
        "success": True,
        "invoice_id": invoice_id,
        "message": f"Invoice {invoice_id} generated for {customer_name}: {items}, total ${total_amount}.",
    }
