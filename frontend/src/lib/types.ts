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

/* ------------------------------------------------------------------ */
/* Auth — backend/app/api/auth.py + schemas/user.py, auth.py           */
/* ------------------------------------------------------------------ */

/** Subset of User returned by the auth endpoints (no hashed_password). */
export interface AuthUser {
  id: string;
  company_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
}

/** Response of POST /auth/login and POST /auth/register. */
export interface AuthToken {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name?: string | null;
  /** Optional; backend derives "<name>'s Business" when omitted. */
  company_name?: string | null;
}

/* ------------------------------------------------------------------ */
/* CRM — backend/app/models/{customer,lead,sales_pipeline,activity}    */
/* ------------------------------------------------------------------ */

/**
 * Pipeline stages, mirroring VALID_STAGES in backend/app/core/pipeline_rules.py.
 * Order matters — the board renders columns in this sequence.
 */
export const PIPELINE_STAGES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/**
 * Legal stage moves, mirroring ALLOWED_TRANSITIONS in pipeline_rules.py.
 * The UI uses this to disable illegal moves up front instead of letting the
 * user attempt one and collecting a 400.
 */
export const ALLOWED_STAGE_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  new: ["contacted", "lost"],
  contacted: ["qualified", "lost"],
  qualified: ["proposal", "lost"],
  proposal: ["negotiation", "lost"],
  negotiation: ["won", "lost"],
  won: [],
  lost: [],
};

export function isValidStageTransition(
  from: PipelineStage,
  to: PipelineStage,
): boolean {
  if (from === to) return true;
  return ALLOWED_STAGE_TRANSITIONS[from].includes(to);
}

/**
 * CRM ids are UUID strings. They were integers in the first CRM cut; the
 * tenant-isolation work on `secondary` moved every table to UUID keys.
 */
export interface Customer {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  address: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
}

export type CustomerDraft = Pick<
  Customer,
  "name" | "email" | "phone" | "company_name" | "address" | "status"
>;

export interface Lead {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  stage: string | null;
  value: number | null;
  customer_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string | null;
}

export type LeadDraft = Pick<
  Lead,
  "name" | "email" | "phone" | "source" | "stage" | "value" | "assigned_to"
>;

