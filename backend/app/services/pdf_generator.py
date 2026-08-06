"""ReportLab PDF generation.

Builds branded Invoice and Quotation PDFs from database models.
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
        f'Currency: {invoice.currency}&nbsp;&nbsp;Issue: {invoice.issue_date.date() if hasattr(invoice.issue_date, "date") else "-"}'
        f'&nbsp;&nbsp;Due: {invoice.due_date.date() if hasattr(invoice.due_date, "date") and invoice.due_date else "-"}'))
    if customer:
        elements.append(Paragraph(f'Customer: <b>{customer.name}</b>', styles["Normal"]))
    elements.append(Spacer(1, 6 * mm))

    # Line items
    data = [["Description", "Qty", "Unit Price", "Line Total"]]
    for li in (invoice.line_items or []):
        data.append([li.description, str(li.quantity), f"{float(li.unit_price):.2f}", f"{float(li.line_total):.2f}"])
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
        ("Subtotal", float(invoice.subtotal or 0)),
        ("Discount", float(invoice.discount_amount or 0)),
        ("Tax", float(invoice.tax_amount or 0)),
        ("Total Due", float(invoice.total_amount or 0)),
        ("Paid", float(invoice.amount_paid or 0)),
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


def generate_quotation_pdf(quotation, customer=None, company_name: str = "") -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm,
                            topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Title"], fontSize=18, textColor=colors.HexColor("#2e7d32"))
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=colors.HexColor("#333333"))

    elements = []

    # Branding header
    elements.append(Paragraph(company_name or "AI Employee OS", h1))
    elements.append(Paragraph(f'<b>Quotation # {quotation.quotation_number}</b>', h2))
    elements.append(Paragraph(
        f'Status: <b>{quotation.status.value if hasattr(quotation.status, "value") else quotation.status}</b><br/>'
        f'Currency: {quotation.currency}&nbsp;&nbsp;Valid Until: {quotation.valid_until.date() if hasattr(quotation.valid_until, "date") and quotation.valid_until else "-"}'))
    if customer:
        elements.append(Paragraph(f'Customer: <b>{customer.name}</b>', styles["Normal"]))
    elements.append(Spacer(1, 6 * mm))

    # Line items
    data = [["Description", "Qty", "Unit Price", "Line Total"]]
    for li in (quotation.line_items or []):
        data.append([li.description, str(li.quantity), f"{float(li.unit_price):.2f}", f"{float(li.line_total):.2f}"])
    table = Table(data, colWidths=[90 * mm, 20 * mm, 30 * mm, 30 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2e7d32")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#eef7ed")]),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 6 * mm))

    # Totals
    totals = [
        ("Subtotal", float(quotation.subtotal or 0)),
        ("Discount Amount", float(quotation.discount_amount or 0)),
        ("Tax Amount", float(quotation.tax_amount or 0)),
        ("Grand Total", float(quotation.total_amount or 0)),
    ]
    for label, value in totals:
        elements.append(Paragraph(f"{label}: <b>{value:.2f} {quotation.currency}</b>",
                                  ParagraphStyle("t", parent=styles["Normal"], alignment=2)))

    if quotation.notes:
        elements.append(Spacer(1, 4 * mm))
        elements.append(Paragraph(f"Notes: {quotation.notes}", styles["Italic"]))

    doc.build(elements)
    buf.seek(0)
    return buf.read()