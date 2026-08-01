/** Runtime configuration, read from NEXT_PUBLIC_* env vars. */

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:8000";

export const AI_URL =
  process.env.NEXT_PUBLIC_AI_URL?.replace(/\/$/, "") || "http://localhost:8001";

/**
 * Whether pages may fall back to local fixtures for endpoints the backend has
 * not implemented yet. Defaults to true so the UI is reviewable before the REST
 * layer lands; set NEXT_PUBLIC_ALLOW_PREVIEW_DATA=false to turn fallbacks off.
 */
export const ALLOW_PREVIEW_DATA =
  process.env.NEXT_PUBLIC_ALLOW_PREVIEW_DATA !== "false";
