"use client";

/**
 * AI employees.
 *
 * Shows the agent modules that genuinely exist in ai/app/agents/, cross-checked
 * against the tools the backend's central AI router reports at GET /ai/tools.
 *
 * This page used to render invented AIEmployee records from a fixture file.
 * The model exists but has no CRUD routes, so there was nothing real to read —
 * and next to a live session that fake data was actively misleading. It now
 * shows the capability that actually ships, and says plainly that saving
 * per-company configuration needs the backend routes.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
} from "@/components/ui/primitives";
import { IconChevronRight, IconRobot, IconTool } from "@/components/ui/icons";
import { listAiTools } from "@/lib/api/operations";
import { AGENT_MODULES, ROLES_WITHOUT_MODULE } from "@/lib/agents";

export function EmployeesView() {
  /** Tools the backend router will actually execute, read live. */
  const [executableTools, setExecutableTools] = useState<string[] | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    listAiTools()
      .then((r) => setExecutableTools(r.tools))
      // A failure here only removes the "executable" badge; the roster is
      // still accurate, so it is not worth an error banner.
      .catch(() => setExecutableTools([]));
  }, []);

  const shown = AGENT_MODULES.filter((a) => {
    if (roleFilter !== "all" && a.id !== roleFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      a.label.toLowerCase().includes(q) ||
      a.id.includes(q) ||
      a.tools.some((t) => t.includes(q))
    );
  });

  return (
    <>
      <PageHeader
        title="AI employees"
        description="The specialised agents this platform can assign work to, and the tools each one may call."
      />

      <div className="rounded-lg border border-info/25 bg-info/[0.06] px-4 py-3">
        <Badge tone="info">Read-only</Badge>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
          These are the agent modules present in{" "}
          <code className="font-mono text-ink">ai/app/agents/</code>. Creating and
          editing per-company AI employees needs{" "}
          <code className="font-mono text-ink">/api/v1/ai-employees</code>, which
          the backend has not built — the model exists, the routes do not. This
          page will switch to saved records when they land.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <Field label="Search" htmlFor="emp-search">
            <Input
              id="emp-search"
              placeholder="Role or tool…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
        </div>
        <div className="w-48">
          <Field label="Role" htmlFor="emp-role">
            <Select
              id="emp-role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All roles</option>
              {AGENT_MODULES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((agent) => (
          <Card key={agent.id} className="group flex flex-col animate-fade-up">
            <CardBody className="flex-1 space-y-3">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-ink-muted group-hover:text-accent">
                  <IconRobot className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {agent.label}
                  </p>
                  <p className="text-[11px] capitalize text-ink-faint">{agent.id}</p>
                </div>
                <Badge tone="accent">Module ready</Badge>
              </div>

              <p className="text-[11px] leading-relaxed text-ink-muted">
                {agent.blurb}
              </p>

              <div className="space-y-1.5 border-t border-line-soft pt-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                  Tools ({agent.tools.length})
                </p>
                {agent.tools.length === 0 ? (
                  <p className="text-[11px] text-ink-faint">
                    Answers from prompt and knowledge only — calls no tools.
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {agent.tools.map((t) => {
                      const executable = executableTools?.includes(t);
                      return (
                        <li key={t}>
                          <span
                            title={
                              executable
                                ? "The backend AI router can execute this tool"
                                : "Defined on the agent; not in the backend execution registry"
                            }
                            className="inline-flex items-center gap-1 rounded border border-line bg-canvas/60 px-1.5 py-0.5 font-mono text-[10px] text-ink-muted"
                          >
                            <IconTool className="size-3 text-ink-faint" />
                            {t}
                            {executableTools === null ? null : executable ? (
                              <span className="text-ok" aria-label="executable">
                                ●
                              </span>
                            ) : (
                              <span className="text-warn" aria-label="not executable">
                                ○
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <p className="font-mono text-[10px] text-ink-faint">{agent.source}</p>
            </CardBody>

            <div className="border-t border-line-soft px-5 py-3">
              <Link
                href={`/employees/${agent.id}`}
                className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
              >
                View details <IconChevronRight className="size-3" />
              </Link>
            </div>
          </Card>
        ))}
      </section>

      {/* -------------------- Legend + unimplemented roles ------------------ */}
      <Card>
        <CardHeader
          title="Tool execution"
          description="Whether the backend's central AI router can actually run each tool."
        />
        <CardBody className="space-y-3">
          {executableTools === null ? (
            <Skeleton className="h-6 w-64" />
          ) : (
            <>
              <div className="flex flex-wrap gap-3 text-[11px] text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <span className="text-ok">●</span> executable via{" "}
                  <code className="font-mono text-ink">POST /ai/execute</code>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-warn">○</span> defined on the agent only
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {executableTools.map((t) => (
                  <Badge key={t} tone="ok" className="font-mono">
                    {t}
                  </Badge>
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-ink-muted">
                Run any of these from the{" "}
                <Link href="/ai-actions" className="text-accent hover:underline">
                  AI actions
                </Link>{" "}
                page.
              </p>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Roles without a module"
          description="Present in the AIRoleType enum, but no agent implements them yet."
        />
        <CardBody className="flex flex-wrap gap-2">
          {ROLES_WITHOUT_MODULE.map((r) => (
            <Badge key={r} tone="warn" className="capitalize">
              {r}
            </Badge>
          ))}
        </CardBody>
      </Card>
    </>
  );
}
