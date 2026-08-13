"use client";

/**
 * Team.
 *
 * The backend has a User model but no endpoint that lists users, so this page
 * cannot show the whole team yet. Rather than render invented colleagues, it
 * shows the one user it genuinely knows — the signed-in account from
 * GET /auth/me — and states what is missing.
 */

import Link from "next/link";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
} from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth/AuthProvider";
import { USER_ROLES, type UserRole } from "@/lib/types";

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
  const { user } = useAuth();

  return (
    <>
      <PageHeader
        title="Team"
        description="The people in this workspace and the roles that govern what they can do."
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warn/25 bg-warn/[0.06] px-4 py-3">
        <Badge tone="warn">Partial</Badge>
        <p className="flex-1 text-xs leading-relaxed text-ink-muted">
          The backend has no{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink">
            GET /api/v1/users
          </code>{" "}
          endpoint, so the full roster cannot be listed. Only the signed-in
          account is shown below. This page will list everyone as soon as that
          route exists — see the{" "}
          <Link href="/system" className="text-accent hover:underline">
            API contract
          </Link>
          .
        </p>
      </div>

      <Card>
        <CardHeader
          title="Signed-in account"
          description="From GET /api/v1/auth/me."
          action={<Badge tone="ok">Live</Badge>}
        />
        <CardBody>
          {!user ? (
            <p className="text-xs text-ink-muted">No active session.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-full border border-accent/30 bg-accent/10 text-sm font-semibold text-accent">
                {initials(user.full_name || user.email)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {user.full_name ?? "—"}
                </p>
                <p className="truncate text-[11px] text-ink-faint">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={ROLE_TONE[user.role]} className="capitalize">
                  {user.role}
                </Badge>
                <Badge tone={user.is_active ? "ok" : "neutral"}>
                  {user.is_active ? "Active" : "Deactivated"}
                </Badge>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Roles"
          description="Defined by the UserRole enum in backend/app/models/user.py."
        />
        <CardBody className="grid gap-3 sm:grid-cols-3">
          {USER_ROLES.map((r) => (
            <div
              key={r}
              className="rounded-lg border border-line-soft bg-canvas/50 px-3.5 py-3"
            >
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
