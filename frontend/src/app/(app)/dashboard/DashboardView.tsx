"use client";

/**
 * Dashboard — the console landing page.
 *
 * Mixes genuinely live data (service health from the two /health endpoints)
 * with model-backed views that are still on preview fixtures. Each block is
 * labelled so the distinction is visible at a glance.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  Skeleton,
  StatusDot,
  cn,
} from "@/components/ui/primitives";
import {
  IconChat,
  IconChevronRight,
  IconRefresh,
  IconRobot,
  IconUsers,
} from "@/components/ui/icons";
import { checkAllServices } from "@/lib/api/system";
import { listAIEmployees } from "@/lib/api/employees";
import { getCurrentCompany, listUsers } from "@/lib/api/organisation";
import { PLAN_LIMITS, type AIEmployee, type Company, type ServiceHealth, type User } from "@/lib/types";
import type { Sourced } from "@/lib/api/client";

export function DashboardView() {
  const [services, setServices] = useState<ServiceHealth[] | null>(null);
  const [employees, setEmployees] = useState<Sourced<AIEmployee[]> | null>(null);
  const [users, setUsers] = useState<Sourced<User[]> | null>(null);
  const [company, setCompany] = useState<Sourced<Company> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadAll() {
    setRefreshing(true);
    const [svc, emp, usr, cmp] = await Promise.all([
      checkAllServices(),
      listAIEmployees(),
      listUsers(),
      getCurrentCompany(),
    ]);
    setServices(svc);
    setEmployees(emp);
    setUsers(usr);
    setCompany(cmp);
    setRefreshing(false);
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const activeEmployees = employees?.data.filter((e) => e.is_active).length ?? 0;
  const activeUsers = users?.data.filter((u) => u.is_active).length ?? 0;
  const plan = company ? PLAN_LIMITS[company.data.pricing_tier] : null;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Current state of the AI Employee OS platform: service health, the AI workforce, and your organisation."
        action={
          <Button onClick={() => void loadAll()} disabled={refreshing}>
            <IconRefresh className={cn("size-3.5", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing" : "Refresh"}
          </Button>
        }
      />

      {/* --------------------------- Stat row --------------------------- */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Services online"
          value={
            services
              ? `${services.filter((s) => s.state === "online").length}/${services.length}`
              : null
          }
          hint="Backend API + AI service"
          tone="live"
        />
        <StatCard
          label="Active AI employees"
          value={employees ? `${activeEmployees}/${employees.data.length}` : null}
          hint="Agents available to handle work"
          tone={employees?.source === "live" ? "live" : "preview"}
        />
        <StatCard
          label="Active team members"
          value={users ? `${activeUsers}/${users.data.length}` : null}
          hint={
            company ? `Seat limit: ${company.data.max_users}` : "Human users in the workspace"
          }
          tone={users?.source === "live" ? "live" : "preview"}
        />
        <StatCard
          label="Current plan"
          value={plan ? plan.label : null}
          hint={plan ? `$${plan.priceUsdPerMonth}/month` : "Subscription tier"}
          tone={company?.source === "live" ? "live" : "preview"}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ------------------------ Service health ---------------------- */}
        <Card className="lg:col-span-1">
          <CardHeader
            title="Service health"
            description="Polled from live endpoints."
            action={<Badge tone="ok">Live</Badge>}
          />
          <CardBody className="space-y-3">
            {services === null
              ? [0, 1].map((i) => <Skeleton key={i} className="h-14 w-full" />)
              : services.map((svc) => (
                  <div
                    key={svc.key}
                    className="flex items-start justify-between gap-3 rounded-lg border border-line-soft bg-canvas/50 px-3 py-2.5"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <StatusDot tone={svc.state === "online" ? "ok" : "danger"} />
                        <p className="text-xs font-medium text-ink">{svc.name}</p>
                      </div>
                      <p className="truncate font-mono text-[10px] text-ink-faint">
                        {svc.baseUrl}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-ink-muted">
                      {svc.state === "online" ? `${svc.latencyMs} ms` : "offline"}
                    </span>
                  </div>
                ))}
            <Link
              href="/system"
              className="flex items-center gap-1 pt-1 text-[11px] font-medium text-accent hover:underline"
            >
              Open system status <IconChevronRight className="size-3" />
            </Link>
          </CardBody>
        </Card>

        {/* ------------------------ AI workforce ------------------------ */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="AI workforce"
            description="AI employees configured for this company."
            action={
              <Badge tone={employees?.source === "live" ? "ok" : "warn"}>
                {employees?.source === "live" ? "Live" : "Preview"}
              </Badge>
            }
          />
          <CardBody className="space-y-2">
            {employees === null
              ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)
              : employees.data.slice(0, 5).map((emp) => (
                  <Link
                    key={emp.id}
                    href={`/employees/${emp.id}`}
                    className="group flex items-center gap-3 rounded-lg border border-line-soft bg-canvas/50 px-3 py-2.5 transition hover:border-accent/30"
                  >
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-ink-muted group-hover:text-accent">
                      <IconRobot className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink">{emp.name}</p>
                      <p className="truncate text-[11px] capitalize text-ink-faint">
                        {emp.role_type}
                      </p>
                    </div>
                    <Badge tone={emp.is_active ? "ok" : "neutral"}>
                      {emp.is_active ? "Active" : "Paused"}
                    </Badge>
                    <IconChevronRight className="size-3.5 shrink-0 text-ink-faint group-hover:text-accent" />
                  </Link>
                ))}
          </CardBody>
        </Card>
      </div>

      {/* --------------------------- Quick links ------------------------- */}
      <section className="grid gap-4 sm:grid-cols-3">
        <QuickLink
          href="/chat"
          icon={<IconChat className="size-4" />}
          title="Talk to an assistant"
          body="Send a request to any of the five implemented AI employees."
        />
        <QuickLink
          href="/employees"
          icon={<IconRobot className="size-4" />}
          title="Manage AI employees"
          body="Configure roles, system prompts, and tool permissions."
        />
        <QuickLink
          href="/team"
          icon={<IconUsers className="size-4" />}
          title="Manage the team"
          body="Review human users, their roles, and seat usage."
        />
      </section>

      {/* ------------------------- Build progress ------------------------ */}
      <Card>
        <CardHeader
          title="Delivery progress"
          description="Frontend scope against the backend that exists today."
        />
        <CardBody className="space-y-4">
          <ProgressBar label="Phase 1 — foundation & built-backend UI" percent={30} tone="accent" />
          <ProgressBar label="Phase 2 — full product surface" percent={0} tone="muted" />
          <p className="text-[11px] leading-relaxed text-ink-muted">
            Phase 1 covers every model and endpoint currently in the repository:
            the two health services, the Company / User / AIEmployee models, and
            the five agents in <code className="font-mono text-ink">ai/app/agents/</code>.
            Phase 2 begins when the backend exposes CRUD, auth, and the chat
            endpoint. See <code className="font-mono text-ink">frontend/PHASES.md</code>.
          </p>
        </CardBody>
      </Card>
    </>
  );
}

