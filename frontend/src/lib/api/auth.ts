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

export function login(payload: LoginPayload): Promise<AuthToken> {
  return apiFetch<AuthToken>(`${AUTH}/login`, {
    method: "POST",
    body: JSON.stringify(payload),
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
