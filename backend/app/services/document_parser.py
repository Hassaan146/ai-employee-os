"""Document text extraction (Member 3, Day 7).

Uses PyPDF to extract embedded text from PDFs, falling back to a UTF-8 decode
for plain-text formats. Image-only (scanned) PDFs return no text — a real OCR
engine (e.g. Tesseract) can be plugged in later.
"""
import io
from typing import Dict

from pypdf import PdfReader


def extract_pdf_text(content: bytes) -> str:
    """Extract text from every page of a PDF using PyPDF."""
    reader = PdfReader(io.BytesIO(content))
    pages = []
    for page in reader.pages:
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        pages.append(text)
    return "\n".join(pages).strip()


def extract_text(content: bytes, mime_type: str = "", filename: str = "") -> Dict:
    """Return {text, is_searchable, format} for an uploaded file's bytes."""
    mime = (mime_type or "").lower()
    name = (filename or "").lower()

    if "pdf" in mime or name.endswith(".pdf"):
        try:
            text = extract_pdf_text(content)
        except Exception:
            text = ""
        if text:
            return {"text": text, "is_searchable": True, "format": "pdf"}
        return {"text": "", "is_searchable": False, "format": "pdf_scanned"}

    # Non-PDF: attempt a plain-text decode.
    try:
        text = content.decode("utf-8", errors="ignore")
    except Exception:
        text = ""
    cleaned = text.strip()
    return {"text": cleaned, "is_searchable": bool(cleaned), "format": "text"}