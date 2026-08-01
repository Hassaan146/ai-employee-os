"use client";

/**
 * Live service indicator in the top bar. Polls the two health endpoints that
 * genuinely exist today (backend /health, ai /api/health) every 30 seconds.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { checkAllServices } from "@/lib/api/system";
import type { ServiceHealth } from "@/lib/types";
import { StatusDot } from "@/components/ui/primitives";

const POLL_INTERVAL_MS = 30_000;

export function ServiceStatusPill() {
  const [services, setServices] = useState<ServiceHealth[] | null>(null);

  const refresh = useCallback(async () => {
    setServices(await checkAllServices());
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const online = services?.filter((s) => s.state === "online").length ?? 0;
  const total = services?.length ?? 2;
  const allUp = services !== null && online === total;
  const allDown = services !== null && online === 0;

  const label =
    services === null
      ? "Checking services…"
      : allUp
        ? "All services online"
        : `${online}/${total} services online`;

  return (
    <Link
      href="/system"
      className="flex items-center gap-2 rounded-full border border-line bg-surface-2/70 px-3 py-1.5 text-[11px] text-ink-muted transition hover:border-accent/40 hover:text-ink"
      title="Open system status"
    >
      <StatusDot
        tone={services === null ? "neutral" : allUp ? "ok" : allDown ? "danger" : "warn"}
        pulse={allUp}
      />
      <span>{label}</span>
    </Link>
  );
}
