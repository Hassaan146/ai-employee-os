/**
 * Chat API — targets the AI service contract from ai/plan.md:
 *
 *   POST /chat  { message, session_id, agent }  ->  { response }
 *
 * The agents and their tool-calling loop are implemented in ai/app/agents/,
 * but Member 1 has not exposed the HTTP endpoint yet, so this falls back to a
 * clearly-labelled preview reply.
 */

import { apiFetch, withPreviewFallback, type Sourced } from "@/lib/api/client";
import { AI_URL } from "@/lib/config";
import { previewChatResponse } from "@/lib/fixtures";
import type { AIRoleType, ChatRequest, ChatResponse } from "@/lib/types";

export function sendChatMessage(
  req: ChatRequest,
  agentDisplayName: string,
): Promise<Sourced<ChatResponse>> {
  return withPreviewFallback(
    () =>
      apiFetch<ChatResponse>(`${AI_URL}/chat`, {
        method: "POST",
        body: JSON.stringify(req),
        // Model calls plus tool round-trips take longer than a normal request.
        timeoutMs: 45_000,
      }),
    () => previewChatResponse(agentDisplayName, req.message),
  );
}

/** Stable per-tab session id so conversation memory works once it's wired up. */
export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  const KEY = "aieos.session_id";
  let id = window.sessionStorage.getItem(KEY);
  if (!id) {
    id = `web-${crypto.randomUUID()}`;
    window.sessionStorage.setItem(KEY, id);
  }
  return id;
}

/** Agents that have a real implementation in ai/app/agents/. */
export const CHAT_AGENTS: { id: AIRoleType; label: string; blurb: string }[] = [
  { id: "executive", label: "Executive Assistant", blurb: "Multi-step business tasks" },
  { id: "sales", label: "Sales Manager", blurb: "Leads, quotations, follow-ups" },
  { id: "support", label: "Support Agent", blurb: "Customer issues and questions" },
  { id: "finance", label: "Finance Assistant", blurb: "Invoices and payments" },
  { id: "hr", label: "HR Assistant", blurb: "Policies and onboarding" },
];
