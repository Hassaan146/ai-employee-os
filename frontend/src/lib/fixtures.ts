/**
 * Preview fixtures.
 *
 * Only the chat reply remains. The company, user, and AI-employee fixtures were
 * deleted once auth went live: showing invented records beside a real signed-in
 * session was misleading, and every page that used them now reads either real
 * session data or the actual agent roster in src/lib/agents.ts.
 *
 * This last one stands in for the AI service's POST /chat, which still does not
 * exist. It deliberately announces itself rather than imitating a model reply.
 */

import type { ChatResponse } from "@/lib/types";

export function previewChatResponse(agentName: string, message: string): ChatResponse {
  return {
    response:
      `[Preview reply — the AI service does not expose POST /chat yet]\n\n` +
      `The ${agentName} agent is implemented in ai/app/agents/ and its tool-calling loop ` +
      `is ready, but it has not been wired to an HTTP endpoint. Once ` +
      `POST /chat is live, this panel will show the real agent response and any ` +
      `tools it called.\n\nYour message was: "${message}"`,
    tool_calls: [],
  };
}
