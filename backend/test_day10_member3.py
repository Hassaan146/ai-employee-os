"""Day10 tests (Member 3): unit + integration tests for Invoice/Quotation PDF
generation, Meetings, and Celery tasks. Run: venv/Scripts/python.exe test_day10_member3.py

Uses an isolated file-based SQLite DB (set via DATABASE_URL_ENV) so the Celery
tasks, which use their own SessionLocal, operate on the exact same data as the API.
"""
import os
import uuid
from datetime import datetime, timedelta
from io import BytesIO
from types import SimpleNamespace

# ---- isolated test DB BEFORE importing app ----
test_db_filename = f"./test_day10_m3_{uuid.uuid4().hex[:8]}.db"
os.environ["DATABASE_URL_ENV"] = f"sqlite:///{test_db_filename}"

import atexit  # noqa: E402


def _cleanup_db():
    try:
        from app.core.database import engine
        engine.dispose()  # release the SQLite file lock on Windows before deleting
    except Exception:
        pass
    try:
        if os.path.exists(test_db_filename):
            os.remove(test_db_filename)
    except Exception:
        pass


atexit.register(_cleanup_db)

from pypdf import PdfReader  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.tasks.reminders import process_due_date_reminders_task  # noqa: E402
from app.tasks.recurring_invoices import generate_recurring_invoices_task  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402
from app.models.invoice import Invoice, InvoiceLineItem, InvoiceStatus  # noqa: E402
from app.models.quotation import Quotation, QuotationLineItem, QuotationStatus  # noqa: E402
from app.services.pdf_generator import generate_invoice_pdf, generate_quotation_pdf  # noqa: E402

client = TestClient(app)
P, F = 0, 0


def check(label, cond, detail=""):
    global P, F
    cond = bool(cond)
    P += int(cond); F += int(not cond)
    print(f"  [{'PASS' if cond else 'FAIL'}] {label}" + (f" -> {detail}" if not cond else ""))


def section(t):
    print(f"\n=== {t} ===")


def pdf_text(pdf_bytes) -> str:
    reader = PdfReader(BytesIO(pdf_bytes))
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def reg(prefix):
    e = f"{prefix}_{uuid.uuid4().hex[:8]}@c.com"
    r = client.post("/api/v1/auth/register", json={"email": e, "password": "Secret123!", "full_name": "M", "company_name": prefix})
    b = r.json()
    return b, {"Authorization": f"Bearer {b['access_token']}"}


# ---------------------------------------------------------------------------
section("PDF UNIT TESTS (pdf_generator service)")
inv = Invoice(
    id=str(uuid.uuid4()), company_id=str(uuid.uuid4()), customer_id=str(uuid.uuid4()),
    invoice_number="INV-UNIT-001", status=InvoiceStatus.SENT,
    subtotal=1000.0, tax_percent=10.0, tax_amount=100.0,
    discount_percent=5.0, discount_amount=50.0, total_amount=1050.0,
    amount_paid=0.0, currency="USD",
    issue_date=datetime.utcnow(), due_date=datetime.utcnow() + timedelta(days=30),
    notes="Unit test note",
)
inv.line_items = [InvoiceLineItem(description="Laptop", quantity=2, unit_price=500.0, line_total=1000.0)]
customer = SimpleNamespace(name="Acme Inc")

inv_pdf = generate_invoice_pdf(inv, customer, company_name="Test Corp")
check("invoice pdf is valid PDF bytes", inv_pdf.startswith(b"%PDF-1.") and len(inv_pdf) > 1000, f"{len(inv_pdf)} bytes")
inv_txt = pdf_text(inv_pdf)
check("invoice pdf contains number", "INV-UNIT-001" in inv_txt, f"text: {inv_txt[:120]!r}")
check("invoice pdf contains branding", "Test Corp" in inv_txt, "")
check("invoice pdf contains customer", "Acme Inc" in inv_txt, "")
check("invoice pdf contains line item", "Laptop" in inv_txt, "")
check("invoice pdf contains status", "sent" in inv_txt.lower(), "")
check("invoice pdf contains total", "1050.00" in inv_txt, "")
check("invoice pdf contains notes", "Unit test note" in inv_txt, "")

qt = Quotation(
    id=str(uuid.uuid4()), company_id=str(uuid.uuid4()), customer_id=str(uuid.uuid4()),
    quotation_number="QTN-UNIT-001", status=QuotationStatus.DRAFT,
    subtotal=2000.0, tax_percent=5.0, tax_amount=100.0,
    discount_percent=10.0, discount_amount=200.0, total_amount=1900.0,
    currency="USD", valid_until=datetime.utcnow() + timedelta(days=30),
    notes="Quotation note",
)
qt.line_items = [QuotationLineItem(description="Consulting", quantity=1, unit_price=2000.0, line_total=2000.0)]