/* --------------------------- Sub-components --------------------------- */

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | null;
  hint: string;
  tone: "live" | "preview";
}) {
  return (
    <Card className="animate-fade-up">
      <CardBody className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            {label}
          </p>
          <span
            className={cn(
              "size-1.5 rounded-full",
              tone === "live" ? "bg-ok" : "bg-warn",
            )}
            title={tone === "live" ? "Live data" : "Preview data"}
          />
        </div>
        {value === null ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <p className="text-2xl font-semibold tracking-tight text-ink">{value}</p>
        )}
        <p className="text-[11px] text-ink-muted">{hint}</p>
      </CardBody>
    </Card>
  );
}

function QuickLink({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-line bg-surface/70 px-4 py-4 transition hover:border-accent/40"
    >
      <div className="mb-2.5 grid size-8 place-items-center rounded-lg border border-line bg-surface-2 text-ink-muted transition group-hover:border-accent/40 group-hover:text-accent">
        {icon}
      </div>
      <p className="text-xs font-medium text-ink">{title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{body}</p>
    </Link>
  );
}

function ProgressBar({
  label,
  percent,
  tone,
}: {
  label: string;
  percent: number;
  tone: "accent" | "muted";
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-ink-muted">{label}</span>
        <span className="font-mono text-ink">{percent}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            tone === "accent" ? "bg-accent" : "bg-line",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
