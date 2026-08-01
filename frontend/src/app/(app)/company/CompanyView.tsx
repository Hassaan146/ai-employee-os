"use client";

/**
 * Company & plan — maps to backend/app/models/company.py
 * (name, pricing_tier, max_users, max_ai_requests, max_storage_gb).
 *
 * The plan comparison uses the tiers defined in EmployeeOS.md so the pricing
 * shown in the product matches the spec.
 */

import { useEffect, useState } from "react";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  Skeleton,
  cn,
} from "@/components/ui/primitives";
import { DataSourceNotice } from "@/components/DataSourceNotice";
import { getCurrentCompany, listUsers } from "@/lib/api/organisation";
import { listAIEmployees } from "@/lib/api/employees";
import {
  PLAN_LIMITS,
  PRICING_TIERS,
  type AIEmployee,
  type Company,
  type User,
} from "@/lib/types";
import type { Sourced } from "@/lib/api/client";

export function CompanyView() {
  const [company, setCompany] = useState<Sourced<Company> | null>(null);
  const [users, setUsers] = useState<Sourced<User[]> | null>(null);
  const [employees, setEmployees] = useState<Sourced<AIEmployee[]> | null>(null);

  useEffect(() => {
    void getCurrentCompany().then(setCompany);
    void listUsers().then(setUsers);
    void listAIEmployees().then(setEmployees);
  }, []);

  if (company === null) {
    return (
      <>
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </>
    );
  }

  const c = company.data;
  const plan = PLAN_LIMITS[c.pricing_tier];
  const activeUsers = users?.data.filter((u) => u.is_active).length ?? 0;
  const activeEmployees = employees?.data.filter((e) => e.is_active).length ?? 0;

  return (
    <>
      <PageHeader
        title="Company & plan"
        description="Workspace details and the subscription limits that govern seats, AI usage, and storage."
      />

      {company.source === "preview" ? (
        <DataSourceNotice endpoint="GET /api/v1/companies/me" reason={company.reason} />
      ) : null}

      {/* ---------------------------- Profile ----------------------------- */}
      <Card>
        <CardHeader
          title="Workspace"
          description="Maps to the Company record."
          action={
            <Badge tone="accent" className="capitalize">
              {plan.label} plan
            </Badge>
          }
        />
        <CardBody>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Company name" value={c.name} />
            <Detail label="Plan" value={`${plan.label} · $${plan.priceUsdPerMonth}/mo`} />
            <Detail
              label="Created"
              value={new Date(c.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            />
            <Detail label="Company ID" value={c.id} mono />
          </dl>
        </CardBody>
      </Card>

      {/* ----------------------------- Usage ------------------------------ */}
      <section className="grid gap-4 sm:grid-cols-3">
        <UsageCard
          label="Seats"
          used={activeUsers}
          limit={c.max_users}
          unit="users"
          note="Active human users in the workspace."
        />
        <UsageCard
          label="AI requests"
          used={null}
          limit={c.max_ai_requests}
          unit="req / month"
          note="Metering lands with the usage service in Phase 2."
        />
        <UsageCard
          label="Storage"
          used={null}
          limit={c.max_storage_gb}
          unit="GB"
          note="Reported once document storage is connected."
        />
      </section>

      <Card>
        <CardHeader
          title="AI workforce"
          description="AI employees configured against this company."
        />
        <CardBody>
          <p className="text-2xl font-semibold tracking-tight text-ink">
            {activeEmployees}
            <span className="text-sm font-normal text-ink-faint">
              {" "}
              active of {employees?.data.length ?? 0} configured
            </span>
          </p>
        </CardBody>
      </Card>

      {/* -------------------------- Plan compare -------------------------- */}
      <Card>
        <CardHeader
          title="Plans"
          description="Tiers from the PricingTier enum, with the limits defined in the product spec."
        />
        <CardBody className="grid gap-4 lg:grid-cols-3">
          {PRICING_TIERS.map((tier) => {
            const p = PLAN_LIMITS[tier];
            const current = tier === c.pricing_tier;
            return (
              <div
                key={tier}
                className={cn(
                  "flex flex-col rounded-xl border px-4 py-4 transition",
                  current
                    ? "border-accent/40 bg-accent/[0.06]"
                    : "border-line-soft bg-canvas/50",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{p.label}</p>
                  {current ? <Badge tone="accent">Current</Badge> : null}
                </div>
                <p className="mt-1.5">
                  <span className="text-2xl font-semibold tracking-tight text-ink">
                    ${p.priceUsdPerMonth}
                  </span>
                  <span className="text-[11px] text-ink-faint"> /month</span>
                </p>
                <p className="mt-1 text-[11px] text-ink-muted">{p.idealFor}</p>

                <dl className="mt-3.5 space-y-1.5 border-t border-line-soft pt-3.5 text-[11px]">
                  <Limit label="Users" value={p.maxUsers === null ? "Unlimited" : String(p.maxUsers)} />
                  <Limit
                    label="AI requests"
                    value={
                      p.maxAiRequests === null
                        ? "Unlimited"
                        : `${p.maxAiRequests.toLocaleString()} / mo`
                    }
                  />
                  <Limit label="Storage" value={`${p.maxStorageGb} GB`} />
                </dl>

                <ul className="mt-3.5 space-y-1.5 border-t border-line-soft pt-3.5">
                  {p.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-[11px] text-ink-muted">
                      <svg
                        viewBox="0 0 24 24"
                        className="mt-0.5 size-3 shrink-0 text-accent"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </>
  );
}

/* --------------------------- Sub-components --------------------------- */

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-ink-faint">{label}</dt>
      <dd
        className={cn(
          "mt-1 truncate text-sm text-ink",
          mono && "font-mono text-[11px]",
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function Limit({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function UsageCard({
  label,
  used,
  limit,
  unit,
  note,
}: {
  label: string;
  /** null when the backend does not report this metric yet. */
  used: number | null;
  limit: number;
  unit: string;
  note: string;
}) {
  const pct = used !== null && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <Card>
      <CardBody className="space-y-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
          {label}
        </p>
        <p className="text-xl font-semibold tracking-tight text-ink">
          {used === null ? (
            <span className="text-ink-faint">—</span>
          ) : (
            used.toLocaleString()
          )}
          <span className="text-xs font-normal text-ink-faint">
            {" "}
            / {limit.toLocaleString()} {unit}
          </span>
        </p>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuenow={used ?? 0}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-label={`${label} usage`}
        >
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] leading-relaxed text-ink-muted">{note}</p>
      </CardBody>
    </Card>
  );
}
