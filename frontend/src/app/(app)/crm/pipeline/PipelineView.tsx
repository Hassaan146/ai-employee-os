"use client";

/**
 * Sales pipeline board — live against backend/app/api/pipeline.py.
 *
 * The backend enforces ALLOWED_TRANSITIONS (backend/app/core/pipeline_rules.py)
 * and returns 400 for an illegal move. The board mirrors that table so illegal
 * moves are never offered in the first place — but the request can still fail
 * if someone else moved the record, and that error is surfaced rather than
 * swallowed.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  Skeleton,
  cn,
} from "@/components/ui/primitives";
import { IconRefresh } from "@/components/ui/icons";
import { ErrorNotice } from "@/components/ErrorNotice";
import { listLeads, listPipeline, updatePipelineEntry } from "@/lib/api/crm";
import {
  ALLOWED_STAGE_TRANSITIONS,
  PIPELINE_STAGES,
  type Lead,
  type PipelineEntry,
  type PipelineStage,
} from "@/lib/types";

const STAGE_ACCENT: Record<PipelineStage, string> = {
  new: "border-t-ink-faint",
  contacted: "border-t-info",
  qualified: "border-t-info",
  proposal: "border-t-warn",
  negotiation: "border-t-warn",
  won: "border-t-ok",
  lost: "border-t-danger",
};

export function PipelineView() {
  const [entries, setEntries] = useState<PipelineEntry[] | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, l] = await Promise.all([listPipeline(), listLeads()]);
      setEntries(p);
      setLeads(l);
    } catch (err) {
      setError(err);
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const leadName = useCallback(
    (id: string) => leads.find((l) => l.id === id)?.name ?? `Lead ${id.slice(0, 8)}`,
    [leads],
  );

  const byStage = useMemo(() => {
    const map = new Map<PipelineStage, PipelineEntry[]>();
    PIPELINE_STAGES.forEach((s) => map.set(s, []));
    (entries ?? []).forEach((e) => {
      const stage = (e.stage ?? "new") as PipelineStage;
      if (map.has(stage)) map.get(stage)!.push(e);
    });
    return map;
  }, [entries]);

  async function move(entry: PipelineEntry, to: PipelineStage) {
    setMovingId(entry.id);
    setError(null);
    try {
      const updated = await updatePipelineEntry(entry.id, { stage: to });
      setEntries((prev) =>
        prev ? prev.map((e) => (e.id === updated.id ? updated : e)) : prev,
      );
    } catch (err) {
      setError(err);
      // Re-sync from the server so the board never shows a move that failed.
      void load();
    } finally {
      setMovingId(null);
    }
  }

  const totalOpen = (entries ?? []).filter(
    (e) => e.stage !== "won" && e.stage !== "lost",
  ).length;

  return (
    <>
      <PageHeader
        title="Sales pipeline"
        description="Opportunities by stage. Stage moves follow the transition rules enforced by the backend."
        action={
          <Button onClick={() => void load()} disabled={movingId !== null}>
            <IconRefresh className="size-3.5" />
            Refresh
          </Button>
        }
      />

      {error ? <ErrorNotice error={error} onRetry={() => void load()} /> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <Tile label="Open opportunities" value={entries ? String(totalOpen) : null} />
        <Tile
          label="Won"
          value={entries ? String(byStage.get("won")?.length ?? 0) : null}
        />
        <Tile
          label="Lost"
          value={entries ? String(byStage.get("lost")?.length ?? 0) : null}
        />
      </section>

      {entries === null ? (
        <div className="grid gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <EmptyState
            title="No pipeline entries yet"
            description="Pipeline entries are created against a lead. Add one from the leads page to see it on the board."
          />
        </Card>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {PIPELINE_STAGES.map((stage) => {
              const items = byStage.get(stage) ?? [];
              return (
                <div key={stage} className="w-64 shrink-0">
                  <div
                    className={cn(
                      "rounded-xl border border-line border-t-2 bg-surface/70",
                      STAGE_ACCENT[stage],
                    )}
                  >
                    <div className="flex items-center justify-between border-b border-line-soft px-3.5 py-2.5">
                      <p className="text-xs font-medium capitalize text-ink">{stage}</p>
                      <Badge>{items.length}</Badge>
                    </div>

                    <div className="min-h-24 space-y-2 p-2.5">
                      {items.length === 0 ? (
                        <p className="px-1 py-3 text-center text-[11px] text-ink-faint">
                          Empty
                        </p>
                      ) : (
                        items.map((entry) => (
                          <PipelineCard
                            key={entry.id}
                            entry={entry}
                            stage={stage}
                            leadName={leadName(entry.lead_id)}
                            moving={movingId === entry.id}
                            onMove={(to) => void move(entry, to)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Card>
        <CardHeader
          title="Stage rules"
          description="Mirrors ALLOWED_TRANSITIONS in backend/app/core/pipeline_rules.py."
        />
        <CardBody className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE_STAGES.map((s) => (
            <div
              key={s}
              className="rounded-lg border border-line-soft bg-canvas/50 px-3 py-2.5"
            >
              <p className="text-[11px] font-medium capitalize text-ink">{s}</p>
              <p className="mt-1 text-[11px] text-ink-muted">
                {ALLOWED_STAGE_TRANSITIONS[s].length === 0
                  ? "Final stage — no further moves"
                  : `→ ${ALLOWED_STAGE_TRANSITIONS[s].join(", ")}`}
              </p>
            </div>
          ))}
        </CardBody>
      </Card>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string | null }) {
  return (
    <Card>
      <CardBody className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
          {label}
        </p>
        {value === null ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <p className="text-2xl font-semibold tracking-tight text-ink">{value}</p>
        )}
      </CardBody>
    </Card>
  );
}

function PipelineCard({
  entry,
  stage,
  leadName,
  moving,
  onMove,
}: {
  entry: PipelineEntry;
  stage: PipelineStage;
  leadName: string;
  moving: boolean;
  onMove: (to: PipelineStage) => void;
}) {
  const allowed = ALLOWED_STAGE_TRANSITIONS[stage];

  return (
    <div
      className={cn(
        "rounded-lg border border-line-soft bg-canvas/60 px-3 py-2.5 transition",
        moving && "opacity-50",
      )}
    >
      <p className="truncate text-xs font-medium text-ink">{leadName}</p>

      <dl className="mt-1.5 space-y-0.5 text-[10px]">
        {entry.probability != null ? (
          <div className="flex justify-between gap-2">
            <dt className="text-ink-faint">Probability</dt>
            <dd className="text-ink">{entry.probability}%</dd>
          </div>
        ) : null}
        {entry.expected_close_date ? (
          <div className="flex justify-between gap-2">
            <dt className="text-ink-faint">Close</dt>
            <dd className="text-ink">
              {new Date(entry.expected_close_date).toLocaleDateString()}
            </dd>
          </div>
        ) : null}
      </dl>

      {entry.notes ? (
        <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-ink-muted">
          {entry.notes}
        </p>
      ) : null}

      {allowed.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-line-soft pt-2">
          {allowed.map((to) => (
            <button
              key={to}
              type="button"
              disabled={moving}
              onClick={() => onMove(to)}
              className="rounded border border-line px-1.5 py-0.5 text-[10px] capitalize text-ink-muted transition hover:border-accent/40 hover:text-accent disabled:opacity-50"
            >
              → {to}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 border-t border-line-soft pt-2 text-[10px] text-ink-faint">
          Final stage
        </p>
      )}
    </div>
  );
}
