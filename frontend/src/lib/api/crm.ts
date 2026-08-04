/**
 * CRM API — backend/app/api/{customers,leads,pipeline,activities}.py.
 *
 * These endpoints are LIVE, so there is no preview fallback: errors surface to
 * the user. Note the trailing slashes on the collection routes — the backend
 * declares them as "/" under a prefix, and omitting the slash triggers a
 * redirect that drops the Authorization header on some clients.
 */

import { apiFetch } from "@/lib/api/client";
import { BACKEND_URL } from "@/lib/config";
import type {
  Activity,
  Customer,
  CustomerDraft,
  Lead,
  LeadDraft,
  PipelineEntry,
} from "@/lib/types";

const CRM = `${BACKEND_URL}/api/v1/crm`;

/* ----------------------------- Customers ----------------------------- */

export function listCustomers(): Promise<Customer[]> {
  return apiFetch<Customer[]>(`${CRM}/customers/`);
}

export function getCustomer(id: number): Promise<Customer> {
  return apiFetch<Customer>(`${CRM}/customers/${id}`);
}

/** `company_id` is required by CustomerCreate and comes from the session. */
export function createCustomer(
  draft: CustomerDraft,
  companyId: string,
): Promise<Customer> {
  return apiFetch<Customer>(`${CRM}/customers/`, {
    method: "POST",
    body: JSON.stringify({ ...draft, company_id: companyId }),
  });
}

export function updateCustomer(
  id: number,
  patch: Partial<CustomerDraft>,
): Promise<Customer> {
  return apiFetch<Customer>(`${CRM}/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function deleteCustomer(id: number): Promise<void> {
  return apiFetch<void>(`${CRM}/customers/${id}`, { method: "DELETE" });
}

/* ------------------------------- Leads ------------------------------- */

export function listLeads(): Promise<Lead[]> {
  return apiFetch<Lead[]>(`${CRM}/leads/`);
}

export function getLead(id: number): Promise<Lead> {
  return apiFetch<Lead>(`${CRM}/leads/${id}`);
}

export function createLead(draft: LeadDraft, companyId: string): Promise<Lead> {
  return apiFetch<Lead>(`${CRM}/leads/`, {
    method: "POST",
    body: JSON.stringify({ ...draft, company_id: companyId }),
  });
}

export function updateLead(id: number, patch: Partial<LeadDraft>): Promise<Lead> {
  return apiFetch<Lead>(`${CRM}/leads/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function deleteLead(id: number): Promise<void> {
  return apiFetch<void>(`${CRM}/leads/${id}`, { method: "DELETE" });
}

/* ------------------------------ Pipeline ----------------------------- */

export function listPipeline(): Promise<PipelineEntry[]> {
  return apiFetch<PipelineEntry[]>(`${CRM}/pipeline/`);
}

export function createPipelineEntry(payload: {
  lead_id: number;
  stage: string;
  probability?: number | null;
  expected_close_date?: string | null;
  notes?: string | null;
  company_id: string;
}): Promise<PipelineEntry> {
  return apiFetch<PipelineEntry>(`${CRM}/pipeline/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Move a pipeline entry to a new stage.
 *
 * The backend validates the move against ALLOWED_TRANSITIONS and returns 400
 * for an illegal one. The UI checks the same table first so illegal moves are
 * not offered, but this can still fail if another user moved the record.
 */
export function updatePipelineEntry(
  id: number,
  patch: {
    stage?: string;
    probability?: number | null;
    expected_close_date?: string | null;
    notes?: string | null;
  },
): Promise<PipelineEntry> {
  return apiFetch<PipelineEntry>(`${CRM}/pipeline/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function deletePipelineEntry(id: number): Promise<void> {
  return apiFetch<void>(`${CRM}/pipeline/${id}`, { method: "DELETE" });
}

/* ----------------------------- Activities ---------------------------- */

export function listLeadActivities(leadId: number): Promise<Activity[]> {
  return apiFetch<Activity[]>(`${CRM}/leads/${leadId}/activities`);
}

export function createActivity(payload: {
  activity_type: string;
  description?: string | null;
  company_id: number;
  lead_id?: number | null;
  customer_id?: number | null;
}): Promise<Activity> {
  return apiFetch<Activity>(`${CRM}/activities`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
