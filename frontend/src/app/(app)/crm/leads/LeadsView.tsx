"use client";

/**
 * Leads — live against backend/app/api/leads.py, with the per-lead activity
 * timeline from backend/app/api/activities.py.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
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
import { IconPlus, IconRefresh } from "@/components/ui/icons";
import { ErrorNotice } from "@/components/ErrorNotice";
import {
  createLead,
  deleteLead,
  listLeadActivities,
  listLeads,
  updateLead,
} from "@/lib/api/crm";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  PIPELINE_STAGES,
  type Activity,
  type Lead,
  type LeadDraft,
  type PipelineStage,
} from "@/lib/types";

const STAGE_TONE: Record<string, "ok" | "info" | "warn" | "danger" | "neutral"> = {
  new: "neutral",
  contacted: "info",
  qualified: "info",
  proposal: "warn",
  negotiation: "warn",
  won: "ok",
  lost: "danger",
};

export function LeadsView() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Lead | "new" | null>(null);
  const [timelineFor, setTimelineFor] = useState<Lead | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setLeads(await listLeads());
    } catch (err) {
      setError(err);
      setLeads([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!leads) return [];
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (stageFilter !== "all" && (l.stage ?? "") !== stageFilter) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) || (l.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, query, stageFilter]);

  const totalValue = useMemo(
    () => filtered.reduce((sum, l) => sum + (l.value ?? 0), 0),
    [filtered],
  );

  async function save(draft: LeadDraft, existing: Lead | null) {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      if (existing) {
        const updated = await updateLead(existing.id, draft);
        setLeads((prev) =>
          prev ? prev.map((l) => (l.id === updated.id ? updated : l)) : prev,
        );
      } else {
        const created = await createLead(draft, user.company_id);
        setLeads((prev) => (prev ? [...prev, created] : [created]));
      }
      setEditing(null);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function remove(lead: Lead) {
    setBusy(true);
    setError(null);
    try {
      await deleteLead(lead.id);
      setLeads((prev) => (prev ? prev.filter((l) => l.id !== lead.id) : prev));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Leads"
        description="Prospects moving through the sales process, with their activity history."
        action={
          <div className="flex gap-2">
            <Button onClick={() => void load()} disabled={busy}>
              <IconRefresh className={cn("size-3.5", busy && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="primary" onClick={() => setEditing("new")}>
              <IconPlus className="size-3.5" />
              New lead
            </Button>
          </div>
        }
      />

      {error ? <ErrorNotice error={error} onRetry={() => void load()} /> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Leads shown" value={leads ? String(filtered.length) : null} />
        <StatTile
          label="Pipeline value"
          value={leads ? `$${totalValue.toLocaleString()}` : null}
        />
        <StatTile
          label="Won"
          value={leads ? String(filtered.filter((l) => l.stage === "won").length) : null}
        />
      </section>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <Field label="Search" htmlFor="lead-search">
            <Input
              id="lead-search"
              placeholder="Name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
        </div>
        <div className="w-44">
          <Field label="Stage" htmlFor="lead-stage">
            <Select
              id="lead-stage"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="all">All stages</option>
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      <Card>
        <CardHeader
          title="All leads"
          description={leads ? `${filtered.length} of ${leads.length} shown` : "Loading…"}
          action={<Badge tone="ok">Live</Badge>}
        />

        {leads === null ? (
          <CardBody className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </CardBody>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={leads.length === 0 ? "No leads yet" : "No matches"}
            description={
              leads.length === 0
                ? "Add a lead to start tracking an opportunity."
                : "Try a different search term or stage."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-xs">
              <thead>
                <tr className="border-b border-line-soft text-[10px] uppercase tracking-wider text-ink-faint">
                  <th scope="col" className="px-5 py-3 font-medium">Lead</th>
                  <th scope="col" className="px-5 py-3 font-medium">Source</th>
                  <th scope="col" className="px-5 py-3 font-medium">Stage</th>
                  <th scope="col" className="px-5 py-3 font-medium">Value</th>
                  <th scope="col" className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {filtered.map((l) => (
                  <tr key={l.id} className="transition hover:bg-surface-2/40">
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">{l.name}</p>
                      <p className="text-[11px] text-ink-faint">{l.email ?? "—"}</p>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">{l.source ?? "—"}</td>
                    <td className="px-5 py-3">
                      <Badge tone={STAGE_TONE[l.stage ?? ""] ?? "neutral"}>
                        {l.stage ?? "unset"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-ink">
                      {l.value != null ? `$${l.value.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" onClick={() => setTimelineFor(l)}>
                          History
                        </Button>
                        <Button variant="ghost" onClick={() => setEditing(l)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => void remove(l)}
                          disabled={busy}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing ? (
        <LeadDialog
          lead={editing === "new" ? null : editing}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      ) : null}

      {timelineFor ? (
        <ActivityTimeline lead={timelineFor} onClose={() => setTimelineFor(null)} />
      ) : null}
    </>
  );
}

function StatTile({ label, value }: { label: string; value: string | null }) {
  return (
    <Card>
      <CardBody className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
          {label}
        </p>
        {value === null ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <p className="text-2xl font-semibold tracking-tight text-ink">{value}</p>
        )}
      </CardBody>
    </Card>
  );
}

/* ---------------------------- Create / edit ---------------------------- */

