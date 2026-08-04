/**
 * Tests for the CRM and auth API modules.
 *
 * These endpoints are live, so the key guarantees are: correct paths (including
 * the trailing slashes the backend requires), the Bearer token attached to
 * protected calls but never to login/register, and stage-transition rules that
 * match backend/app/core/pipeline_rules.py exactly.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCustomer,
  createLead,
  deleteCustomer,
  listCustomers,
  listLeadActivities,
  listLeads,
  listPipeline,
  updateCustomer,
  updatePipelineEntry,
} from "@/lib/api/crm";
import { getMe, login, register } from "@/lib/api/auth";
import { BACKEND_URL } from "@/lib/config";
import { clearToken, setToken } from "@/lib/auth/session";
import {
  ALLOWED_STAGE_TRANSITIONS,
  PIPELINE_STAGES,
  isValidStageTransition,
} from "@/lib/types";

function stubOk(body: unknown = {}) {
  const spy = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  clearToken();
});

describe("CRM endpoint paths", () => {
  it.each([
    ["listCustomers", () => listCustomers(), `${BACKEND_URL}/api/v1/crm/customers/`],
    ["listLeads", () => listLeads(), `${BACKEND_URL}/api/v1/crm/leads/`],
    ["listPipeline", () => listPipeline(), `${BACKEND_URL}/api/v1/crm/pipeline/`],
    [
      "listLeadActivities",
      () => listLeadActivities(7),
      `${BACKEND_URL}/api/v1/crm/leads/7/activities`,
    ],
  ] as const)("%s calls %s", async (_name, call, expected) => {
    const spy = stubOk([]);
    await call();
    expect(spy.mock.calls[0][0]).toBe(expected);
  });

  // The backend declares collections as "/" under a prefix; dropping the slash
  // causes a redirect that can strip the Authorization header.
  it("keeps the trailing slash on collection routes", async () => {
    const spy = stubOk([]);
    await listCustomers();
    expect(spy.mock.calls[0][0].endsWith("/customers/")).toBe(true);
  });

  it("createCustomer injects company_id from the session", async () => {
    const spy = stubOk({});
    await createCustomer(
      {
        name: "Acme",
        email: null,
        phone: null,
        company_name: null,
        address: null,
        status: "active",
      },
      "company-uuid-1",
    );

    const [url, init] = spy.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/api/v1/crm/customers/`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toMatchObject({
      name: "Acme",
      company_id: "company-uuid-1",
    });
  });

  it("createLead injects company_id from the session", async () => {
    const spy = stubOk({});
    await createLead(
      {
        name: "Prospect",
        email: null,
        phone: null,
        source: null,
        stage: "new",
        value: null,
        assigned_to: null,
      },
      "company-uuid-2",
    );

    expect(JSON.parse(spy.mock.calls[0][1].body)).toMatchObject({
      company_id: "company-uuid-2",
    });
  });

  it("updateCustomer uses PUT, matching the backend route", async () => {
    const spy = stubOk({});
    await updateCustomer(3, { name: "Renamed" });

    expect(spy.mock.calls[0][1].method).toBe("PUT");
    expect(spy.mock.calls[0][0]).toBe(`${BACKEND_URL}/api/v1/crm/customers/3`);
  });

  it("deleteCustomer uses DELETE", async () => {
    const spy = stubOk({});
    await deleteCustomer(9);

    expect(spy.mock.calls[0][1].method).toBe("DELETE");
  });

  it("updatePipelineEntry sends the target stage", async () => {
    const spy = stubOk({});
    await updatePipelineEntry(4, { stage: "qualified" });

    expect(JSON.parse(spy.mock.calls[0][1].body)).toEqual({ stage: "qualified" });
  });
});

describe("Authorization header", () => {
  it("attaches the Bearer token to protected calls", async () => {
    setToken("jwt-abc");
    const spy = stubOk([]);

    await listCustomers();

    expect(spy.mock.calls[0][1].headers).toMatchObject({
      Authorization: "Bearer jwt-abc",
    });
  });

  it("omits the header when there is no token", async () => {
    const spy = stubOk([]);

    await listCustomers();

    expect(spy.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  // Sending a stale token to login would be harmless but sloppy; more
  // importantly these routes are declared anonymous on purpose.
  it.each([
    ["login", () => login({ email: "a@b.co", password: "secret123" })],
    ["register", () => register({ email: "a@b.co", password: "secret123" })],
  ])("does not send the token on %s", async (_name, call) => {
    setToken("stale-token");
    const spy = stubOk({ access_token: "x", token_type: "bearer", user: {} });

    await call();

    expect(spy.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it("sends the token on getMe", async () => {
    setToken("jwt-me");
    const spy = stubOk({});

    await getMe();

    expect(spy.mock.calls[0][0]).toBe(`${BACKEND_URL}/api/v1/auth/me`);
    expect(spy.mock.calls[0][1].headers).toMatchObject({
      Authorization: "Bearer jwt-me",
    });
  });
});

describe("pipeline stage rules", () => {
  // Mirrors ALLOWED_TRANSITIONS in backend/app/core/pipeline_rules.py.
  it.each([
    ["new", "contacted", true],
    ["new", "lost", true],
    ["new", "qualified", false],
    ["contacted", "qualified", true],
    ["qualified", "proposal", true],
    ["proposal", "negotiation", true],
    ["negotiation", "won", true],
    ["negotiation", "qualified", false],
    ["won", "lost", false],
    ["lost", "new", false],
  ] as const)("%s -> %s is %s", (from, to, expected) => {
    expect(isValidStageTransition(from, to)).toBe(expected);
  });

  it("allows staying in the same stage", () => {
    PIPELINE_STAGES.forEach((s) => {
      expect(isValidStageTransition(s, s)).toBe(true);
    });
  });

  it("treats won and lost as final", () => {
    expect(ALLOWED_STAGE_TRANSITIONS.won).toEqual([]);
    expect(ALLOWED_STAGE_TRANSITIONS.lost).toEqual([]);
  });

  it("only ever transitions to a known stage", () => {
    Object.values(ALLOWED_STAGE_TRANSITIONS)
      .flat()
      .forEach((stage) => {
        expect(PIPELINE_STAGES).toContain(stage);
      });
  });
});
