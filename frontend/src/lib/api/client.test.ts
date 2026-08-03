/**
 * Tests for the API client.
 *
 * The preview-fallback rules are the highest-risk logic in the frontend: if
 * they are wrong, either the UI breaks when the backend is down, or — far
 * worse — fixture data gets rendered as if it were live. These tests pin both
 * directions down.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, withPreviewFallback } from "@/lib/api/client";

/** Build a fetch stub that resolves to the given response. */
function mockFetch(res: Partial<Response> & { json?: () => Promise<unknown> }) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({}),
    ...res,
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch({}));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("apiFetch", () => {
  it("returns the parsed JSON body on success", async () => {
    vi.stubGlobal("fetch", mockFetch({ json: async () => ({ status: "healthy" }) }));

    await expect(apiFetch<{ status: string }>("http://x/health")).resolves.toEqual({
      status: "healthy",
    });
  });

  it("sends JSON content-type and disables caching", async () => {
    const spy = mockFetch({});
    vi.stubGlobal("fetch", spy);

    await apiFetch("http://x/health");

    const [, init] = spy.mock.calls[0];
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(init.cache).toBe("no-store");
  });

  it("throws ApiError carrying the HTTP status", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ ok: false, status: 404, statusText: "Not Found" }),
    );

    await expect(apiFetch("http://x/missing")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
    });
  });

  it("reports a network failure as status 0", async () => {
    // A dead service or CORS rejection surfaces as a thrown TypeError.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(apiFetch("http://x/health")).rejects.toMatchObject({ status: 0 });
  });

  it("returns undefined for 204 rather than trying to parse a body", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        status: 204,
        json: async () => {
          throw new Error("must not parse a 204 body");
        },
      }),
    );

    await expect(apiFetch("http://x/thing")).resolves.toBeUndefined();
  });

  it("converts an aborted request into a 408 ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")),
    );

    await expect(apiFetch("http://x/slow", { timeoutMs: 5 })).rejects.toMatchObject({
      status: 408,
    });
  });
});

describe("withPreviewFallback", () => {
  const fixture = () => ["fixture-record"];

  it("labels a successful response as live and never calls the fixture", async () => {
    const fixtureSpy = vi.fn(fixture);

    const result = await withPreviewFallback(async () => ["real-record"], fixtureSpy);

    expect(result).toEqual({ data: ["real-record"], source: "live" });
    expect(fixtureSpy).not.toHaveBeenCalled();
  });

  // A missing endpoint is the expected state for most routes right now, so
  // these must degrade rather than throw.
  it.each([
    [404, "not implemented"],
    [405, "method not allowed"],
    [0, "service unreachable"],
    [408, "timed out"],
  ])("falls back to preview on status %i (%s)", async (status) => {
    const result = await withPreviewFallback(async () => {
      throw new ApiError("nope", status, "http://x");
    }, fixture);

    expect(result.source).toBe("preview");
    expect(result.data).toEqual(["fixture-record"]);
    expect(result.reason).toBeTruthy();
  });

  // These are genuine bugs, not a missing backend — swallowing them would
  // hide auth and validation failures behind fake data.
  it.each([401, 403, 422, 500])("rethrows status %i instead of masking it", async (status) => {
    await expect(
      withPreviewFallback(async () => {
        throw new ApiError("real failure", status, "http://x");
      }, fixture),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("always reports the source so the UI can label preview data", async () => {
    const live = await withPreviewFallback(async () => "x", () => "y");
    const preview = await withPreviewFallback(async () => {
      throw new ApiError("gone", 404, "http://x");
    }, () => "y");

    // Neither path may return data without saying where it came from.
    expect(live.source).toBe("live");
    expect(preview.source).toBe("preview");
  });
});