function LeadDialog({
  lead,
  busy,
  onCancel,
  onSave,
}: {
  lead: Lead | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (draft: LeadDraft, existing: Lead | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState<LeadDraft>({
    name: lead?.name ?? "",
    email: lead?.email ?? null,
    phone: lead?.phone ?? null,
    source: lead?.source ?? null,
    stage: lead?.stage ?? "new",
    value: lead?.value ?? null,
    assigned_to: lead?.assigned_to ?? null,
  });

  const canSave = draft.name.trim().length > 1 && !busy;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-canvas/80 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-dialog-title"
    >
      <Card className="w-full max-w-lg animate-fade-up shadow-2xl">
        <CardHeader
          title={
            <span id="lead-dialog-title">{lead ? `Edit ${lead.name}` : "New lead"}</span>
          }
          description="Maps to the Lead model in the CRM."
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave) void onSave({ ...draft, name: draft.name.trim() }, lead);
          }}
        >
          <CardBody className="space-y-4">
            <Field label="Name" htmlFor="l-name">
              <Input
                id="l-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                autoFocus
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" htmlFor="l-email">
                <Input
                  id="l-email"
                  type="email"
                  value={draft.email ?? ""}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value || null })}
                />
              </Field>
              <Field label="Phone" htmlFor="l-phone">
                <Input
                  id="l-phone"
                  value={draft.phone ?? ""}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value || null })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Source" htmlFor="l-source" hint="e.g. referral, website">
                <Input
                  id="l-source"
                  value={draft.source ?? ""}
                  onChange={(e) => setDraft({ ...draft, source: e.target.value || null })}
                />
              </Field>
              <Field label="Value (USD)" htmlFor="l-value">
                <Input
                  id="l-value"
                  type="number"
                  min={0}
                  value={draft.value ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      value: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
            </div>

            <Field
              label="Stage"
              htmlFor="l-stage"
              hint={
                lead
                  ? "Stage moves are validated by the backend against the allowed transitions."
                  : "New leads normally start at 'new'."
              }
            >
              <Select
                id="l-stage"
                value={draft.stage ?? "new"}
                onChange={(e) =>
                  setDraft({ ...draft, stage: e.target.value as PipelineStage })
                }
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </CardBody>

          <div className="flex justify-end gap-2 border-t border-line-soft px-5 py-3.5">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canSave}>
              {busy ? "Saving…" : lead ? "Save changes" : "Create lead"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

/* --------------------------- Activity history -------------------------- */

function ActivityTimeline({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    listLeadActivities(lead.id)
      .then((a) => !cancelled && setActivities(a))
      .catch((e) => {
        if (!cancelled) {
          setError(e);
          setActivities([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lead.id]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-canvas/80 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="timeline-title"
    >
      <Card className="w-full max-w-lg animate-fade-up shadow-2xl">
        <CardHeader
          title={<span id="timeline-title">Activity history — {lead.name}</span>}
          description="From GET /api/v1/crm/leads/{id}/activities"
        />
        <CardBody className="space-y-3">
          {error ? <ErrorNotice error={error} /> : null}

          {activities === null ? (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          ) : activities.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-muted">
              No activity recorded for this lead yet.
            </p>
          ) : (
            <ol className="space-y-3">
              {activities.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <div className="mt-1 size-2 shrink-0 rounded-full bg-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="info">{a.activity_type}</Badge>
                      <span className="text-[10px] text-ink-faint">
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </div>
                    {a.description ? (
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                        {a.description}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
        <div className="flex justify-end border-t border-line-soft px-5 py-3.5">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
