import { ServiceStatusPill } from "@/components/layout/ServiceStatusPill";

/**
 * Top bar. The account block is presentational: the backend has a User model
 * but no auth endpoints yet, so there is no real session to read from.
 */
export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-line bg-surface/40 px-5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
          v0.1.0 · phase 1
        </span>
      </div>

      <div className="flex items-center gap-3">
        <ServiceStatusPill />
        <div className="flex items-center gap-2.5 border-l border-line pl-3">
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-xs font-medium text-ink">Amara Osei</p>
            <p className="text-[10px] text-ink-faint">Admin · demo account</p>
          </div>
          <div className="grid size-8 place-items-center rounded-full border border-accent/30 bg-accent/10 text-xs font-semibold text-accent">
            AO
          </div>
        </div>
      </div>
    </header>
  );
}
