/**
 * Tests for token storage and expiry detection.
 *
 * isTokenExpired decides whether the app even attempts to restore a session,
 * so it must fail closed: anything it cannot parse is treated as expired.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearToken,
  getToken,
  isTokenExpired,
  onTokenChange,
  setToken,
} from "@/lib/auth/session";

/** Build an unsigned JWT with the given exp claim (seconds since epoch). */
function jwtWithExp(exp: number | undefined): string {
  const payload = exp === undefined ? {} : { exp };
  const b64 = btoa(JSON.stringify(payload)).replace(/=+$/, "");
  return `header.${b64}.signature`;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("token storage", () => {
  it("round-trips a token", () => {
    setToken("abc123");
    expect(getToken()).toBe("abc123");
  });

  it("returns null when nothing is stored", () => {
    expect(getToken()).toBeNull();
  });

  it("clears the token", () => {
    setToken("abc123");
    clearToken();
    expect(getToken()).toBeNull();
  });

  it("notifies subscribers on set and clear", () => {
    const seen: (string | null)[] = [];
    const unsubscribe = onTokenChange((t) => seen.push(t));

    setToken("t1");
    clearToken();
    unsubscribe();
    setToken("t2"); // after unsubscribe — must not be recorded

    expect(seen).toEqual(["t1", null]);
  });
});

describe("isTokenExpired", () => {
  it("returns false for a token expiring in the future", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    expect(isTokenExpired(jwtWithExp(future))).toBe(false);
  });

  it("returns true for a token that has already expired", () => {
    const past = Math.floor(Date.now() / 1000) - 10;
    expect(isTokenExpired(jwtWithExp(past))).toBe(true);
  });

  it("treats a token with no exp claim as still valid", () => {
    // The server remains the authority; absence of exp is not evidence of expiry.
    expect(isTokenExpired(jwtWithExp(undefined))).toBe(false);
  });

  // Fail closed on anything malformed.
  it.each([
    ["not a jwt", "garbage"],
    ["empty payload segment", "header..signature"],
    ["non-base64 payload", "header.!!!!.signature"],
    ["empty string", ""],
  ])("treats %s as expired", (_label, token) => {
    expect(isTokenExpired(token)).toBe(true);
  });
});
