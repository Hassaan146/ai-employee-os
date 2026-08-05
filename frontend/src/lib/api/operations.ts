/**
 * Operations API — tasks, invoices, quotations, documents, meetings.
 *
 * All live against the backend merged from `secondary`. Tenant comes from the
 * bearer token, so no request here carries a company_id.
 *
 * Path quirk worth knowing: the CRM routers declare collections as "/" under a
 * prefix (so they need a trailing slash), while these newer routers declare
 * them as "" (so they must NOT have one). Both shapes are pinned by tests.
 */

import { apiFetch } from "@/lib/api/client";
import { getToken } from "@/lib/auth/session";
import { BACKEND_URL } from "@/lib/config";
import type {
  Invoice,
  InvoiceDraft,
  Meeting,
  MeetingActionItem,
  MeetingDraft,
  MeetingSpeakerLog,
  Quotation,
  QuotationDraft,
  StoredDocument,
  Task,
  TaskDraft,
  TaskListResponse,
} from "@/lib/types";

const V1 = `${BACKEND_URL}/api/v1`;

/* -------------------------------- Tasks -------------------------------- */

export function listTasks(params?: {
  status?: string;
  priority?: string;
  page?: number;
  page_size?: number;
}): Promise<TaskListResponse> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.priority) q.set("priority", params.priority);
  if (params?.page) q.set("page", String(params.page));
  if (params?.page_size) q.set("page_size", String(params.page_size));
  const qs = q.toString();
  return apiFetch<TaskListResponse>(`${V1}/tasks${qs ? `?${qs}` : ""}`);
}

export function createTask(draft: TaskDraft): Promise<Task> {
  return apiFetch<Task>(`${V1}/tasks`, {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

export function updateTask(id: string, patch: Partial<TaskDraft>): Promise<Task> {
  return apiFetch<Task>(`${V1}/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteTask(id: string): Promise<void> {
  return apiFetch<void>(`${V1}/tasks/${id}`, { method: "DELETE" });
}

/* ------------------------------- Invoices ------------------------------ */

export function listInvoices(): Promise<Invoice[]> {
  return apiFetch<Invoice[]>(`${V1}/invoices`);
}

export function getInvoice(id: string): Promise<Invoice> {
  return apiFetch<Invoice>(`${V1}/invoices/${id}`);
}

/** Totals are computed server-side from line items, tax, and discount. */
export function createInvoice(draft: InvoiceDraft): Promise<Invoice> {
  return apiFetch<Invoice>(`${V1}/invoices`, {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

export function updateInvoiceStatus(
  id: string,
  status: string,
  amountPaid?: number | null,
): Promise<Invoice> {
  return apiFetch<Invoice>(`${V1}/invoices/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, amount_paid: amountPaid ?? null }),
  });
}

export function deleteInvoice(id: string): Promise<void> {
  return apiFetch<void>(`${V1}/invoices/${id}`, { method: "DELETE" });
}

/* ------------------------------ Quotations ----------------------------- */

export function listQuotations(): Promise<Quotation[]> {
  return apiFetch<Quotation[]>(`${V1}/quotations`);
}

export function getQuotation(id: string): Promise<Quotation> {
  return apiFetch<Quotation>(`${V1}/quotations/${id}`);
}

export function createQuotation(draft: QuotationDraft): Promise<Quotation> {
  return apiFetch<Quotation>(`${V1}/quotations`, {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

export function updateQuotation(
  id: string,
  patch: Partial<QuotationDraft>,
): Promise<Quotation> {
  return apiFetch<Quotation>(`${V1}/quotations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/** Approval workflow: send → approve / reject. */
export function sendQuotation(id: string): Promise<Quotation> {
  return apiFetch<Quotation>(`${V1}/quotations/${id}/send`, { method: "POST" });
}

export function approveQuotation(id: string): Promise<Quotation> {
  return apiFetch<Quotation>(`${V1}/quotations/${id}/approve`, { method: "POST" });
}

export function rejectQuotation(id: string): Promise<Quotation> {
  return apiFetch<Quotation>(`${V1}/quotations/${id}/reject`, { method: "POST" });
}

/* ------------------------------ Documents ------------------------------ */

export function listDocuments(): Promise<StoredDocument[]> {
  return apiFetch<StoredDocument[]>(`${V1}/documents`);
}

export function getDocument(id: string): Promise<StoredDocument> {
  return apiFetch<StoredDocument>(`${V1}/documents/${id}`);
}

export function deleteDocument(id: string): Promise<void> {
  return apiFetch<void>(`${V1}/documents/${id}`, { method: "DELETE" });
}

/** Full-text search over extracted document text. */
export function searchDocuments(query: string): Promise<unknown> {
  return apiFetch<unknown>(
    `${V1}/documents/search?query=${encodeURIComponent(query)}`,
  );
}

/**
 * Upload is multipart, so it bypasses apiFetch — that helper forces a JSON
 * content-type, and setting one manually on FormData would omit the boundary
 * the server needs to parse the parts.
 */
export async function uploadDocument(
  file: File,
  documentType: string,
  customerId?: string | null,
): Promise<StoredDocument> {
  const form = new FormData();
  form.append("file", file);
  form.append("document_type", documentType);
  if (customerId) form.append("customer_id", customerId);

  const token = getToken();
  const res = await fetch(`${V1}/documents/upload`, {
    method: "POST",
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as StoredDocument;
}

/* ------------------------------- Meetings ------------------------------ */

export function listMeetings(): Promise<Meeting[]> {
  return apiFetch<Meeting[]>(`${V1}/meetings`);
}

export function getMeeting(id: string): Promise<Meeting> {
  return apiFetch<Meeting>(`${V1}/meetings/${id}`);
}

export function createMeeting(draft: MeetingDraft): Promise<Meeting> {
  return apiFetch<Meeting>(`${V1}/meetings`, {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

export function updateMeeting(
  id: string,
  patch: Partial<Meeting>,
): Promise<Meeting> {
  return apiFetch<Meeting>(`${V1}/meetings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function listActionItems(meetingId: string): Promise<MeetingActionItem[]> {
  return apiFetch<MeetingActionItem[]>(`${V1}/meetings/${meetingId}/action-items`);
}

export function createActionItem(
  meetingId: string,
  payload: {
    description: string;
    assigned_to_id?: string | null;
    deadline?: string | null;
  },
): Promise<MeetingActionItem> {
  return apiFetch<MeetingActionItem>(`${V1}/meetings/${meetingId}/action-items`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateActionItem(
  meetingId: string,
  itemId: string,
  patch: { is_completed?: boolean; description?: string; deadline?: string | null },
): Promise<MeetingActionItem> {
  return apiFetch<MeetingActionItem>(
    `${V1}/meetings/${meetingId}/action-items/${itemId}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}

export function addSpeakerLog(
  meetingId: string,
  payload: {
    speaker_label: string;
    text?: string | null;
    start_time_seconds?: number | null;
    end_time_seconds?: number | null;
  },
): Promise<MeetingSpeakerLog> {
  return apiFetch<MeetingSpeakerLog>(`${V1}/meetings/${meetingId}/speakers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
