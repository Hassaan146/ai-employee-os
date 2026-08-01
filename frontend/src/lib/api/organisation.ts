/**
 * Company + User API — maps to backend/app/models/company.py and user.py.
 * Models exist, routes do not yet; falls back to preview fixtures.
 */

import { apiFetch, withPreviewFallback, type Sourced } from "@/lib/api/client";
import { BACKEND_URL } from "@/lib/config";
import { previewCompany, previewUsers } from "@/lib/fixtures";
import type { Company, User } from "@/lib/types";

const V1 = `${BACKEND_URL}/api/v1`;

/** The company the signed-in user belongs to. */
export function getCurrentCompany(): Promise<Sourced<Company>> {
  return withPreviewFallback(
    () => apiFetch<Company>(`${V1}/companies/me`),
    () => previewCompany,
  );
}

export function listUsers(): Promise<Sourced<User[]>> {
  return withPreviewFallback(
    () => apiFetch<User[]>(`${V1}/users`),
    () => previewUsers,
  );
}