qt_pdf = generate_quotation_pdf(qt, customer, company_name="Brand Co")
check("quotation pdf is valid PDF bytes", qt_pdf.startswith(b"%PDF-1.") and len(qt_pdf) > 1000, f"{len(qt_pdf)} bytes")
qt_txt = pdf_text(qt_pdf)
check("quotation pdf contains number", "QTN-UNIT-001" in qt_txt, f"text: {qt_txt[:120]!r}")
check("quotation pdf contains branding", "Brand Co" in qt_txt, "")
check("quotation pdf contains line item", "Consulting" in qt_txt, "")
check("quotation pdf contains grand total", "1900.00" in qt_txt, "")
check("quotation pdf contains notes", "Quotation note" in qt_txt, "")


# ---------------------------------------------------------------------------
section("PDF INTEGRATION (endpoints)")
_, ta = reg("pdfA")
r = client.post("/api/v1/crm/customers", headers=ta, json={"name": "Acme", "email": "acme@biz.com"})
cid = r.json()["id"]
check("seed customer", r.status_code == 200 and bool(cid))

r = client.post("/api/v1/quotations", headers=ta, json={
    "customer_id": cid, "quotation_number": f"QTN-D10-{uuid.uuid4().hex[:6]}",
    "tax_percent": 10.0, "discount_percent": 0.0, "currency": "USD",
    "line_items": [{"description": "Svc", "quantity": 1, "unit_price": 100.0}]})
q = r.json() if r.status_code == 201 else {}
qid, qnum = q.get("id"), q.get("quotation_number")
check("quotation created", r.status_code == 201 and bool(qid), f"{r.status_code}:{r.text[:120]}")

r = client.get(f"/api/v1/quotations/{qid}/pdf", headers=ta)
check("quotation pdf endpoint 200", r.status_code == 200 and r.headers["content-type"] == "application/pdf", f"{r.status_code}")
check("quotation pdf magic bytes", r.content.startswith(b"%PDF-1."))
check("quotation pdf text has number", qnum in pdf_text(r.content), f"{qnum}")

r = client.post("/api/v1/invoices", headers=ta, json={
    "customer_id": cid, "tax_percent": 10.0, "discount_percent": 5.0, "currency": "USD",
    "line_items": [{"description": "Server", "quantity": 1, "unit_price": 4000.0}]})
i = r.json() if r.status_code == 201 else {}
iid, inum = i.get("id"), i.get("invoice_number")
check("invoice created", r.status_code == 201 and bool(iid), f"{r.status_code}:{r.text[:120]}")

r = client.get(f"/api/v1/invoices/{iid}/pdf", headers=ta)
check("invoice pdf endpoint 200", r.status_code == 200 and r.headers["content-type"] == "application/pdf", f"{r.status_code}")
check("invoice pdf magic bytes", r.content.startswith(b"%PDF-1."))
check("invoice pdf text has number", inum in pdf_text(r.content), f"{inum}")
check("invoice pdf content-disposition header", "inline" in r.headers.get("content-disposition", ""), f"{r.headers.get('content-disposition')}")

_, tb = reg("pdfB")
r = client.get(f"/api/v1/invoices/{iid}/pdf", headers=tb)
check("tenant B blocked from A's invoice pdf -> 404", r.status_code == 404, f"{r.status_code}")
r = client.get("/api/v1/invoices/00000000-0000-0000-0000-000000000000/pdf", headers=ta)
check("nonexistent invoice pdf -> 404", r.status_code == 404, f"{r.status_code}")


# ---------------------------------------------------------------------------
section("MEETINGS INTEGRATION")
_, tm = reg("meetA")
r = client.post("/api/v1/meetings", headers=tm, json={
    "title": "Sprint Planning",
    "scheduled_at": (datetime.utcnow() + timedelta(days=1)).isoformat(),
    "duration_minutes": 30})
m = r.json() if r.status_code == 201 else {}
mid = m.get("id")
check("create meeting -> 201", r.status_code == 201 and bool(mid), f"{r.status_code}:{r.text[:120]}")
check("meeting default status scheduled", m.get("status") == "scheduled", f"{m.get('status')}")

r = client.patch(f"/api/v1/meetings/{mid}", headers=tm, json={"transcript_text": "Ali discussed timelines.", "status": "completed"})
check("patch transcript+status", r.status_code == 200 and r.json().get("status") == "completed" and "timelines" in r.json().get("transcript_text", ""), f"{r.status_code}:{r.text[:120]}")

r = client.post(f"/api/v1/meetings/{mid}/speakers", headers=tm, json={"speaker_label": "Speaker 1", "text": "Intro", "start_time_seconds": 0, "end_time_seconds": 30})
check("add speaker log -> 201", r.status_code == 201 and r.json().get("speaker_label") == "Speaker 1", f"{r.status_code}:{r.text[:120]}")

r = client.post(f"/api/v1/meetings/{mid}/action-items", headers=tm, json={"description": "Send follow-up email", "deadline": (datetime.utcnow() + timedelta(days=2)).isoformat()})
ai = r.json() if r.status_code == 201 else {}
aiid = ai.get("id")
check("add action item -> 201", r.status_code == 201 and ai.get("description") and not ai.get("is_completed"), f"{r.status_code}:{r.text[:120]}")

