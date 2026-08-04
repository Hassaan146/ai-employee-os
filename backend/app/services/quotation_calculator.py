"""Quotation approval-workflow rules.

Status machine:
    DRAFT --send--> SENT --approve--> APPROVED
                         +--reject--> REJECTED
Editing is only allowed while DRAFT or SENT. EXPIRED/CONVERTED are handled
later (Day 5/6) and are terminal for edits.
"""
from app.models.quotation import QuotationStatus

# Statuses from which the document may still be edited.
EDITABLE_STATUSES = {QuotationStatus.DRAFT, QuotationStatus.SENT}

# Allowed origin status for each transition.
SEND_FROM = {QuotationStatus.DRAFT}
APPROVE_FROM = {QuotationStatus.SENT}
REJECT_FROM = {QuotationStatus.SENT}


def can_edit(status: QuotationStatus) -> bool:
    return status in EDITABLE_STATUSES


def can_send(status: QuotationStatus) -> bool:
    return status in SEND_FROM


def can_approve(status: QuotationStatus) -> bool:
    return status in APPROVE_FROM


def can_reject(status: QuotationStatus) -> bool:
    return status in REJECT_FROM