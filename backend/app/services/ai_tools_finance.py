# app/services/ai_tools_finance.py
"""AI-callable Finance & Email tools (Member 3, Day 8).

Same contract as the CRM tools: each takes (params, db, company_id[, user_id])
and returns {"success": bool, "tool": str, "result"/"error"}. These are meant to
be invoked by the central AI Execution Router (/api/v1/ai/execute).
"""
import uuid

from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceLineItem, InvoiceStatus
from app.models.quotation import Quotation, QuotationLineItem, QuotationStatus
from app.services.calculations import compute_line_total, compute_totals
from app.services.email_service import send_email_smtp


def _next_quotation_number(db: Session) -> str:
    count = db.query(Quotation).count() + 1
    return f"QT-{uuid.uuid4().hex[:8]}"


def _next_invoice_number(db: Session) -> str:
    count = db.query(Invoice).count() + 1
    return f"INV-{uuid.uuid4().hex[:8]}"


def generate_quotation_tool(params: dict, db: Session, company_id: str, user_id: str = None) -> dict:
    """AI Tool: generate_quotation
    Expected params: customer_id, line_items[{description,quantity,unit_price}],
                     tax_percent, discount_percent, currency, notes
    """
    try:
        customer_id = params.get("customer_id")
        if not customer_id:
            return {"success": False, "tool": "generate_quotation", "error": "customer_id is required"}

        customer = db.query(Customer).filter(Customer.id == customer_id, Customer.company_id == company_id).first()
        if not customer:
            return {"success": False, "tool": "generate_quotation", "error": "Customer not found in company"}

        line_items = params.get("line_items") or []
        if not line_items:
            return {"success": False, "tool": "generate_quotation", "error": "line_items is required"}

        line_totals = [compute_line_total(li["quantity"], li["unit_price"]) for li in line_items]
        totals = compute_totals(line_totals, params.get("tax_percent", 0), params.get("discount_percent", 0))

        quotation = Quotation(
            company_id=company_id,
            created_by_id=user_id,
            customer_id=customer.id,
            quotation_number=params.get("quotation_number") or _next_quotation_number(db),
            currency=params.get("currency", "USD"),
            tax_percent=params.get("tax_percent", 0),
            discount_percent=params.get("discount_percent", 0),
            valid_until=params.get("valid_until"),
            notes=params.get("notes"),
            status=QuotationStatus.DRAFT,
            subtotal=totals["subtotal"],
            tax_amount=totals["tax_amount"],
            discount_amount=totals["discount_amount"],
            total_amount=totals["total_amount"],
        )
        for li in line_items:
            quotation.line_items.append(
                QuotationLineItem(
                    description=li["description"],
                    quantity=li["quantity"],
                    unit_price=li["unit_price"],
                    line_total=compute_line_total(li["quantity"], li["unit_price"]),
                )
            )
        db.add(quotation)
        db.commit()
        db.refresh(quotation)

        return {
            "success": True,
            "tool": "generate_quotation",
            "result": {
                "id": str(quotation.id),
                "quotation_number": quotation.quotation_number,
                "status": quotation.status.value,
                "total_amount": float(quotation.total_amount),
            },
        }
    except Exception as e:
        db.rollback()
        return {"success": False, "tool": "generate_quotation", "error": str(e)}


def create_invoice_tool(params: dict, db: Session, company_id: str, user_id: str = None) -> dict:
    """AI Tool: create_invoice
    Expected params: customer_id, line_items[{description,quantity,unit_price}],
                     tax_percent, discount_percent, currency, due_date, notes
    """
    try:
        customer_id = params.get("customer_id")
        if not customer_id:
            return {"success": False, "tool": "create_invoice", "error": "customer_id is required"}

        customer = db.query(Customer).filter(Customer.id == customer_id, Customer.company_id == company_id).first()
        if not customer:
            return {"success": False, "tool": "create_invoice", "error": "Customer not found in company"}

        line_items = params.get("line_items") or []
        if not line_items:
            return {"success": False, "tool": "create_invoice", "error": "line_items is required"}

        line_totals = [compute_line_total(li["quantity"], li["unit_price"]) for li in line_items]
        totals = compute_totals(line_totals, params.get("tax_percent", 0), params.get("discount_percent", 0))

        invoice = Invoice(
            company_id=company_id,
            created_by_id=user_id,
            customer_id=customer.id,
            invoice_number=params.get("invoice_number") or _next_invoice_number(db),
            currency=params.get("currency", "USD"),
            status=InvoiceStatus.DRAFT,
            subtotal=totals["subtotal"],
            tax_percent=params.get("tax_percent", 0),
            tax_amount=totals["tax_amount"],
            discount_percent=params.get("discount_percent", 0),
            discount_amount=totals["discount_amount"],
            total_amount=totals["total_amount"],
            amount_paid=0,
            due_date=params.get("due_date"),
            notes=params.get("notes"),
        )
        for li in line_items:
            invoice.line_items.append(
                InvoiceLineItem(
                    description=li["description"],
                    quantity=li["quantity"],
                    unit_price=li["unit_price"],
                    line_total=compute_line_total(li["quantity"], li["unit_price"]),
                )
            )
        db.add(invoice)
        db.commit()
        db.refresh(invoice)

        return {
            "success": True,
            "tool": "create_invoice",
            "result": {
                "id": str(invoice.id),
                "invoice_number": invoice.invoice_number,
                "status": invoice.status.value,
                "total_amount": float(invoice.total_amount),
            },
        }
    except Exception as e:
        db.rollback()
        return {"success": False, "tool": "create_invoice", "error": str(e)}


def send_email_tool(params: dict, db: Session, company_id: str, user_id: str = None) -> dict:
    """AI Tool: send_email
    Expected params: to_email, subject, body_html, pdf_bytes(optional), pdf_filename(optional)
    """
    try:
        to_email = params.get("to_email")
        if not to_email:
            return {"success": False, "tool": "send_email", "error": "to_email is required"}

        res = send_email_smtp(
            to_email=to_email,
            subject=params.get("subject", "No Subject"),
            body_html=params.get("body_html", ""),
            pdf_bytes=params.get("pdf_bytes"),
            pdf_filename=params.get("pdf_filename"),
        )
        return {"success": res["status"] == "success", "tool": "send_email", "result": res}
    except Exception as e:
        return {"success": False, "tool": "send_email", "error": str(e)}


FINANCE_TOOL_REGISTRY = {
    "generate_quotation": generate_quotation_tool,
    "create_invoice": create_invoice_tool,
    "send_email": send_email_tool,
}
