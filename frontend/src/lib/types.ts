/**
 * TypeScript mirrors of the backend data models.
 *
 * Every type here maps 1:1 to a SQLAlchemy model that already exists in the
 * repository. When a model changes on the backend, change it here too — these
 * are the contract between the two services.
 *
 *   Company    -> backend/app/models/company.py
 *   User       -> backend/app/models/user.py
 *   AIEmployee -> backend/app/models/ai_employee.py
 *
 * The chat types map to the AI service contract documented in ai/plan.md.
 */

/* ------------------------------------------------------------------ */
/* Company — backend/app/models/company.py                             */
/* ------------------------------------------------------------------ */

export const PRICING_TIERS = ["basic", "pro", "business"] as const;
export type PricingTier = (typeof PRICING_TIERS)[number];

export interface Company {
  id: string;
  name: string;
  pricing_tier: PricingTier;
  max_users: number;
  max_ai_requests: number;
  max_storage_gb: number;
  created_at: string;
  updated_at: string;
}

/** Plan limits as defined in EmployeeOS.md. Used to render the plan comparison. */
export const PLAN_LIMITS: Record<
  PricingTier,
  {
    label: string;
    priceUsdPerMonth: number;
    maxUsers: number | null;
    maxAiRequests: number | null;
    maxStorageGb: number;
    idealFor: string;
    highlights: string[];
  }
> = {
  basic: {
    label: "Basic",
    priceUsdPerMonth: 19,
    maxUsers: 1,
    maxAiRequests: 500,
    maxStorageGb: 1,
    idealFor: "Freelancers and solo entrepreneurs",
    highlights: [
      "Email drafting",
      "Basic WhatsApp replies",
      "100 invoices / month",
      "100 quotations / month",
      "Basic CRM & reports",
    ],
  },
  pro: {
    label: "Pro",
    priceUsdPerMonth: 49,
    maxUsers: 5,
    maxAiRequests: 10_000,
    maxStorageGb: 20,
    idealFor: "Small businesses and growing teams",
    highlights: [
      "Advanced CRM",
      "WhatsApp automation",
      "Meeting summaries",
      "Task management & calendar",
      "Workflow automation",
    ],
  },
  business: {
    label: "Business",
    priceUsdPerMonth: 149,
    maxUsers: null,
    maxAiRequests: null,
    maxStorageGb: 200,
    idealFor: "Medium and large organizations",
    highlights: [
      "Multiple AI employees",
      "Department-based permissions",
      "API access & ERP integrations",
      "Advanced analytics & audit logs",
      "Single Sign-On (SSO)",
    ],
  },
};

/* ------------------------------------------------------------------ */
/* User — backend/app/models/user.py                                   */
/* ------------------------------------------------------------------ */

export const USER_ROLES = ["admin", "manager", "employee"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: string;
  company_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* AIEmployee — backend/app/models/ai_employee.py                      */
/* ------------------------------------------------------------------ */

export const AI_ROLE_TYPES = [
  "executive",
  "sales",
  "support",
  "hr",
  "finance",
  "accountant",
  "marketing",
  "legal",
] as const;
export type AIRoleType = (typeof AI_ROLE_TYPES)[number];

/**
 * Roles with a live agent implementation in ai/app/agents/.
 * Everything else in AI_ROLE_TYPES exists in the DB enum but has no agent yet,
 * so the UI marks it as not-yet-deployable rather than pretending it works.
 */
export const IMPLEMENTED_AI_ROLES: AIRoleType[] = [
  "sales",
  "support",
  "finance",
  "hr",
  "executive",
];

export interface AIEmployee {
  id: string;
  company_id: string;
  name: string;
  role_type: AIRoleType;
  system_prompt: string | null;
  /** Free-form permission map; shape is owned by the backend. */
  permissions: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AIEmployeeDraft = Pick<
  AIEmployee,
  "name" | "role_type" | "system_prompt" | "permissions" | "is_active"
>;

/* ------------------------------------------------------------------ */
/* Chat — contract from ai/plan.md ("Exposed Interface")               */
/* ------------------------------------------------------------------ */

export interface ChatRequest {
  message: string;
  session_id: string;
  agent: AIRoleType;
}

/** One tool invocation the agent made, as returned by BaseAgent.handle(). */
export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface ChatResponse {
  response: string;
  tool_calls?: ToolCall[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  agent?: AIRoleType;
  toolCalls?: ToolCall[];
  createdAt: string;
  /** True when the reply came from preview fixtures, not a live agent. */
  preview?: boolean;
}

/* ------------------------------------------------------------------ */
/* Service health — the endpoints that are live today                  */
/* ------------------------------------------------------------------ */

export type ServiceState = "online" | "offline" | "checking";

export interface ServiceHealth {
  /** Human label, e.g. "Backend API". */
  name: string;
  /** Which service this is, used for routing detail links. */
  key: "backend" | "ai";
  state: ServiceState;
  baseUrl: string;
  /** Round-trip time in milliseconds, when the check succeeded. */
  latencyMs?: number;
  /** Raw payload the service returned, shown in the system page. */
  payload?: unknown;
  error?: string;
}

export interface ProvidersResponse {
  providers: string[];
}
