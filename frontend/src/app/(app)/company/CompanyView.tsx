"use client";

/**
 * Company & plan.
 *
 * There is no GET /api/v1/companies/me yet, so the workspace name, tier and
 * limits are not knowable. What IS knowable is the company id on the signed-in
 * user, and the pricing tiers themselves — those come from the product spec
 * (EmployeeOS.md), not from invented records.
 */

import Link from "next/link";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  cn,
} from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PLAN_LIMITS, PRICING_TIERS } from "@/lib/types";

export function CompanyView() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader
        title="Company & plan"
        description="Workspace identity and the subscription tiers that govern seats, AI usage, and storage."
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warn/25 bg-warn/[0.06] px-4 py-3">
        <Badge tone="warn">Partial</Badge>
        <p className="flex-1 text-xs leading-relaxed text-ink-muted">
          The backend has no{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink">
            GET /api/v1/companies/me
          </code>{" "}
          endpoint, so this workspace&apos;s name, current tier and usage limits
          cannot be read. The plans below are the tiers defined in the product
          spec, shown for reference — not this company&apos;s subscription. See
          the{" "}
          <Link href="/system" className="text-accent hover:underline">
            API contract
          </Link>
          .
        </p>
      </div>

      <Card>
        <CardHeader
          title="Workspace"
          description="What the session genuinely knows."
          action={<Badge tone="ok">Live</Badge>}
        />
        <CardBody>
          <dl className="grid gap-5 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-[11px] text-ink-faint">Company ID</dt>
              <dd
                className="mt-1 truncate font-mono text-[11px] text-ink"
                title={user?.company_id}
              >
                {user?.company_id ?? "—"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] text-ink-faint">Your role</dt>
              <dd className="mt-1 text-sm capitalize text-ink">
                {user?.role ?? "—"}
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Plans"
          description="Tiers from the PricingTier enum, with the limits defined in the product spec."
          action={<Badge>Reference</Badge>}
        />
        <CardBody className="grid gap-4 lg:grid-cols-3">
          {PRICING_TIERS.map((tier) => {
            const p = PLAN_LIMITS[tier];
            return (
              <div
                key={tier}
                className={cn(
                  "flex flex-col rounded-xl border border-line-soft bg-canvas/50 px-4 py-4",
                )}
              >
                <p className="text-sm font-semibold text-ink">{p.label}</p>
                <p className="mt-1.5">
                  <span className="text-2xl font-semibold tabular-nums tracking-tight text-ink">
                    ${p.priceUsdPerMonth}
                  </span>
                  <span className="text-[11px] text-ink-faint"> /month</span>
                </p>
                <p className="mt-1 text-[11px] text-ink-muted">{p.idealFor}</p>

                <dl className="mt-3.5 space-y-1.5 border-t border-line-soft pt-3.5 text-[11px]">
                  <Limit
                    label="Users"
                    value={p.maxUsers === null ? "Unlimited" : String(p.maxUsers)}
                  />
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
                    <li
                      key={h}
                      className="flex items-start gap-2 text-[11px] text-ink-muted"
                    >
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

function Limit({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}
