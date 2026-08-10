"use client";

/**
 * Reports — live against backend/app/api/reports.py.
 *
 * Sales, revenue, and productivity are implemented. Expense analytics is not:
 * the endpoint returns an error saying it needs an Expense model that does not
 * exist yet, so that card reports the gap instead of rendering zeros that would
 * read as "no expenses".
 */

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  PageHeader,
  Select,
  Skeleton,
  cn,
} from "@/components/ui/primitives";
import { IconRefresh } from "@/components/ui/icons";
import { ErrorNotice } from "@/components/ErrorNotice";
import {
  getExpenseReport,
  getProductivityReport,
  getRevenueReport,
  getSalesReport,
} from "@/lib/api/operations";
import { money } from "@/lib/format";
import {
  REPORT_PERIODS,
  type ProductivityReport,
  type RevenueReport,
  type SalesReport,
  type StatusBucket,
} from "@/lib/types";

export function ReportsView() {
  const [period, setPeriod] = useState("all");
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [productivity, setProductivity] = useState<ProductivityReport | null>(null);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [s, r, p] = await Promise.all([
        getSalesReport(period),
        getRevenueReport(period),
        getProductivityReport(),
      ]);
      setSales(s);
      setRevenue(r);
      setProductivity(p);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }

    // Expense is expected to fail today — capture the reason, don't treat it
    // as a page-level error.
    try {
      await getExpenseReport();
      setExpenseError(null);
    } catch (err) {
      setExpenseError(
        err instanceof Error ? err.message : "Expense analytics unavailable",
      );
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Sales, revenue, and productivity analytics across the workspace."
        action={
          <Button onClick={() => void load()} disabled={busy}>
            <IconRefresh className={cn("size-3.5", busy && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {error ? <ErrorNotice error={error} onRetry={() => void load()} /> : null}

      <div className="w-44">
        <Field label="Period" htmlFor="rep-period">
          <Select
            id="rep-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {REPORT_PERIODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {/* ------------------------------ Revenue ----------------------------- */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total revenue"
          value={revenue ? money(revenue.total_revenue) : null}
        />
        <Stat
          label="Collected"
          value={revenue ? money(revenue.total_collected) : null}
        />
        <Stat
          label="Outstanding"
          value={sales ? money(sales.invoices.outstanding) : null}
        />
        <Stat
          label="Invoices"
          value={sales ? String(sales.invoices.total) : null}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ------------------------------ Sales ----------------------------- */}
        <Card>
          <CardHeader
            title="Sales"
            description="Invoice and quotation totals for the selected period."
            action={<Badge tone="ok">Live</Badge>}
          />
          <CardBody className="space-y-4">
            {sales === null ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <Breakdown
                  title="Invoices"
                  rows={[
                    ["Total", String(sales.invoices.total)],
                    ["Value", money(sales.invoices.total_amount)],
                    ["Collected", money(sales.invoices.collected)],
                    ["Outstanding", money(sales.invoices.outstanding)],
                  ]}
                />
                <StatusBars
                  title="Invoices by status"
                  data={sales.invoices.by_status}
                />
                <Breakdown
                  title="Quotations"
                  rows={[
                    ["Total", String(sales.quotations.total)],
                    ["Value", money(sales.quotations.total_amount)],
                  ]}
                />
                <StatusBars
                  title="Quotations by status"
                  data={sales.quotations.by_status}
                />
              </>
            )}
          </CardBody>
        </Card>

        {/* --------------------------- Productivity -------------------------- */}
        <Card>
          <CardHeader
            title="Productivity"
            description="Task, meeting, and action-item completion."
            action={<Badge tone="ok">Live</Badge>}
          />
          <CardBody className="space-y-4">
            {productivity === null ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted">Task completion</span>
                    <span className="font-mono tabular-nums text-ink">
                      {Math.round(productivity.tasks.completion_rate * 100)}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-surface-2"
                    role="progressbar"
                    aria-valuenow={Math.round(productivity.tasks.completion_rate * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Task completion rate"
                  >
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{
                        width: `${Math.min(100, productivity.tasks.completion_rate * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <Breakdown
                  title="Tasks"
                  rows={[
                    ["Total", String(productivity.tasks.total)],
                    ["Done", String(productivity.tasks.done)],
                  ]}
                />
                <CountBars
                  title="Tasks by status"
                  data={productivity.tasks.by_status}
                />
                <Breakdown
                  title="Meetings"
                  rows={[
                    ["Total", String(productivity.meetings.total)],
                    ["Completed", String(productivity.meetings.completed)],
                  ]}
                />
                <Breakdown
                  title="Action items"
                  rows={[
                    ["Total", String(productivity.action_items.total)],
                    ["Completed", String(productivity.action_items.completed)],
                  ]}
                />
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* --------------------------- Monthly revenue ------------------------- */}
      <Card>
        <CardHeader
          title="Monthly revenue"
          description="Revenue and collections by month."
        />
        <CardBody>
          {revenue === null ? (
            <Skeleton className="h-24 w-full" />
          ) : revenue.monthly.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-muted">
              No revenue recorded for this period yet.
            </p>
          ) : (
            <MonthlyChart monthly={revenue.monthly} />
          )}
        </CardBody>
      </Card>

      {/* ------------------------------ Top customers ----------------------- */}
      <Card>
        <CardHeader title="Top customers" description="Ranked by invoiced value." />
        <CardBody>
          {sales === null ? (
            <Skeleton className="h-20 w-full" />
          ) : sales.top_customers.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-muted">
              No customer revenue recorded yet.
            </p>
          ) : (
            <ol className="space-y-2">
              {sales.top_customers.map((c, i) => (
                <li
                  key={`${c.name ?? "customer"}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line-soft bg-canvas/50 px-3 py-2.5"
                >
                  <span className="flex items-center gap-2.5 text-xs">
                    <span className="grid size-5 place-items-center rounded bg-surface-2 font-mono text-[10px] text-ink-faint">
                      {i + 1}
                    </span>
                    <span className="text-ink">{c.name ?? "Unnamed"}</span>
                  </span>
                  <span className="tabular-nums text-xs text-ink">
                    {money(c.total_amount ?? 0)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>

      {/* -------------------------------- Expense --------------------------- */}
      <Card>
        <CardHeader
          title="Expenses"
          description="Expense analytics."
          action={<Badge tone="warn">Not available</Badge>}
        />
        <CardBody>
          <p className="text-xs leading-relaxed text-ink-muted">
            The backend does not implement expense analytics yet — it needs an
            Expense model that has not been built. This card will populate
            automatically once{" "}
            <code className="font-mono text-ink">GET /api/v1/reports/expense</code>{" "}
            returns data.
          </p>
          {expenseError ? (
            <p className="mt-2 font-mono text-[10px] text-ink-faint">{expenseError}</p>
          ) : null}
        </CardBody>
      </Card>
    </>
  );
}

/* --------------------------- Sub-components --------------------------- */

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <Card>
      <CardBody className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
          {label}
        </p>
        {value === null ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {value}
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function Breakdown({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div>
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
        {title}
      </h3>
      <dl className="mt-1.5 space-y-1 text-[11px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="tabular-nums text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Horizontal bars for a by_status map. Each bucket carries both a count and a
 * currency total, and both are labelled — the bar length alone never has to
 * carry the meaning.
 */
function StatusBars({
  title,
  data,
}: {
  title: string;
  data: Record<string, StatusBucket>;
}) {
  const entries = Object.entries(data ?? {});
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map(([, v]) => v?.count ?? 0), 1);

  return (
    <div>
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
        {title}
      </h3>
      <ul className="mt-1.5 space-y-1.5">
        {entries.map(([status, bucket]) => (
          <li key={status} className="space-y-1">
            <div className="flex justify-between gap-3 text-[11px]">
              <span className="capitalize text-ink-muted">
                {status.replace("_", " ")}
              </span>
              <span className="tabular-nums text-ink">
                {bucket?.count ?? 0}
                <span className="text-ink-faint"> · {money(bucket?.total ?? 0)}</span>
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent/70"
                style={{ width: `${((bucket?.count ?? 0) / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Monthly revenue as a bar pair. Values are labelled directly rather than
 * relying on colour alone, so the chart is readable without distinguishing
 * the two hues.
 */
function MonthlyChart({
  monthly,
}: {
  monthly: { month?: string; total_amount?: number; collected?: number }[];
}) {
  const max = Math.max(...monthly.map((m) => m.total_amount ?? 0), 1);

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-[10px]">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-accent" /> Invoiced
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-info" /> Collected
        </span>
      </div>
      <ul className="space-y-2.5">
        {monthly.map((m, i) => (
          <li key={m.month ?? i} className="space-y-1">
            <div className="flex justify-between gap-3 text-[11px]">
              <span className="text-ink-muted">{m.month ?? "—"}</span>
              <span className="tabular-nums text-ink">
                {money(m.total_amount ?? 0)}
                <span className="text-ink-faint">
                  {" "}
                  · {money(m.collected ?? 0)} collected
                </span>
              </span>
            </div>
            <div className="space-y-0.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${((m.total_amount ?? 0) / max) * 100}%` }}
                />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-info"
                  style={{ width: `${((m.collected ?? 0) / max) * 100}%` }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Bars for a plain count map. The productivity report returns counts here,
 * unlike the sales report which returns {count, total} buckets — the two are
 * deliberately separate components so a shape change fails to compile rather
 * than rendering NaN widths.
 */
function CountBars({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data ?? {});
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div>
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
        {title}
      </h3>
      <ul className="mt-1.5 space-y-1.5">
        {entries.map(([status, count]) => (
          <li key={status} className="space-y-1">
            <div className="flex justify-between gap-3 text-[11px]">
              <span className="capitalize text-ink-muted">
                {status.replace("_", " ")}
              </span>
              <span className="tabular-nums text-ink">{count}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent/70"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
