"use client";

/**
 * AI employee detail.
 *
 * Read-only, for the same reason as the list: the AIEmployee model has no CRUD
 * routes, so there is nothing to load or save. This shows what the agent module
 * in ai/app/agents/ actually declares, and marks each tool with whether the
 * backend's AI router can execute it.
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
  PageHeader,
  Skeleton,
} from "@/components/ui/primitives";
import { IconChevronRight, IconRobot, IconTool } from "@/components/ui/icons";
import { listAiTools } from "@/lib/api/operations";
import { AGENT_MODULES } from "@/lib/agents";

export function EmployeeDetailView({ id }: { id: string }) {
  const [executableTools, setExecutableTools] = useState<string[] | null>(null);
  const agent = AGENT_MODULES.find((a) => a.id === id);

  useEffect(() => {
    listAiTools()
      .then((r) => setExecutableTools(r.tools))
      .catch(() => setExecutableTools([]));
  }, []);

  if (!agent) {
    return (
      <Card>
        <EmptyState
          title="No such AI employee"
          description={`No agent module is registered for "${id}".`}
          action={
            <Link href="/employees">
              <Button variant="primary">Back to AI employees</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-[11px] text-ink-faint"
      >
        <Link href="/employees" className="hover:text-ink">
          AI employees
        </Link>
        <IconChevronRight className="size-3" />
        <span className="text-ink-muted">{agent.label}</span>
      </nav>

      <PageHeader
        title={agent.label}
        description={agent.blurb}
        action={<Badge tone="accent">Module ready</Badge>}
      />

      <div className="rounded-lg border border-info/25 bg-info/[0.06] px-4 py-3">
        <Badge tone="info">Read-only</Badge>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
          Editing the persona and permissions needs{" "}
          <code className="font-mono text-ink">PATCH /api/v1/ai-employees/&#123;id&#125;</code>
          , which does not exist yet. What you see below is read from the agent
          module in the repository.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Tools"
            description="Declared in the agent's tool_names, checked against the backend router."
          />
          <CardBody className="space-y-2">
            {agent.tools.length === 0 ? (
              <p className="text-xs text-ink-muted">
                This agent calls no tools — it answers from its prompt and the
                knowledge base only.
              </p>
            ) : (
              agent.tools.map((t) => {
                const executable = executableTools?.includes(t);
                return (
                  <div
                    key={t}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line-soft bg-canvas/50 px-3 py-2.5"
                  >
                    <span className="flex items-center gap-2">
                      <IconTool className="size-3.5 text-ink-faint" />
                      <code className="font-mono text-[11px] text-ink">{t}</code>
                    </span>
                    {executableTools === null ? (
                      <Skeleton className="h-4 w-20" />
                    ) : executable ? (
                      <Badge tone="ok">Executable</Badge>
                    ) : (
                      <Badge tone="warn">Agent-only</Badge>
                    )}
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Module" description="Where this agent is defined." />
            <CardBody>
              <dl className="space-y-2.5 text-[11px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-faint">Role id</dt>
                  <dd className="font-mono text-ink">{agent.id}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-faint">Tools</dt>
                  <dd className="tabular-nums text-ink">{agent.tools.length}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-ink-faint">Source</dt>
                  <dd className="break-all font-mono text-[10px] text-ink">
                    {agent.source}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Run its tools" description="Via the AI router." />
            <CardBody className="space-y-3">
              <p className="text-[11px] leading-relaxed text-ink-muted">
                Executable tools can be run directly against your workspace data.
              </p>
              <Link href="/ai-actions">
                <Button variant="primary" className="w-full">
                  <IconRobot className="size-3.5" />
                  Open AI actions
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
