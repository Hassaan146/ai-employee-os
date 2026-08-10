/**
 * System / health API.
 *
 * Everything in this file talks to endpoints that are LIVE today:
 *   GET {BACKEND_URL}/health     -> backend/app/main.py
 *   GET {BACKEND_URL}/           -> backend/app/main.py
 *   GET {AI_URL}/api/health      -> ai/app/api/health.py
 *   GET {AI_URL}/api/providers   -> ai/app/api/health.py
 *
 * No preview fallback here — if a service is down, the UI says it is down.
 */

import { apiFetch, ApiError } from "@/lib/api/client";
import { AI_URL, BACKEND_URL } from "@/lib/config";
import type { ProvidersResponse, ServiceHealth } from "@/lib/types";

async function probe(
  name: ServiceHealth["name"],
  key: ServiceHealth["key"],
  baseUrl: string,
  path: string,
): Promise<ServiceHealth> {
  const started = performance.now();
  try {
    const payload = await apiFetch<unknown>(`${baseUrl}${path}`, { timeoutMs: 5000 });
    return {
      name,
      key,
      baseUrl,
      state: "online",
      latencyMs: Math.round(performance.now() - started),
      payload,
    };
  } catch (err) {
    return {
      name,
      key,
      baseUrl,
      state: "offline",
      error: err instanceof ApiError ? err.message : "Unknown error",
    };
  }
}

export function checkBackend(): Promise<ServiceHealth> {
  return probe("Backend API", "backend", BACKEND_URL, "/health");
}

export function checkAiService(): Promise<ServiceHealth> {
  return probe("AI Service", "ai", AI_URL, "/api/health");
}

export function checkAllServices(): Promise<ServiceHealth[]> {
  return Promise.all([checkBackend(), checkAiService()]);
}

/**
 * Backend root banner (GET /). Reports the service name and version, which
 * /health does not carry. Returns null when the service is unreachable.
 */
export async function fetchBackendInfo(): Promise<Record<string, unknown> | null> {
  try {
    return await apiFetch<Record<string, unknown>>(`${BACKEND_URL}/`, {
      timeoutMs: 5000,
    });
  } catch {
    return null;
  }
}

/** Configured LLM providers. Returns null when the AI service is unreachable. */
export async function fetchProviders(): Promise<string[] | null> {
  try {
    const res = await apiFetch<ProvidersResponse>(`${AI_URL}/api/providers`, {
      timeoutMs: 5000,
    });
    return res.providers;
  } catch {
    return null;
  }
}
