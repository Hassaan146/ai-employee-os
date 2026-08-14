/**
 * Tests for the AI service contract and the agent roster.
 *
 * This file previously also covered the employees/organisation API modules.
 * Those were deleted along with their fixtures — the backend never built the
 * routes, so calling them only ever produced invented data. The pages that used
 * them now read real session data or the roster in src/lib/agents.ts, which is
 * what the remaining tests here pin.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { CHAT_AGENTS, getSessionId, sendChatMessage } from "@/lib/api/chat";
import { AI_URL } from "@/lib/config";
import { AGENT_MODULES, ROLES_WITHOUT_MODULE } from "@/lib/agents";
import { AI_ROLE_TYPES, IMPLEMENTED_AI_ROLES } from "@/lib/types";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubMissing() {
  const spy = vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
    statusText: "Not Found",
    json: async () => ({}),
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

describe("chat contract", () => {
  it("posts the ai/plan.md shape to the AI service", async () => {
    const spy = stubMissing();

    await sendChatMessage(
      { message: "hello", session_id: "web-1", agent: "sales" },
      "Sales Manager",
    );

    const [url, init] = spy.mock.calls[0];
    expect(url).toBe(`${AI_URL}/chat`);
    expect(init.method).toBe("POST");
    // The service expects exactly these three keys.
    expect(JSON.parse(init.body)).toEqual({
      message: "hello",
      session_id: "web-1",
      agent: "sales",
    });
  });

  it("falls back to a reply that admits the endpoint is missing", async () => {
    stubMissing();

    const res = await sendChatMessage(
      { message: "What open deals does John have?", session_id: "s", agent: "sales" },
      "Sales Manager",
    );

    expect(res.source).toBe("preview");
    // Must not imitate a real model answer.
    expect(res.data.response).toContain("Preview reply");
    expect(res.data.response).toContain("POST /chat");
  });

  it("keeps a stable session id across calls", () => {
    expect(getSessionId()).toBe(getSessionId());
  });
});

describe("agent roster", () => {
  it("offers exactly the roles that have an agent module", () => {
    expect(AGENT_MODULES.map((a) => a.id).sort()).toEqual(
      [...IMPLEMENTED_AI_ROLES].sort(),
    );
  });

  it("chat offers the same roles as the roster", () => {
    expect(CHAT_AGENTS.map((a) => a.id).sort()).toEqual(
      AGENT_MODULES.map((a) => a.id).sort(),
    );
  });

  it("every roster role is a valid AIRoleType", () => {
    AGENT_MODULES.forEach((a) => {
      expect(AI_ROLE_TYPES).toContain(a.id);
    });
  });

  it("roles without a module do not overlap the roster", () => {
    const implemented = new Set(AGENT_MODULES.map((a) => a.id));
    ROLES_WITHOUT_MODULE.forEach((r) => {
      expect(implemented.has(r)).toBe(false);
    });
  });

  it("roster plus unimplemented roles accounts for every enum value", () => {
    const all = [...AGENT_MODULES.map((a) => a.id), ...ROLES_WITHOUT_MODULE].sort();
    expect(all).toEqual([...AI_ROLE_TYPES].sort());
  });

  it("cites a source file for each agent so the claim is checkable", () => {
    AGENT_MODULES.forEach((a) => {
      expect(a.source).toMatch(/^ai\/app\/agents\/\w+\.py$/);
    });
  });
});
