/**
 * Authentication API — backend/app/api/auth.py.
 *
 * These endpoints are LIVE, so there is no preview fallback here. A failure is
 * surfaced to the user as a real error.
 *
 *   POST /api/v1/auth/register -> Token
 *   POST /api/v1/auth/login    -> Token
 *   GET  /api/v1/auth/me       -> UserResponse   (requires Bearer token)
 */

import { apiFetch } from "@/lib/api/client";
import { BACKEND_URL } from "@/lib/config";
import type {
  AuthToken,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "@/lib/types";

const AUTH = `${BACKEND_URL}/api/v1/auth`;

/**
 * Login takes form-encoded credentials, not JSON.
 *
 * The endpoint uses FastAPI's OAuth2PasswordRequestForm, so the body must be
 * application/x-www-form-urlencoded and the email goes in the `username`
 * field. Sending JSON here returns 422.
 */
export function login(payload: LoginPayload): Promise<AuthToken> {
  const form = new URLSearchParams();
  form.set("username", payload.email);
  form.set("password", payload.password);

  return apiFetch<AuthToken>(`${AUTH}/login`, {
    method: "POST",
    body: form.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    anonymous: true,
  });
}

export function register(payload: RegisterPayload): Promise<AuthToken> {
  return apiFetch<AuthToken>(`${AUTH}/register`, {
    method: "POST",
    body: JSON.stringify(payload),
    anonymous: true,
  });
}

/** Resolve the signed-in user from the stored token. */
export function getMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>(`${AUTH}/me`);
}
