"use client";

/**
 * Dashboard — the console landing page.
 *
 * Rebuilt to run on live data. It previously showed preview fixtures and a
 * build-progress panel, which made sense when almost nothing was wired; now
 * that reports, CRM, invoices and tasks are all live, it surfaces the actual
 * state of the business instead.
 */

import { useCallback, useEffect, useState } from "react";
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
  IconChart,
  IconChevronRight,
  IconRefresh,
  IconTarget,
  IconUsers,
} from "@/components/ui/icons";
import { ErrorNotice } from "@/components/ErrorNotice";
import { checkAllServices } from "@/lib/api/system";
import { listCustomers, listLeads } from "@/lib/api/crm";
import {
  getProductivityReport,
  getSalesReport,
  listInvoices,
  listTasks,
} from "@/lib/api/operations";
import { useAuth } from "@/lib/auth/AuthProvider";
import { money, shortDate } from "@/lib/format";
import type {
  Invoice,
  ProductivityReport,
  SalesReport,
  ServiceHealth,
  Task,
} from "@/lib/types";

export function DashboardView() {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceHealth[] | null>(null);
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [productivity, setProductivity] = useState<ProductivityReport | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [counts, setCounts] = useState<{ customers: number; leads: number } | null>(
    null,
  );
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);

    // Health is independent of the data calls and must not be blocked by them.
    void checkAllServices().then(setServices);

    try {
      const [s, p, inv, tk, cus, lds] = await Promise.all([
        getSalesReport("all"),
        getProductivityReport(),
        listInvoices(),
        listTasks({ page_size: 100 }),
        listCustomers(),
        listLeads(),
      ]);
      setSales(s);
      setProductivity(p);
      setInvoices(inv);
      setTasks(tk.items);
      setCounts({ customers: cus.length, leads: lds.length });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openInvoices = invoices
    .filter((i) => i.status !== "paid" && i.status !== "cancelled")
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

  // Tasks with no due date sort last rather than first.
  const openTasks = tasks
    .filter((t) => t.status !== "done" && t.status !== "cancelled")
    .sort((a, b) => (a.due_date ?? "￿").localeCompare(b.due_date ?? "￿"));

  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Live position across sales, billing, and work in progress."
        action={
          <Button onClick={() => void load()} disabled={busy}>
            <IconRefresh className={cn("size-3.5", busy && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {error ? <ErrorNotice error={error} onRetry={() => void load()} /> : null}

      {/* ---------------------------- Headline ---------------------------- */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Invoiced"
          value={sales ? money(sales.invoices.total_amount) : null}
          hint={sales ? `${sales.invoices.total} invoice(s)` : undefined}
        />
        <Stat
          label="Collected"
          value={sales ? money(sales.invoices.collected) : null}
          hint="Payments received"
        />
        <Stat
          label="Outstanding"
          value={sales ? money(sales.invoices.outstanding) : null}
          hint="Awaiting payment"
          tone={sales && sales.invoices.outstanding > 0 ? "warn" : undefined}
        />
        <Stat
          label="Task completion"
          value={
            productivity
              ? `${Math.round(productivity.tasks.completion_rate * 100)}%`
              : null
          }
          hint={
            productivity
              ? `${productivity.tasks.done}/${productivity.tasks.total} done`
              : undefined
          }
        />
      </section>

      {/* ------------------------------ CRM ------------------------------- */}
      <section className="grid gap-4 sm:grid-cols-3">
        <MiniLink
          href="/crm/customers"
          icon={<IconUsers className="size-4" />}
          label="Customers"
          value={counts ? String(counts.customers) : null}
        />
        <MiniLink
          href="/crm/leads"
          icon={<IconTarget className="size-4" />}
          label="Leads"
          value={counts ? String(counts.leads) : null}
        />
        <MiniLink
          href="/reports"
          icon={<IconChart className="size-4" />}
          label="Quotations"
          value={sales ? String(sales.quotations.total) : null}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ------------------------ Needs attention ----------------------- */}
        <Card>
          <CardHeader
            title="Invoices awaiting payment"
            description="Unpaid invoices, soonest due first."
            action={<Badge tone="ok">Live</Badge>}
          />
          <CardBody className="space-y-2">
            {sales === null ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : openInvoices.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-muted">
                Nothing outstanding — every invoice is settled.
              </p>
            ) : (
              openInvoices.slice(0, 5).map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line-soft bg-canvas/50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[11px] text-ink">
                      {inv.invoice_number}
                    </p>
                    <p className="text-[10px] text-ink-faint">
                      due {shortDate(inv.due_date)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums text-xs text-ink">
                      {money(inv.total_amount - inv.amount_paid, inv.currency)}
                    </span>
                    <Badge tone={inv.status === "overdue" ? "danger" : "warn"}>
                      {inv.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))
            )}
            <Link
              href="/invoices"
              className="flex items-center gap-1 pt-1 text-[11px] font-medium text-accent hover:underline"
            >
              All invoices <IconChevronRight className="size-3" />
            </Link>
          </CardBody>
        </Card>

        {/* --------------------------- Open work -------------------------- */}
        <Card>
          <CardHeader
            title="Open tasks"
            description="Work in progress, soonest due first."
            action={<Badge tone="ok">Live</Badge>}
          />
          <CardBody className="space-y-2">
            {productivity === null ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : openTasks.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-muted">No open tasks.</p>
            ) : (
              openTasks.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line-soft bg-canvas/50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs text-ink">{t.title}</p>
                    <p className="text-[10px] text-ink-faint">
                      {t.due_date ? `due ${shortDate(t.due_date)}` : "no due date"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {t.is_ai_generated ? <Badge tone="accent">AI</Badge> : null}
                    <Badge
                      tone={
                        t.priority === "urgent"
                          ? "danger"
                          : t.priority === "high"
                            ? "warn"
                            : "neutral"
                      }
                    >
                      {t.priority}
                    </Badge>
                  </div>
                </div>
              ))
            )}
            <Link
              href="/tasks"
              className="flex items-center gap-1 pt-1 text-[11px] font-medium text-accent hover:underline"
            >
              All tasks <IconChevronRight className="size-3" />
            </Link>
          </CardBody>
        </Card>
      </div>

      {/* --------------------------- Service health ------------------------ */}
      <Card>
        <CardHeader
          title="Service health"
          description="Polled from the live health endpoints."
          action={
            <Link
              href="/system"
              className="text-[11px] font-medium text-accent hover:underline"
            >
              System status
            </Link>
          }
        />
        <CardBody className="grid gap-3 sm:grid-cols-2">
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
        </CardBody>
      </Card>
    </>
  );
}

/* --------------------------- Sub-components --------------------------- */

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | null;
  hint?: string;
  tone?: "warn";
}) {
  return (
    <Card className="animate-fade-up">
      <CardBody className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
          {label}
        </p>
        {value === null ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums tracking-tight",
              tone === "warn" ? "text-warn" : "text-ink",
            )}
          >
            {value}
          </p>
        )}
        {hint ? <p className="text-[11px] text-ink-muted">{hint}</p> : null}
      </CardBody>
    </Card>
  );
}

function MiniLink({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-line bg-surface/70 px-4 py-3.5 transition hover:border-accent/40"
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-ink-muted transition group-hover:border-accent/40 group-hover:text-accent">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-ink-faint">{label}</p>
        {value === null ? (
          <Skeleton className="mt-1 h-6 w-12" />
        ) : (
          <p className="text-xl font-semibold tabular-nums tracking-tight text-ink">
            {value}
          </p>
        )}
      </div>
      <IconChevronRight className="size-3.5 shrink-0 text-ink-faint group-hover:text-accent" />
    </Link>
  );
}
