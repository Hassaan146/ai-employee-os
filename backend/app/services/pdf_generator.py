"""ReportLab PDF generation (Member 1, Day 4).

Builds a branded invoice PDF from the stored Invoice + line items. Totals are
read straight from the DB row (never recomputed here).
"""
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def generate_invoice_pdf(invoice, customer=None, company_name: str = "") -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm,
                            topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Title"], fontSize=18, textColor=colors.HexColor("#1f4e79"))
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=colors.HexColor("#333333"))

    elements = []

    # Branding header
    elements.append(Paragraph(company_name or "AI Employee OS", h1))
    elements.append(Paragraph(f'<b>Invoice # {invoice.invoice_number}</b>', h2))
    elements.append(Paragraph(
        f'Status: <b>{invoice.status.value if hasattr(invoice.status, "value") else invoice.status}</b><br/>'
        f'Currency: {invoice.currency}&nbsp;&nbsp;Issue: {invoice.issue_date.date() if invoice.issue_date else "-"}'
        f'&nbsp;&nbsp;Due: {invoice.due_date.date() if invoice.due_date else "-"}'))
    if customer:
        elements.append(Paragraph(f'Customer: <b>{customer.name}</b>', styles["Normal"]))
    elements.append(Spacer(1, 6 * mm))

    # Line items
    data = [["Description", "Qty", "Unit Price", "Line Total"]]
    for li in (invoice.line_items or []):
        data.append([li.description, str(li.quantity), f"{li.unit_price:.2f}", f"{li.line_total:.2f}"])
    table = Table(data, colWidths=[90 * mm, 20 * mm, 30 * mm, 30 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a4e79")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#eef3f8")]),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 6 * mm))

    # Totals
    totals = [
        ("Subtotal", invoice.subtotal),
        ("Discount", invoice.discount_amount),
        ("Tax", invoice.tax_amount),
        ("Total Due", invoice.total_amount),
        ("Paid", invoice.amount_paid),
        ("Balance", float(invoice.total_amount or 0) - float(invoice.amount_paid or 0)),
    ]
    for label, value in totals:
        elements.append(Paragraph(f"{label}: <b>{value:.2f} {invoice.currency}</b>",
                                  ParagraphStyle("t", parent=styles["Normal"], alignment=2)))

    if invoice.notes:
        elements.append(Spacer(1, 4 * mm))
        elements.append(Paragraph(f"Notes: {invoice.notes}", styles["Italic"]))

    doc.build(elements)
    buf.seek(0)
    return buf.read()