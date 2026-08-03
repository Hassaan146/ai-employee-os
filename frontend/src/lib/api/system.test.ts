/**
 * Tests for the system/health API.
 *
 * These endpoints are the only ones live today, so the dashboard and top bar
 * depend on them being reported accurately. A service that is down must read
 * as down — never as "unknown" or silently online.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { checkAllServices, checkBackend, fetchProviders } from "@/lib/api/system";
import { AI_URL, BACKEND_URL } from "@/lib/config";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubOk(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => body,
    }),
  );
}

describe("checkBackend", () => {
  it("probes /health and reports the service online with its payload", async () => {
    stubOk({ status: "healthy" });

    const health = await checkBackend();

    expect(health).toMatchObject({
      key: "backend",
      state: "online",
      baseUrl: BACKEND_URL,
      payload: { status: "healthy" },
    });
    expect(health.latencyMs).toBeTypeOf("number");
  });

  it("reports offline with an error instead of throwing when unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const health = await checkBackend();

    expect(health.state).toBe("offline");
    expect(health.error).toBeTruthy();
    // No latency should be claimed for a probe that never completed.
    expect(health.latencyMs).toBeUndefined();
  });

  it("calls the health path on the configured base URL", async () => {
    const spy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", spy);

    await checkBackend();

    expect(spy.mock.calls[0][0]).toBe(`${BACKEND_URL}/health`);
  });
});

describe("checkAllServices", () => {
  it("returns both services so the UI can show an online count", async () => {
    stubOk({ status: "ok" });

    const services = await checkAllServices();

    expect(services).toHaveLength(2);
    expect(services.map((s) => s.key)).toEqual(["backend", "ai"]);
  });

  it("still resolves when one service is down", async () => {
    // Backend answers, AI service refuses the connection.
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({ status: "healthy" }),
        })
        .mockRejectedValueOnce(new TypeError("Failed to fetch")),
    );

    const services = await checkAllServices();

    expect(services.filter((s) => s.state === "online")).toHaveLength(1);
    expect(services.filter((s) => s.state === "offline")).toHaveLength(1);
  });
});

describe("fetchProviders", () => {
  it("returns the provider list from the AI service", async () => {
    stubOk({ providers: ["openai", "anthropic", "gemini", "groq"] });

    await expect(fetchProviders()).resolves.toEqual([
      "openai",
      "anthropic",
      "gemini",
      "groq",
    ]);
  });

  it("returns null rather than throwing when the AI service is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(fetchProviders()).resolves.toBeNull();
  });

  it("requests the documented providers path", async () => {
    const spy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ providers: [] }),
    });
    vi.stubGlobal("fetch", spy);

    await fetchProviders();

    expect(spy.mock.calls[0][0]).toBe(`${AI_URL}/api/providers`);
  });
});
