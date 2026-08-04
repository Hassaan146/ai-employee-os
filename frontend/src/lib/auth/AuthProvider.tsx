"use client";

/**
 * Auth context.
 *
 * Holds the signed-in user and exposes sign-in / sign-up / sign-out. On mount
 * it validates any stored token against `GET /auth/me` rather than trusting
 * the JWT payload — a token can be revoked, or its user deactivated, while the
 * signature is still valid.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getMe, login as loginRequest, register as registerRequest } from "@/lib/api/auth";
import { clearToken, getToken, isTokenExpired, setToken } from "@/lib/auth/session";
import type { AuthUser, LoginPayload, RegisterPayload } from "@/lib/types";

interface AuthState {
  user: AuthUser | null;
  /** True until the initial token check finishes; guards render a spinner. */
  loading: boolean;
  signIn: (payload: LoginPayload) => Promise<void>;
  signUp: (payload: RegisterPayload) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Validate any stored token exactly once, on mount.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const token = getToken();
      if (!token || isTokenExpired(token)) {
        clearToken();
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const me = await getMe();
        if (!cancelled) setUser(me);
      } catch {
        // Token rejected by the server — drop it rather than showing a
        // half-signed-in UI.
        clearToken();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (payload: LoginPayload) => {
    const token = await loginRequest(payload);
    setToken(token.access_token);
    setUser(token.user);
  }, []);

  const signUp = useCallback(async (payload: RegisterPayload) => {
    const token = await registerRequest(payload);
    setToken(token.access_token);
    setUser(token.user);
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an <AuthProvider>");
  }
  return ctx;
}
