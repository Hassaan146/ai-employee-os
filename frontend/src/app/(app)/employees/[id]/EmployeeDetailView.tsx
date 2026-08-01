"use client";

/**
 * AI employee detail — edits every writable column on the AIEmployee model.
 *
 * The permission toggles are generated from the tool registry in
 * ai/app/tools/. Only `search_crm` is implemented today; the rest are listed
 * as planned so the permission model is visible but not misleading.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
  cn,
} from "@/components/ui/primitives";
import { IconChevronRight, IconTool } from "@/components/ui/icons";
import { DataSourceNotice } from "@/components/DataSourceNotice";
import { getAIEmployee, updateAIEmployee } from "@/lib/api/employees";
import {
  AI_ROLE_TYPES,
  IMPLEMENTED_AI_ROLES,
  type AIEmployee,
  type AIRoleType,
} from "@/lib/types";
import type { Sourced } from "@/lib/api/client";

/**
 * Tools an AI employee can be granted. `implemented` reflects what actually
 * exists in ai/app/tools/ — everything else is on the Phase 2 roadmap.
 */
const TOOL_CATALOGUE: {
  key: string;
  label: string;
  description: string;
  implemented: boolean;
}[] = [
  {
    key: "search_crm",
    label: "search_crm",
    description: "Look up a customer record in the CRM by name.",
    implemented: true,
  },
  {
    key: "send_email",
    label: "send_email",
    description: "Draft and send email on the company's behalf.",
    implemented: false,
  },
  {
    key: "create_meeting",
    label: "create_meeting",
    description: "Create a calendar event and invite attendees.",
    implemented: false,
  },
  {
    key: "generate_invoice",
    label: "generate_invoice",
    description: "Produce an invoice PDF and track payment status.",
    implemented: false,
  },
  {
    key: "create_quotation",
    label: "create_quotation",
    description: "Build a branded quotation with tax and discounts.",
    implemented: false,
  },
];

