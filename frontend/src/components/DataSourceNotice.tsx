/**
 * Banner shown whenever a page is rendering preview fixtures instead of live
 * backend data. Its whole job is to make sure nobody reviewing the UI mistakes
 * placeholder records for real ones.
 */

import { Badge } from "@/components/ui/primitives";

export function DataSourceNotice({
  endpoint,
  reason,
}: {
  /** The endpoint the page tried to call, e.g. "GET /api/v1/users". */
  endpoint: string;
  reason?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warn/25 bg-warn/[0.06] px-4 py-3">
      <Badge tone="warn">Preview data</Badge>
      <p className="text-xs leading-relaxed text-ink-muted">
        <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink">
          {endpoint}
        </code>{" "}
        is not implemented on the backend yet, so this view is showing local
        fixtures. It will switch to live data automatically once the endpoint
        exists.
        {reason ? (
          <span className="text-ink-faint"> ({reason})</span>
        ) : null}
      </p>
    </div>
  );
}

/** Inline counterpart for tight spaces such as table headers. */
export function PreviewTag() {
  return <Badge tone="warn">Preview</Badge>;
}

export function LiveTag() {
  return <Badge tone="ok">Live</Badge>;
}
