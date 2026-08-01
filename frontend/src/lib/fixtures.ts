/**
 * Preview fixtures.
 *
 * These stand in for endpoints the backend has not built yet (company, users,
 * AI employee CRUD, chat). They exist so the UI can be reviewed and demoed
 * before the REST layer lands. Anything rendered from these is labelled
 * "Preview data" in the interface — it is never presented as live.
 *
 * The shapes match the SQLAlchemy models exactly, so when the real endpoints
 * arrive the fixture layer can simply be deleted.
 */

import type { AIEmployee, ChatResponse, Company, User } from "@/lib/types";

const COMPANY_ID = "c0a80101-0000-4000-8000-000000000001";
const NOW = "2026-08-01T09:00:00Z";

export const previewCompany: Company = {
  id: COMPANY_ID,
  name: "Northwind Trading Co.",
  pricing_tier: "pro",
  max_users: 5,
  max_ai_requests: 10_000,
  max_storage_gb: 20,
  created_at: "2026-06-12T10:30:00Z",
  updated_at: NOW,
};

export const previewUsers: User[] = [
  {
    id: "u-0001",
    company_id: COMPANY_ID,
    email: "amara.osei@northwind.example",
    full_name: "Amara Osei",
    role: "admin",
    is_active: true,
    created_at: "2026-06-12T10:31:00Z",
    updated_at: NOW,
  },
  {
    id: "u-0002",
    company_id: COMPANY_ID,
    email: "d.lindqvist@northwind.example",
    full_name: "Daniel Lindqvist",
    role: "manager",
    is_active: true,
    created_at: "2026-06-14T08:05:00Z",
    updated_at: NOW,
  },
  {
    id: "u-0003",
    company_id: COMPANY_ID,
    email: "priya.raman@northwind.example",
    full_name: "Priya Raman",
    role: "employee",
    is_active: true,
    created_at: "2026-06-20T13:45:00Z",
    updated_at: NOW,
  },
  {
    id: "u-0004",
    company_id: COMPANY_ID,
    email: "t.okafor@northwind.example",
    full_name: "Tobias Okafor",
    role: "employee",
    is_active: false,
    created_at: "2026-07-02T16:20:00Z",
    updated_at: NOW,
  },
];

/**
 * One AI employee per agent that actually exists in ai/app/agents/.
 * The system prompts are shortened versions of the real ones in ai/app/prompts/.
 */
export const previewAIEmployees: AIEmployee[] = [
  {
    id: "ae-sales",
    company_id: COMPANY_ID,
    name: "Sales Manager",
    role_type: "sales",
    system_prompt:
      "You are the AI Sales Manager for AI Employee OS. Help with finding customer and lead information, creating quotations, answering product and pricing questions, and following up on open deals. Never invent prices or customer data — always use the search_crm tool first.",
    permissions: { search_crm: true, send_email: false, create_quotation: false },
    is_active: true,
    created_at: "2026-06-15T09:00:00Z",
    updated_at: NOW,
  },
  {
    id: "ae-support",
    company_id: COMPANY_ID,
    name: "Customer Support Agent",
    role_type: "support",
    system_prompt:
      "You are the AI Customer Support Agent. Resolve customer issues, answer product questions, and escalate anything you cannot confirm from company records.",
    permissions: { search_crm: true, send_email: false },
    is_active: true,
    created_at: "2026-06-15T09:02:00Z",
    updated_at: NOW,
  },
  {
    id: "ae-finance",
    company_id: COMPANY_ID,
    name: "Finance Assistant",
    role_type: "finance",
    system_prompt:
      "You are the AI Finance Assistant. Handle invoices, payment tracking, and expense questions. Never state a figure you have not retrieved from a tool.",
    permissions: { search_crm: true, generate_invoice: false },
    is_active: true,
    created_at: "2026-06-15T09:04:00Z",
    updated_at: NOW,
  },
  {
    id: "ae-hr",
    company_id: COMPANY_ID,
    name: "HR Assistant",
    role_type: "hr",
    system_prompt:
      "You are the AI HR Assistant. Answer policy questions, help with onboarding, and draft internal communications. Defer anything involving personal employee data to a human manager.",
    permissions: { search_crm: false },
    is_active: false,
    created_at: "2026-06-15T09:06:00Z",
    updated_at: NOW,
  },
  {
    id: "ae-executive",
    company_id: COMPANY_ID,
    name: "Executive Assistant",
    role_type: "executive",
    system_prompt:
      "You are the AI Executive Assistant. Coordinate multi-step business tasks across email, calendar, CRM, and reporting. Break requests into steps and confirm before acting on anything irreversible.",
    permissions: { search_crm: true, create_meeting: false, send_email: false },
    is_active: true,
    created_at: "2026-06-15T09:08:00Z",
    updated_at: NOW,
  },
];

/**
 * Canned agent reply used when the AI service has no POST /chat yet.
 * Deliberately says so, rather than imitating a real model answer.
 */
export function previewChatResponse(agentName: string, message: string): ChatResponse {
  return {
    response:
      `[Preview reply — the AI service does not expose POST /chat yet]\n\n` +
      `The ${agentName} agent is implemented in ai/app/agents/ and its tool-calling loop ` +
      `is ready, but Member 1 still needs to wire it to an HTTP endpoint. Once ` +
      `POST /chat is live, this panel will show the real agent response and any ` +
      `tools it called.\n\nYour message was: "${message}"`,
    tool_calls: [],
  };
}