export function EmployeeDetailView({ id }: { id: string }) {
  const [result, setResult] = useState<Sourced<AIEmployee | null> | null>(null);
  const [draft, setDraft] = useState<AIEmployee | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    void getAIEmployee(id).then((res) => {
      setResult(res);
      setDraft(res.data);
    });
  }, [id]);

  const dirty =
    draft !== null &&
    result?.data !== null &&
    result !== null &&
    JSON.stringify(draft) !== JSON.stringify(result.data);

  async function save() {
    if (!draft) return;
    setSaving(true);
    const updated = await updateAIEmployee(draft.id, {
      name: draft.name,
      role_type: draft.role_type,
      system_prompt: draft.system_prompt,
      permissions: draft.permissions,
      is_active: draft.is_active,
    });
    setResult(updated);
    setDraft(updated.data);
    setSavedAt(new Date().toLocaleTimeString());
    setSaving(false);
  }

  if (result === null) {
    return (
      <>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </>
    );
  }

  if (draft === null) {
    return (
      <Card>
        <EmptyState
          title="AI employee not found"
          description={`No AI employee exists with id "${id}".`}
          action={
            <Link href="/employees">
              <Button variant="primary">Back to AI employees</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const hasAgent = IMPLEMENTED_AI_ROLES.includes(draft.role_type);

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[11px] text-ink-faint">
        <Link href="/employees" className="hover:text-ink">
          AI employees
        </Link>
        <IconChevronRight className="size-3" />
        <span className="text-ink-muted">{draft.name}</span>
      </nav>

      <PageHeader
        title={draft.name}
        description="Configure this AI employee's role, persona, and tool permissions."
        action={
          <div className="flex items-center gap-2">
            {savedAt ? (
              <span className="text-[11px] text-ink-faint">Saved at {savedAt}</span>
            ) : null}
            <Button variant="primary" onClick={() => void save()} disabled={!dirty || saving}>
              {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </Button>
          </div>
        }
      />

      {result.source === "preview" ? (
        <DataSourceNotice
          endpoint={`GET /api/v1/ai-employees/${id}`}
          reason={result.reason}
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* --------------------------- Identity --------------------------- */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Identity & persona"
            description="Maps to the name, role_type, and system_prompt columns."
          />
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="emp-name">
                <Input
                  id="emp-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <Field
                label="Role type"
                htmlFor="emp-role-type"
                hint={
                  hasAgent
                    ? "Agent module found in ai/app/agents/."
                    : "No agent module for this role yet."
                }
              >
                <Select
                  id="emp-role-type"
                  value={draft.role_type}
                  onChange={(e) =>
                    setDraft({ ...draft, role_type: e.target.value as AIRoleType })
                  }
                >
                  {AI_ROLE_TYPES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                      {IMPLEMENTED_AI_ROLES.includes(r) ? "" : " (no agent yet)"}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field
              label="System prompt"
              htmlFor="emp-prompt"
              hint="Sent as the system message on every request this employee handles."
            >
              <Textarea
                id="emp-prompt"
                rows={12}
                value={draft.system_prompt ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, system_prompt: e.target.value || null })
                }
                className="font-mono text-[12px]"
              />
            </Field>
          </CardBody>
        </Card>

        {/* ---------------------------- Status ---------------------------- */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Status" description="Maps to is_active." />
            <CardBody className="space-y-3">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                  className="mt-0.5 size-3.5 accent-[var(--color-accent)]"
                />
                <span className="text-xs leading-relaxed text-ink-muted">
                  <span className="block font-medium text-ink">Active</span>
                  Paused employees stay configured but are not offered for new work.
                </span>
              </label>
              <div className="flex items-center gap-2 border-t border-line-soft pt-3">
                <Badge tone={draft.is_active ? "ok" : "neutral"}>
                  {draft.is_active ? "Active" : "Paused"}
                </Badge>
                <Badge tone={hasAgent ? "accent" : "warn"}>
                  {hasAgent ? "Agent ready" : "No agent module"}
                </Badge>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Record" description="Read-only fields." />
            <CardBody>
              <dl className="space-y-2.5 text-[11px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-faint">ID</dt>
                  <dd className="truncate font-mono text-ink">{draft.id}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-faint">Company</dt>
                  <dd className="truncate font-mono text-ink">{draft.company_id}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-faint">Created</dt>
                  <dd className="text-ink">
                    {new Date(draft.created_at).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-faint">Updated</dt>
                  <dd className="text-ink">
                    {new Date(draft.updated_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* -------------------------- Permissions -------------------------- */}
      <Card>
        <CardHeader
          title="Tool permissions"
          description="Which tools this AI employee may call. Maps to the permissions JSON column."
        />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          {TOOL_CATALOGUE.map((tool) => {
            const granted = draft.permissions[tool.key] === true;
            return (
              <label
                key={tool.key}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 transition",
                  granted
                    ? "border-accent/30 bg-accent/[0.06]"
                    : "border-line-soft bg-canvas/50 hover:border-line",
                  !tool.implemented && "opacity-70",
                )}
              >
                <input
                  type="checkbox"
                  checked={granted}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      permissions: {
                        ...draft.permissions,
                        [tool.key]: e.target.checked,
                      },
                    })
                  }
                  className="mt-0.5 size-3.5 shrink-0 accent-[var(--color-accent)]"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <IconTool className="size-3.5 shrink-0 text-ink-faint" />
                    <code className="font-mono text-[11px] font-medium text-ink">
                      {tool.label}
                    </code>
                    {tool.implemented ? (
                      <Badge tone="ok">Implemented</Badge>
                    ) : (
                      <Badge tone="warn">Phase 2</Badge>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed text-ink-muted">
                    {tool.description}
                  </p>
                </div>
              </label>
            );
          })}
        </CardBody>
      </Card>
    </>
  );
}
