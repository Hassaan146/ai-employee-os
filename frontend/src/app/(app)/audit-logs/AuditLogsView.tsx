"use client";

/**
 * Audit logs — live against backend/app/api/audit_logs.py.
 *
 * Records both human and AI actors. The actor type is called out prominently
 * because "which of these actions did an AI take on our behalf" is the main
 * question this page exists to answer.
 */

import { Fragment, useCallback, useEffect, useState } from "react";
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
  cn,
} from "@/components/ui/primitives";
import { IconRefresh } from "@/components/ui/icons";
import { ErrorNotice } from "@/components/ErrorNotice";
import { getAuditStats, listAuditLogs } from "@/lib/api/operations";
import type { AuditLog, AuditStats } from "@/lib/types";

export function AuditLogsView() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [actorType, setActorType] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [l, s] = await Promise.all([
        listAuditLogs({
          actor_type: actorType,
          status,
          search: search.trim() || undefined,
          limit: 200,
        }),
        getAuditStats(),
      ]);
      setLogs(l);
      setStats(s);
    } catch (err) {
      setError(err);
      setLogs([]);
    } finally {
      setBusy(false);
    }
  }, [actorType, status, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Audit logs"
        description="Every action taken in this workspace, by people and by AI employees."
        action={
          <Button onClick={() => void load()} disabled={busy}>
            <IconRefresh className={cn("size-3.5", busy && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {error ? <ErrorNotice error={error} onRetry={() => void load()} /> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total events" value={stats ? String(stats.total) : null} />
        <Stat label="Succeeded" value={stats ? String(stats.success_count) : null} />
        <Stat label="Failed" value={stats ? String(stats.failure_count) : null} />
        <Stat
          label="Success rate"
          value={stats ? `${Math.round(stats.success_rate * 100)}%` : null}
        />
      </section>

      {stats && Object.keys(stats.by_actor_type).length > 0 ? (
        <Card>
          <CardHeader
            title="Who is acting"
            description="Split between human users and AI employees."
          />
          <CardBody className="flex flex-wrap gap-2">
            {Object.entries(stats.by_actor_type).map(([type, n]) => (
              <Badge key={type} tone={type === "ai" ? "accent" : "info"}>
                {type}: {n}
              </Badge>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <Field label="Search" htmlFor="audit-search">
            <Input
              id="audit-search"
              placeholder="Action, resource, or actor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
        </div>
        <div className="w-40">
          <Field label="Actor" htmlFor="audit-actor">
            <Select
              id="audit-actor"
              value={actorType}
              onChange={(e) => setActorType(e.target.value)}
            >
              <option value="all">All actors</option>
              <option value="user">User</option>
              <option value="ai">AI</option>
              <option value="system">System</option>
            </Select>
          </Field>
        </div>
        <div className="w-40">
          <Field label="Status" htmlFor="audit-status">
            <Select
              id="audit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </Select>
          </Field>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Event log"
          description={logs ? `${logs.length} events` : "Loading…"}
          action={<Badge tone="ok">Live</Badge>}
        />

        {logs === null ? (
          <CardBody className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </CardBody>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No matching events"
            description="Actions are recorded automatically as people and AI employees work."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-xs">
              <thead>
                <tr className="border-b border-line-soft text-[10px] uppercase tracking-wider text-ink-faint">
                  <th scope="col" className="px-5 py-3 font-medium">When</th>
                  <th scope="col" className="px-5 py-3 font-medium">Actor</th>
                  <th scope="col" className="px-5 py-3 font-medium">Action</th>
                  <th scope="col" className="px-5 py-3 font-medium">Resource</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 font-medium text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {logs.map((log) => (
                  <Fragment key={log.id}>
                    <tr className="transition hover:bg-surface-2/40">
                      <td className="px-5 py-3 tabular-nums text-ink-muted">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Badge tone={log.actor_type === "ai" ? "accent" : "info"}>
                            {log.actor_type}
                          </Badge>
                          <span className="truncate text-ink-muted">
                            {log.actor_name ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-[11px] text-ink">
                        {log.action}
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{log.resource_type}</td>
                      <td className="px-5 py-3">
                        <Badge tone={log.status === "success" ? "ok" : "danger"}>
                          {log.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          variant="ghost"
                          aria-expanded={expanded === log.id}
                          onClick={() =>
                            setExpanded(expanded === log.id ? null : log.id)
                          }
                        >
                          {expanded === log.id ? "Hide" : "View"}
                        </Button>
                      </td>
                    </tr>
                    {expanded === log.id ? (
                      <tr>
                        <td colSpan={6} className="bg-canvas/60 px-5 py-3">
                          <pre className="overflow-x-auto rounded-lg border border-line-soft bg-canvas px-3 py-2.5 font-mono text-[10px] leading-relaxed text-ink-muted">
                            {JSON.stringify(
                              {
                                id: log.id,
                                resource_id: log.resource_id,
                                ip_address: log.ip_address,
                                details: log.details,
                              },
                              null,
                              2,
                            )}
                          </pre>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <Card>
      <CardBody className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
          {label}
        </p>
        {value === null ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {value}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
