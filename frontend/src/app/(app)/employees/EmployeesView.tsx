"use client";

/**
 * AI employee hub — CRUD surface for backend/app/models/ai_employee.py.
 *
 * Every field on this page maps to a real column: name, role_type,
 * system_prompt, permissions, is_active. Roles without an agent module in
 * ai/app/agents/ are marked so nobody creates an employee that cannot run.
 */

import { useEffect, useMemo, useState } from "react";
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
} from "@/components/ui/primitives";
import { IconChevronRight, IconPlus, IconRobot } from "@/components/ui/icons";
import { DataSourceNotice } from "@/components/DataSourceNotice";
import { createAIEmployee, listAIEmployees } from "@/lib/api/employees";
import {
  AI_ROLE_TYPES,
  IMPLEMENTED_AI_ROLES,
  type AIEmployee,
  type AIRoleType,
} from "@/lib/types";
import type { Sourced } from "@/lib/api/client";

type RoleFilter = "all" | AIRoleType;
type StatusFilter = "all" | "active" | "paused";

export function EmployeesView() {
  const [result, setResult] = useState<Sourced<AIEmployee[]> | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void listAIEmployees().then(setResult);
  }, []);

  const filtered = useMemo(() => {
    if (!result) return [];
    return result.data.filter((emp) => {
      if (roleFilter !== "all" && emp.role_type !== roleFilter) return false;
      if (statusFilter === "active" && !emp.is_active) return false;
      if (statusFilter === "paused" && emp.is_active) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (
          !emp.name.toLowerCase().includes(q) &&
          !emp.role_type.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [result, roleFilter, statusFilter, query]);

  async function handleCreate(draft: Parameters<typeof createAIEmployee>[0]) {
    const created = await createAIEmployee(draft);
    setResult((prev) =>
      prev ? { ...prev, data: [...prev.data, created.data] } : prev,
    );
    setCreating(false);
  }

  return (
    <>
      <PageHeader
        title="AI employees"
        description="Each AI employee is a role with its own system prompt, tool permissions, and memory — the digital workforce this company can assign work to."
        action={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <IconPlus className="size-3.5" />
            New AI employee
          </Button>
        }
      />

      {result?.source === "preview" ? (
        <DataSourceNotice endpoint="GET /api/v1/ai-employees" reason={result.reason} />
      ) : null}

      {/* ----------------------------- Filters ---------------------------- */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <Field label="Search" htmlFor="emp-search">
            <Input
              id="emp-search"
              placeholder="Name or role…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
        </div>
        <div className="w-44">
          <Field label="Role" htmlFor="emp-role">
            <Select
              id="emp-role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            >
              <option value="all">All roles</option>
              {AI_ROLE_TYPES.map((r) => (
                <option key={r} value={r} className="capitalize">
                  {r}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="w-40">
          <Field label="Status" htmlFor="emp-status">
            <Select
              id="emp-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </Select>
          </Field>
        </div>
      </div>

      {/* ------------------------------ Grid ------------------------------ */}
      {result === null ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="No AI employees match these filters"
            description="Adjust the filters above, or create a new AI employee to add capacity to this workspace."
            action={
              <Button variant="primary" onClick={() => setCreating(true)}>
                <IconPlus className="size-3.5" />
                New AI employee
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((emp) => (
            <EmployeeCard key={emp.id} employee={emp} />
          ))}
        </div>
      )}

      {creating ? (
        <CreateEmployeeDialog
          onCancel={() => setCreating(false)}
          onCreate={handleCreate}
        />
      ) : null}
    </>
  );
}

/* ---------------------------- Employee card ---------------------------- */

function EmployeeCard({ employee }: { employee: AIEmployee }) {
  const hasAgent = IMPLEMENTED_AI_ROLES.includes(employee.role_type);
  const grantedTools = Object.entries(employee.permissions).filter(([, v]) => v);

  return (
    <Card className="group flex flex-col animate-fade-up transition hover:border-accent/30">
      <CardBody className="flex-1 space-y-3">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-ink-muted group-hover:text-accent">
            <IconRobot className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{employee.name}</p>
            <p className="text-[11px] capitalize text-ink-faint">{employee.role_type}</p>
          </div>
          <Badge tone={employee.is_active ? "ok" : "neutral"}>
            {employee.is_active ? "Active" : "Paused"}
          </Badge>
        </div>

        <p className="line-clamp-3 text-[11px] leading-relaxed text-ink-muted">
          {employee.system_prompt ?? "No system prompt configured yet."}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          {hasAgent ? (
            <Badge tone="accent">Agent ready</Badge>
          ) : (
            <Badge tone="warn">No agent module</Badge>
          )}
          {grantedTools.length > 0 ? (
            <Badge tone="info">
              {grantedTools.length} tool{grantedTools.length === 1 ? "" : "s"}
            </Badge>
          ) : (
            <Badge>No tools</Badge>
          )}
        </div>
      </CardBody>

      <div className="border-t border-line-soft px-5 py-3">
        <Link
          href={`/employees/${employee.id}`}
          className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
        >
          Configure <IconChevronRight className="size-3" />
        </Link>
      </div>
    </Card>
  );
}

/* --------------------------- Create dialog ----------------------------- */

function CreateEmployeeDialog({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (draft: {
    name: string;
    role_type: AIRoleType;
    system_prompt: string | null;
    permissions: Record<string, boolean>;
    is_active: boolean;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<AIRoleType>("sales");
  const [prompt, setPrompt] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const hasAgent = IMPLEMENTED_AI_ROLES.includes(role);
  const canSave = name.trim().length > 1 && !saving;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    await onCreate({
      name: name.trim(),
      role_type: role,
      system_prompt: prompt.trim() || null,
      permissions: {},
      is_active: active,
    });
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-canvas/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-emp-title"
    >
      <Card className="w-full max-w-lg animate-fade-up shadow-2xl">
        <CardHeader
          title={<span id="create-emp-title">New AI employee</span>}
          description="Creates a record against the AIEmployee model."
        />
        <form onSubmit={submit}>
          <CardBody className="space-y-4">
            <Field label="Name" htmlFor="new-emp-name">
              <Input
                id="new-emp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sales Manager"
                autoFocus
              />
            </Field>

            <Field
              label="Role type"
              htmlFor="new-emp-role"
              hint={
                hasAgent
                  ? "An agent module exists for this role in ai/app/agents/."
                  : "No agent module exists for this role yet — it can be stored, but cannot run."
              }
            >
              <Select
                id="new-emp-role"
                value={role}
                onChange={(e) => setRole(e.target.value as AIRoleType)}
              >
                {AI_ROLE_TYPES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                    {IMPLEMENTED_AI_ROLES.includes(r) ? "" : " (no agent yet)"}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="System prompt"
              htmlFor="new-emp-prompt"
              hint="Persona and guardrails. Optional — can be filled in later."
            >
              <Textarea
                id="new-emp-prompt"
                rows={5}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="You are the AI …"
              />
            </Field>

            <label className="flex cursor-pointer items-center gap-2.5 text-xs text-ink-muted">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="size-3.5 accent-[var(--color-accent)]"
              />
              Activate immediately
            </label>
          </CardBody>

          <div className="flex justify-end gap-2 border-t border-line-soft px-5 py-3.5">
            <Button onClick={onCancel} variant="ghost">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canSave}>
              {saving ? "Creating…" : "Create AI employee"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
