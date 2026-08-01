"use client";

/**
 * Team — human users. Maps to backend/app/models/user.py
 * (email, full_name, role: admin|manager|employee, is_active) and reads the
 * seat limit from the Company model.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
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
import { DataSourceNotice } from "@/components/DataSourceNotice";
import { getCurrentCompany, listUsers } from "@/lib/api/organisation";
import { USER_ROLES, type Company, type User, type UserRole } from "@/lib/types";
import type { Sourced } from "@/lib/api/client";

const ROLE_TONE: Record<UserRole, "accent" | "info" | "neutral"> = {
  admin: "accent",
  manager: "info",
  employee: "neutral",
};

const ROLE_DESCRIPTION: Record<UserRole, string> = {
  admin: "Full access, including billing, AI employee configuration, and user management.",
  manager: "Manages team members and AI employees, but cannot change billing.",
  employee: "Uses AI employees and their own work; no administrative access.",
};

export function TeamView() {
  const [users, setUsers] = useState<Sourced<User[]> | null>(null);
  const [company, setCompany] = useState<Sourced<Company> | null>(null);
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    void listUsers().then(setUsers);
    void getCurrentCompany().then(setCompany);
  }, []);

  const filtered = useMemo(() => {
    if (!users) return [];
    return users.data.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        return (
          u.email.toLowerCase().includes(q) ||
          (u.full_name ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [users, roleFilter, query]);

  const activeCount = users?.data.filter((u) => u.is_active).length ?? 0;
  const seatLimit = company?.data.max_users ?? null;
  const seatsUsedPct =
    seatLimit && seatLimit > 0 ? Math.min(100, (activeCount / seatLimit) * 100) : 0;
  const overSeatLimit = seatLimit !== null && activeCount > seatLimit;

  return (
    <>
      <PageHeader
        title="Team"
        description="The people in this workspace. Roles determine what each person can configure and which AI employees they can direct."
      />

      {users?.source === "preview" ? (
        <DataSourceNotice endpoint="GET /api/v1/users" reason={users.reason} />
      ) : null}

      {/* ---------------------------- Seat usage --------------------------- */}
      <Card>
        <CardHeader
          title="Seat usage"
          description="Active users against the limit for the current plan."
        />
        <CardBody className="space-y-3">
          {users === null || company === null ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-semibold tracking-tight text-ink">
                  {activeCount}
                  <span className="text-sm font-normal text-ink-faint">
                    {" "}
                    / {seatLimit ?? "unlimited"} seats
                  </span>
                </p>
                <Badge tone={overSeatLimit ? "danger" : "ok"}>
                  {overSeatLimit ? "Over limit" : "Within limit"}
                </Badge>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-surface-2"
                role="progressbar"
                aria-valuenow={activeCount}
                aria-valuemin={0}
                aria-valuemax={seatLimit ?? activeCount}
                aria-label="Seat usage"
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    overSeatLimit ? "bg-danger" : "bg-accent",
                  )}
                  style={{ width: `${overSeatLimit ? 100 : seatsUsedPct}%` }}
                />
              </div>
              {overSeatLimit ? (
                <p className="text-[11px] text-danger">
                  More users are active than the plan allows. Upgrade the plan or
                  deactivate a user.
                </p>
              ) : null}
            </>
          )}
        </CardBody>
      </Card>

      {/* ----------------------------- Filters ----------------------------- */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <Field label="Search" htmlFor="team-search">
            <Input
              id="team-search"
              placeholder="Name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
        </div>
        <div className="w-44">
          <Field label="Role" htmlFor="team-role">
            <Select
              id="team-role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as "all" | UserRole)}
            >
              <option value="all">All roles</option>
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      {/* ------------------------------ Table ------------------------------ */}
      <Card>
        {users === null ? (
          <CardBody className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </CardBody>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No users match these filters"
            description="Try a different search term or role."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] text-left text-xs">
              <thead>
                <tr className="border-b border-line-soft text-[10px] uppercase tracking-wider text-ink-faint">
                  <th scope="col" className="px-5 py-3 font-medium">User</th>
                  <th scope="col" className="px-5 py-3 font-medium">Role</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {filtered.map((u) => (
                  <tr key={u.id} className="transition hover:bg-surface-2/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-[10px] font-semibold text-ink-muted">
                          {initials(u.full_name ?? u.email)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">
                            {u.full_name ?? "—"}
                          </p>
                          <p className="truncate text-[11px] text-ink-faint">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={ROLE_TONE[u.role]} className="capitalize">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={u.is_active ? "ok" : "neutral"}>
                        {u.is_active ? "Active" : "Deactivated"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* --------------------------- Role legend --------------------------- */}
      <Card>
        <CardHeader
          title="Roles"
          description="Defined by the UserRole enum in backend/app/models/user.py."
        />
        <CardBody className="grid gap-3 sm:grid-cols-3">
          {USER_ROLES.map((r) => (
            <div key={r} className="rounded-lg border border-line-soft bg-canvas/50 px-3.5 py-3">
              <Badge tone={ROLE_TONE[r]} className="capitalize">
                {r}
              </Badge>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                {ROLE_DESCRIPTION[r]}
              </p>
            </div>
          ))}
        </CardBody>
      </Card>
    </>
  );
}

function initials(source: string): string {
  const parts = source.split(/[\s.@]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}
