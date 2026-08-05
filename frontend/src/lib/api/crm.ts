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

export function getCustomer(id: string): Promise<Customer> {
  return apiFetch<Customer>(`${CRM}/customers/${id}`);
}

/**
 * `company_id` is NOT sent. The tenant-isolation work made the backend derive
 * it from the bearer token, and CustomerCreate no longer accepts it — a client
 * that supplies one would be asserting a tenant it has no right to choose.
 */
export function createCustomer(draft: CustomerDraft): Promise<Customer> {
  return apiFetch<Customer>(`${CRM}/customers/`, {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

export function updateCustomer(
  id: string,
  patch: Partial<CustomerDraft>,
): Promise<Customer> {
  return apiFetch<Customer>(`${CRM}/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function deleteCustomer(id: string): Promise<void> {
  return apiFetch<void>(`${CRM}/customers/${id}`, { method: "DELETE" });
}

/* ------------------------------- Leads ------------------------------- */

export function listLeads(): Promise<Lead[]> {
  return apiFetch<Lead[]>(`${CRM}/leads/`);
}

export function getLead(id: string): Promise<Lead> {
  return apiFetch<Lead>(`${CRM}/leads/${id}`);
}

/** Tenant comes from the token — see createCustomer. */
export function createLead(draft: LeadDraft): Promise<Lead> {
  return apiFetch<Lead>(`${CRM}/leads/`, {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

export function updateLead(id: string, patch: Partial<LeadDraft>): Promise<Lead> {
  return apiFetch<Lead>(`${CRM}/leads/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function deleteLead(id: string): Promise<void> {
  return apiFetch<void>(`${CRM}/leads/${id}`, { method: "DELETE" });
}

/* ------------------------------ Pipeline ----------------------------- */

export function listPipeline(): Promise<PipelineEntry[]> {
  return apiFetch<PipelineEntry[]>(`${CRM}/pipeline/`);
}

export function createPipelineEntry(payload: {
  lead_id: string;
  stage: string;
  probability?: number | null;
  expected_close_date?: string | null;
  notes?: string | null;
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
  id: string,
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

export function deletePipelineEntry(id: string): Promise<void> {
  return apiFetch<void>(`${CRM}/pipeline/${id}`, { method: "DELETE" });
}

/* ----------------------------- Activities ---------------------------- */

export function listLeadActivities(leadId: string): Promise<Activity[]> {
  return apiFetch<Activity[]>(`${CRM}/leads/${leadId}/activities`);
}

export function createActivity(payload: {
  activity_type: string;
  description?: string | null;
  company_id?: string;
  lead_id?: string | null;
  customer_id?: string | null;
}): Promise<Activity> {
  return apiFetch<Activity>(`${CRM}/activities`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
