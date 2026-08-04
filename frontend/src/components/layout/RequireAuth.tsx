"use client";

/**
 * Route guard for the console shell.
 *
 * Redirects to /login when there is no valid session. While the initial token
 * check runs it renders a placeholder rather than the page, so protected
 * content never flashes before the redirect.
 */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { IconLogo } from "@/components/ui/icons";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || user) return;
    // Preserve where they were heading so login can send them back.
    const next = encodeURIComponent(pathname);
    router.replace(`/login?next=${next}`);
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="relative z-10 grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3">
          <IconLogo className="size-10 animate-pulse" />
          <p className="text-xs text-ink-muted">Restoring your session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect is in flight; render nothing rather than protected content.
    return null;
  }

  return <>{children}</>;
}
