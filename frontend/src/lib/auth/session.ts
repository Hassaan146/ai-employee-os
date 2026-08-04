/**
 * Access-token storage.
 *
 * The backend issues a JWT with an 8-day expiry (ACCESS_TOKEN_EXPIRE_MINUTES in
 * backend/app/core/config.py) and no refresh endpoint, so the token is kept in
 * localStorage to survive a reload.
 *
 * Trade-off worth stating plainly: localStorage is readable by any script on
 * the page, so a XSS bug would expose the token. The alternative — an
 * httpOnly cookie — needs the backend to set it, which the current
 * `POST /auth/login` does not do (it returns the token in the JSON body).
 * Moving to httpOnly cookies is tracked as a Phase 2 hardening item.
 */

const TOKEN_KEY = "aieos.access_token";

/** Notifies subscribers (the auth provider) when the token changes. */
type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  listeners.forEach((l) => l(token));
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  listeners.forEach((l) => l(null));
}

/** Subscribe to token changes; returns an unsubscribe function. */
export function onTokenChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Decode a JWT payload without verifying it.
 *
 * Verification is the server's job — this only reads `exp` so the UI can avoid
 * rendering a session it already knows is stale. Never trust these claims for
 * anything security-relevant.
 */
export function isTokenExpired(token: string): boolean {
  try {
    const [, payload] = token.split(".");
    if (!payload) return true;
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    if (typeof decoded.exp !== "number") return false;
    return decoded.exp * 1000 <= Date.now();
  } catch {
    // A token we cannot parse is not one we should rely on.
    return true;
  }
}
