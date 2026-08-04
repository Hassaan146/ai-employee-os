"use client";

import { useRouter } from "next/navigation";
import { ServiceStatusPill } from "@/components/layout/ServiceStatusPill";
import { IconLogout } from "@/components/ui/icons";
import { Badge } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth/AuthProvider";

/** Top bar. Shows the signed-in user resolved from GET /auth/me. */
export function Topbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  function handleSignOut() {
    signOut();
    router.replace("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-line bg-surface/40 px-5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
          v0.1.0 · phase 2
        </span>
      </div>

      <div className="flex items-center gap-3">
        <ServiceStatusPill />

        {user ? (
          <div className="flex items-center gap-2.5 border-l border-line pl-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="max-w-40 truncate text-xs font-medium text-ink">
                {user.full_name || user.email}
              </p>
              <p className="text-[10px] capitalize text-ink-faint">{user.role}</p>
            </div>
            <div className="grid size-8 shrink-0 place-items-center rounded-full border border-accent/30 bg-accent/10 text-xs font-semibold text-accent">
              {initials(user.full_name || user.email)}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="rounded-lg p-1.5 text-ink-faint transition hover:bg-surface-2 hover:text-danger"
            >
              <IconLogout className="size-4" />
            </button>
          </div>
        ) : (
          <Badge>Signed out</Badge>
        )}
      </div>
    </header>
  );
}

function initials(source: string): string {
  const parts = source.split(/[\s.@]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}
