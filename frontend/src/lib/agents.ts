/**
 * The AI employee roster.
 *
 * These entries mirror the agent modules that genuinely exist in
 * ai/app/agents/ — their name and tool_names are copied from the source, not
 * invented. The backend has an AIEmployee model but no CRUD routes yet, so
 * there is nothing per-company to read; this is the capability the platform
 * actually ships today.
 *
 * When GET /api/v1/ai-employees lands, this becomes the fallback/default set
 * and the page reads saved records instead.
 */

import type { AIRoleType } from "@/lib/types";

export interface AgentModule {
  /** Matches the `name` passed to BaseAgent in ai/app/agents/<role>.py. */
  id: AIRoleType;
  label: string;
  blurb: string;
  /** Copied from `tool_names` in the agent's constructor. */
  tools: string[];
  /** Path to the module, so the reader can verify the claim. */
  source: string;
}

export const AGENT_MODULES: AgentModule[] = [
  {
    id: "executive",
    label: "Executive Assistant",
    blurb: "Coordinates multi-step work across email, calendar, CRM and reporting.",
    tools: ["search_crm", "send_email", "create_meeting", "generate_quotation"],
    source: "ai/app/agents/executive.py",
  },
  {
    id: "sales",
    label: "Sales Manager",
    blurb: "Finds lead and customer information, prepares quotations, chases follow-ups.",
    tools: ["search_crm", "generate_quotation"],
    source: "ai/app/agents/sales.py",
  },
  {
    id: "finance",
    label: "Finance Assistant",
    blurb: "Handles invoices, payment tracking and expense questions.",
    tools: ["search_crm", "generate_invoice"],
    source: "ai/app/agents/finance.py",
  },
  {
    id: "support",
    label: "Customer Support Agent",
    blurb: "Resolves customer issues and escalates anything it cannot confirm.",
    tools: ["search_crm", "send_email"],
    source: "ai/app/agents/support.py",
  },
  {
    id: "hr",
    label: "HR Assistant",
    blurb: "Answers policy questions and helps with onboarding.",
    tools: [],
    source: "ai/app/agents/hr.py",
  },
];

/** Roles present in the DB enum that have no agent module behind them. */
export const ROLES_WITHOUT_MODULE: AIRoleType[] = [
  "accountant",
  "marketing",
  "legal",
];