export interface PipelineEntry {
  id: string;
  company_id: string;
  lead_id: string;
  stage: string | null;
  previous_stage: string | null;
  probability: number | null;
  expected_close_date: string | null;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Activity {
  id: string;
  company_id: string;
  activity_type: string;
  description: string | null;
  lead_id: string | null;
  customer_id: string | null;
  performed_by: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Tasks — backend/app/api/tasks.py, models/task.py                    */
/* ------------------------------------------------------------------ */

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "blocked",
  "done",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  assigned_to_id: string | null;
  customer_id: string | null;
  created_by_id: string | null;
  completed_at: string | null;
  reminder_sent: boolean;
  /** True when an AI employee created the task rather than a person. */
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export type TaskDraft = Pick<
  Task,
  "title" | "description" | "priority" | "status" | "due_date" | "customer_id"
>;

/** GET /tasks is paginated, unlike the CRM collections. */
export interface TaskListResponse {
  total: number;
  page: number;
  page_size: number;
  items: Task[];
}

/* ------------------------------------------------------------------ */
/* Invoices — backend/app/api/invoices.py, models/invoice.py           */
/* ------------------------------------------------------------------ */

export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "paid",
  "partially_paid",
  "overdue",
  "cancelled",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

/** What the client sends; the backend computes line_total and all totals. */
export interface LineItemDraft {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface Invoice {
  id: string;
  company_id: string;
  customer_id: string;
  invoice_number: string;
  status: string;
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  discount_percent: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  currency: string;
  notes: string | null;
  due_date: string | null;
  issue_date: string;
  created_at: string;
  line_items?: LineItem[];
}

export interface InvoiceDraft {
  customer_id: string;
  line_items: LineItemDraft[];
  tax_percent?: number | null;
  discount_percent?: number | null;
  currency?: string | null;
  due_date?: string | null;
  notes?: string | null;
}

/* ------------------------------------------------------------------ */
/* Quotations — backend/app/api/quotations.py                          */
/* ------------------------------------------------------------------ */

export const QUOTATION_STATUSES = [
  "draft",
  "sent",
  "approved",
  "rejected",
  "expired",
  "converted",
] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export interface Quotation {
  id: string;
  company_id: string;
  customer_id: string;
  created_by_id: string | null;
  quotation_number: string;
  currency: string;
  status: QuotationStatus;
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  discount_percent: number;
  discount_amount: number;
  total_amount: number;
  valid_until: string | null;
  approved_at: string | null;
  approved_by_id: string | null;
  /** Set once the quotation has been turned into an invoice. */
  converted_invoice_id: string | null;
  notes: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  line_items?: LineItem[];
}

export interface QuotationDraft {
  customer_id: string;
  quotation_number: string;
  currency?: string;
  tax_percent?: number;
  discount_percent?: number;
  valid_until?: string | null;
  notes?: string | null;
  line_items?: LineItemDraft[];
}

/* ------------------------------------------------------------------ */
/* Documents — backend/app/api/documents.py, models/document.py        */
/* ------------------------------------------------------------------ */

export const DOCUMENT_TYPES = [
  "contract",
  "invoice_attachment",
  "policy",
  "id_proof",
  "other",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_STATUSES = [
  "uploaded",
  "processing",
  "ocr_complete",
  "failed",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface StoredDocument {
  id: string;
  company_id: string;
  uploaded_by_id: string | null;
  customer_id: string | null;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  document_type: string;
  status: string;
  extracted_text: string | null;
  ai_summary: string | null;
  is_searchable: boolean;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Meetings — backend/app/api/meetings.py, models/meeting.py           */
/* ------------------------------------------------------------------ */

export const MEETING_STATUSES = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export interface MeetingActionItem {
  id: string;
  meeting_id: string;
  description: string;
  assigned_to_id: string | null;
  deadline: string | null;
  is_completed: boolean;
  /** Set when the action item has been promoted into a real Task. */
  linked_task_id: string | null;
}

export interface MeetingSpeakerLog {
  id: string;
  meeting_id: string;
  speaker_label: string;
  start_time_seconds: number | null;
  end_time_seconds: number | null;
  text: string | null;
}

export interface Meeting {
  id: string;
  company_id: string;
  customer_id: string | null;
  organized_by_id: string | null;
  title: string;
  status: MeetingStatus;
  scheduled_at: string | null;
  duration_minutes: number | null;
  transcript_text: string | null;
  ai_summary: string | null;
  recording_url: string | null;
  created_at: string;
  updated_at: string;
  speakers?: MeetingSpeakerLog[];
  action_items?: MeetingActionItem[];
}

export interface MeetingDraft {
  title: string;
  scheduled_at?: string | null;
  duration_minutes?: number | null;
  customer_id?: string | null;
}

/* ------------------------------------------------------------------ */
/* Reports — backend/app/api/reports.py                                */
/* ------------------------------------------------------------------ */

export const REPORT_PERIODS = ["all", "today", "week", "month", "year"] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

/**
 * Each by_status entry is an object, not a count — verified against a live
 * response: {"paid": {"count": 1, "total": 31350.0}}.
 */
export interface StatusBucket {
  count: number;
  total: number;
}

export interface SalesReport {
  period: string;
  invoices: {
    total: number;
    total_amount: number;
    collected: number;
    outstanding: number;
    by_status: Record<string, StatusBucket>;
  };
  quotations: {
    total: number;
    total_amount: number;
    by_status: Record<string, StatusBucket>;
  };
  top_customers: { name?: string; total_amount?: number }[];
}

export interface RevenueReport {
  period: string;
  total_revenue: number;
  total_collected: number;
  monthly: { month?: string; total_amount?: number; collected?: number }[];
}

export interface ProductivityReport {
  tasks: {
    total: number;
    done: number;
    completion_rate: number;
    by_status: Record<string, number>;
    by_user: { assigned_to_id?: string | null; total?: number; done?: number }[];
  };
  meetings: { total: number; completed: number };
  action_items: { total: number; completed: number };
}

/* ------------------------------------------------------------------ */
/* Audit logs — backend/app/api/audit_logs.py                          */
/* ------------------------------------------------------------------ */

export interface AuditLog {
  id: string;
  company_id: string;
  /** "user" or "ai" — who performed the action. */
  actor_type: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: unknown;
  status: string;
  ip_address: string | null;
  created_at: string;
}

export interface AuditStats {
  total: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  by_action: Record<string, number>;
  by_resource: Record<string, number>;
  by_actor_type: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/* WhatsApp — backend/app/api/whatsapp.py                              */
/* ------------------------------------------------------------------ */

export interface WhatsAppMessage {
  id: string;
  from_number: string;
  message_body: string | null;
  /** True when the assistant auto-replied to this message. */
  reply_sent: boolean;
  reply_text: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Email — backend/app/api/email.py                                    */
/* ------------------------------------------------------------------ */

export interface EmailSendRequest {
  to_email: string;
  subject: string;
  body_html: string;
  customer_id?: string | null;
  invoice_id?: string | null;
  quotation_id?: string | null;
}
