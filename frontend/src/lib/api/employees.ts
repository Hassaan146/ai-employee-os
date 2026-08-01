/**
 * AI Employee API — maps to backend/app/models/ai_employee.py.
 *
 * The model exists; the REST routes do not yet. Each call targets the endpoint
 * the backend team is expected to build and falls back to preview fixtures
 * until then. Endpoint paths follow the API_V1_STR convention in
 * backend/app/core/config.py ("/api/v1").
 */

import { apiFetch, withPreviewFallback, type Sourced } from "@/lib/api/client";
import { BACKEND_URL } from "@/lib/config";
import { previewAIEmployees } from "@/lib/fixtures";
import type { AIEmployee, AIEmployeeDraft } from "@/lib/types";

const BASE = `${BACKEND_URL}/api/v1/ai-employees`;

export function listAIEmployees(): Promise<Sourced<AIEmployee[]>> {
  return withPreviewFallback(
    () => apiFetch<AIEmployee[]>(BASE),
    () => previewAIEmployees,
  );
}

export function getAIEmployee(id: string): Promise<Sourced<AIEmployee | null>> {
  return withPreviewFallback(
    () => apiFetch<AIEmployee>(`${BASE}/${id}`),
    () => previewAIEmployees.find((e) => e.id === id) ?? null,
  );
}

export function createAIEmployee(draft: AIEmployeeDraft): Promise<Sourced<AIEmployee>> {
  return withPreviewFallback(
    () =>
      apiFetch<AIEmployee>(BASE, {
        method: "POST",
        body: JSON.stringify(draft),
      }),
    // Preview mode: synthesise the record the backend would have returned so
    // the optimistic UI still behaves correctly during review.
    () => {
      const now = new Date().toISOString();
      return {
        id: `preview-${Math.random().toString(36).slice(2, 10)}`,
        company_id: previewAIEmployees[0]?.company_id ?? "preview-company",
        created_at: now,
        updated_at: now,
        ...draft,
      };
    },
  );
}

export function updateAIEmployee(
  id: string,
  patch: Partial<AIEmployeeDraft>,
): Promise<Sourced<AIEmployee | null>> {
  return withPreviewFallback(
    () =>
      apiFetch<AIEmployee>(`${BASE}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    () => {
      const existing = previewAIEmployees.find((e) => e.id === id);
      if (!existing) return null;
      return { ...existing, ...patch, updated_at: new Date().toISOString() };
    },
  );
}