r = client.get(f"/api/v1/meetings/{mid}/action-items", headers=tm)
check("list action items", r.status_code == 200 and len(r.json()) >= 1)

r = client.patch(f"/api/v1/meetings/{mid}/action-items/{aiid}", headers=tm, json={"is_completed": True})
check("mark action item complete", r.status_code == 200 and r.json().get("is_completed") is True, f"{r.status_code}:{r.text[:120]}")

r = client.get("/api/v1/meetings", headers=tm)
check("list meetings non-empty", r.status_code == 200 and len(r.json()) >= 1)


# ---------------------------------------------------------------------------
section("CELERY TASK BEHAVIOR")
company_id = str(uuid.uuid4())
od_num, ds_num, fu_num, pd_num = (f"INV-{tag}-{uuid.uuid4().hex[:6]}" for tag in ("OD", "DS", "FU", "PD"))
rec_parent_num = f"INV-REC-PARENT-{uuid.uuid4().hex[:6]}"
db = SessionLocal()
try:
    inv_overdue = Invoice(company_id=company_id, customer_id=str(uuid.uuid4()), invoice_number=od_num,
                          status=InvoiceStatus.SENT, subtotal=100.0, tax_amount=0.0, discount_amount=0.0,
                          total_amount=100.0, currency="USD", due_date=datetime.utcnow() - timedelta(days=2))
    inv_due_soon = Invoice(company_id=company_id, customer_id=str(uuid.uuid4()), invoice_number=ds_num,
                           status=InvoiceStatus.SENT, subtotal=100.0, tax_amount=0.0, discount_amount=0.0,
                           total_amount=100.0, currency="USD", due_date=datetime.utcnow() + timedelta(days=1))
    inv_future = Invoice(company_id=company_id, customer_id=str(uuid.uuid4()), invoice_number=fu_num,
                         status=InvoiceStatus.SENT, subtotal=100.0, tax_amount=0.0, discount_amount=0.0,
                         total_amount=100.0, currency="USD", due_date=datetime.utcnow() + timedelta(days=10))
    inv_paid = Invoice(company_id=company_id, customer_id=str(uuid.uuid4()), invoice_number=pd_num,
                       status=InvoiceStatus.PAID, subtotal=100.0, tax_amount=0.0, discount_amount=0.0,
                       total_amount=100.0, currency="USD", due_date=datetime.utcnow() - timedelta(days=1))
    rec_company_id = str(uuid.uuid4())
    inv_recurring = Invoice(company_id=rec_company_id, customer_id=str(uuid.uuid4()), invoice_number=rec_parent_num,
                            status=InvoiceStatus.PAID, subtotal=500.0, tax_percent=10.0, tax_amount=50.0,
                            discount_amount=0.0, total_amount=550.0, currency="USD", is_recurring=True,
                            notes="Parent note", issue_date=datetime.utcnow() - timedelta(days=1))
    inv_recurring.line_items = [InvoiceLineItem(description="License", quantity=1, unit_price=500.0, line_total=500.0)]
    db.add_all([inv_overdue, inv_due_soon, inv_future, inv_paid, inv_recurring])
    db.commit()
finally:
    db.close()

res = process_due_date_reminders_task()
check("reminder task overdue_count == 1", res.get("overdue_count") == 1, f"{res}")
check("reminder task flags the right invoice", any(i["number"] == od_num for i in res.get("overdue_invoices", [])), f"{res.get('overdue_invoices')}")
check("reminder task due_soon_count == 1", res.get("due_soon_count") == 1, f"{res}")
check("reminder task due_soon is the 1-day invoice", any(i["number"] == ds_num for i in res.get("due_soon_invoices", [])), f"{res.get('due_soon_invoices')}")

res = generate_recurring_invoices_task()
check("recurring task generated == 1", res.get("generated") == 1, f"{res}")

db = SessionLocal()
try:
    new_inv = db.query(Invoice).filter(
        Invoice.invoice_number.like("INV-REC-%"),
        Invoice.invoice_number != rec_parent_num,
    ).first()
    check("recurring invoice created", new_inv is not None, "no generated INV-REC-* invoice found")
    check("recurring invoice copies total", new_inv is not None and new_inv.total_amount == 550.0, f"{new_inv.total_amount if new_inv else None}")
    check("recurring invoice copies line items", new_inv is not None and len(new_inv.line_items) == 1 and new_inv.line_items[0].description == "License", f"{len(new_inv.line_items) if new_inv else 0}")
    check("recurring invoice due date advanced ~30d", new_inv is not None and new_inv.due_date is not None
          and abs((new_inv.due_date - datetime.utcnow()).days - 30) <= 1, f"{new_inv.due_date if new_inv else None}")
finally:
    db.close()

res2 = generate_recurring_invoices_task()
check("idempotency: second run generates 0", res2.get("generated") == 0, f"{res2}")


print(f"\nTOTAL: {P} passed, {F} failed")
_cleanup_db()
raise SystemExit(1 if F else 0)
