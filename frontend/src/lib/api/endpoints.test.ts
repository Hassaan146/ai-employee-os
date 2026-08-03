/**
 * Tests that the frontend calls the exact endpoint paths the backend team has
 * agreed to build, and that each one degrades to preview data until it exists.
 *
 * These paths are the contract shown on the system status page. If someone
 * changes a URL here without updating that table, this test should fail.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createAIEmployee, getAIEmployee, listAIEmployees, updateAIEmployee } from "@/lib/api/employees";
import { getCurrentCompany, listUsers } from "@/lib/api/organisation";
import { CHAT_AGENTS, sendChatMessage } from "@/lib/api/chat";
import { AI_URL, BACKEND_URL } from "@/lib/config";
import { IMPLEMENTED_AI_ROLES } from "@/lib/types";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Stub fetch as a backend that has not implemented anything yet. */
function stubAllMissing() {
  const spy = vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
    statusText: "Not Found",
    json: async () => ({}),
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

describe("endpoint paths", () => {
  it.each([
    ["listAIEmployees", () => listAIEmployees(), `${BACKEND_URL}/api/v1/ai-employees`],
    ["getAIEmployee", () => getAIEmployee("abc"), `${BACKEND_URL}/api/v1/ai-employees/abc`],
    ["listUsers", () => listUsers(), `${BACKEND_URL}/api/v1/users`],
    ["getCurrentCompany", () => getCurrentCompany(), `${BACKEND_URL}/api/v1/companies/me`],
  ] as const)("%s calls %s", async (_name, call, expectedUrl) => {
    const spy = stubAllMissing();

    await call();

    expect(spy.mock.calls[0][0]).toBe(expectedUrl);
  });

  it("createAIEmployee POSTs the draft", async () => {
    const spy = stubAllMissing();

    await createAIEmployee({
      name: "Sales Manager",
      role_type: "sales",
      system_prompt: null,
      permissions: {},
      is_active: true,
    });

    const [url, init] = spy.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/api/v1/ai-employees`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toMatchObject({ name: "Sales Manager", role_type: "sales" });
  });

  it("updateAIEmployee PATCHes only the changed fields", async () => {
    const spy = stubAllMissing();

    await updateAIEmployee("abc", { is_active: false });

    const [url, init] = spy.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/api/v1/ai-employees/abc`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ is_active: false });
  });

  it("sendChatMessage POSTs the ai/plan.md contract to the AI service", async () => {
    const spy = stubAllMissing();

    await sendChatMessage(
      { message: "hello", session_id: "web-1", agent: "sales" },
      "Sales Manager",
    );

    const [url, init] = spy.mock.calls[0];
    expect(url).toBe(`${AI_URL}/chat`);
    expect(init.method).toBe("POST");
    // The AI service expects exactly these three keys.
    expect(JSON.parse(init.body)).toEqual({
      message: "hello",
      session_id: "web-1",
      agent: "sales",
    });
  });
});

describe("preview fallback while the backend is incomplete", () => {
  it.each([
    ["AI employees", () => listAIEmployees()],
    ["users", () => listUsers()],
    ["company", () => getCurrentCompany()],
  ])("%s degrades to preview data on 404", async (_name, call) => {
    stubAllMissing();

    const result = await call();

    expect(result.source).toBe("preview");
    expect(result.data).toBeTruthy();
  });

  it("chat returns a preview reply that admits the endpoint is missing", async () => {
    stubAllMissing();

    const result = await sendChatMessage(
      { message: "What open deals does John have?", session_id: "s", agent: "sales" },
      "Sales Manager",
    );

    expect(result.source).toBe("preview");
    // The canned reply must not impersonate a real model answer.
    expect(result.data.response).toContain("Preview reply");
    expect(result.data.response).toContain("POST /chat");
  });

  // Proves the swap to live data needs no code change once routes ship.
  it("switches to live data automatically when an endpoint exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => [
          {
            id: "real-1",
            company_id: "c1",
            name: "Live Sales Manager",
            role_type: "sales",
            system_prompt: null,
            permissions: {},
            is_active: true,
            created_at: "2026-08-01T00:00:00Z",
            updated_at: "2026-08-01T00:00:00Z",
          },
        ],
      }),
    );

    const result = await listAIEmployees();

    expect(result.source).toBe("live");
    expect(result.data[0].name).toBe("Live Sales Manager");
  });
});

describe("chat agent registry", () => {
  it("only offers agents that have a module in ai/app/agents/", () => {
    const offered = CHAT_AGENTS.map((a) => a.id).sort();

    expect(offered).toEqual([...IMPLEMENTED_AI_ROLES].sort());
  });
});
