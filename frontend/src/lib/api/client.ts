/**
 * Thin fetch wrapper shared by every API module.
 *
 * Two things matter here:
 *  1. Errors are normalised into ApiError so callers can branch on status.
 *  2. `withPreviewFallback` lets a page ask for real data and degrade to a
 *     local fixture when the endpoint does not exist yet. That fallback is
 *     always reported back to the caller so the UI can label it, never
 *     silently passed off as live data.
 */

import { ALLOW_PREVIEW_DATA } from "@/lib/config";
import { getToken } from "@/lib/auth/session";

export class ApiError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
  }
}

/** Request timeout in ms. Keeps a dead service from hanging the dashboard. */
const TIMEOUT_MS = 8000;

export async function apiFetch<T>(
  url: string,
  init?: RequestInit & { timeoutMs?: number; /** Skip the Authorization header. */ anonymous?: boolean },
): Promise<T> {
  const { timeoutMs = TIMEOUT_MS, anonymous = false, ...rest } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Protected routes expect `Authorization: Bearer <jwt>` (see
  // backend/app/core/deps.py). Login and register must not send it.
  const token = anonymous ? null : getToken();

  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(rest.headers ?? {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new ApiError(`${res.status} ${res.statusText}`, res.status, url);
    }

    // 204 and friends have no body to parse.
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(`Request timed out after ${timeoutMs}ms`, 408, url);
    }
    // Network-level failure: service down, CORS, DNS.
    throw new ApiError(
      err instanceof Error ? err.message : "Network request failed",
      0,
      url,
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Result of a call that may have been served from preview fixtures. */
export interface Sourced<T> {
  data: T;
  /** "live" when the backend answered, "preview" when a fixture was used. */
  source: "live" | "preview";
  /** Why the fallback kicked in — surfaced in the UI banner. */
  reason?: string;
}

/**
 * Run `request`; if it fails because the endpoint isn't implemented yet
 * (404, 405, or the service being unreachable) and preview data is allowed,
 * return the fixture instead and flag it as preview.
 *
 * A 4xx that is NOT "missing endpoint" (401, 403, 422) is rethrown — those are
 * real errors the developer needs to see, not a missing backend.
 */
export async function withPreviewFallback<T>(
  request: () => Promise<T>,
  fixture: () => T,
): Promise<Sourced<T>> {
  try {
    return { data: await request(), source: "live" };
  } catch (err) {
    const missingEndpoint =
      err instanceof ApiError &&
      (err.status === 0 || err.status === 404 || err.status === 405 || err.status === 408);

    if (missingEndpoint && ALLOW_PREVIEW_DATA) {
      return {
        data: fixture(),
        source: "preview",
        reason: err instanceof Error ? err.message : "endpoint unavailable",
      };
    }
    throw err;
  }
}
