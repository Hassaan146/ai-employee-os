"use client";

/**
 * Meetings — live against backend/app/api/meetings.py.
 *
 * List plus a detail panel showing the AI summary, transcript, speaker log,
 * and action items. Action items can be ticked off; those already promoted to
 * a Task are marked so, since completing them in two places would diverge.
 */

import { useCallback, useEffect, useState } from "react";
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
  Skeleton,
  cn,
} from "@/components/ui/primitives";
import { IconPlus, IconRefresh } from "@/components/ui/icons";
import { ErrorNotice } from "@/components/ErrorNotice";
import {
  createActionItem,
  createMeeting,
  getMeeting,
  listMeetings,
  updateActionItem,
} from "@/lib/api/operations";
import { shortDate } from "@/lib/format";
import type { Meeting, MeetingStatus } from "@/lib/types";

const STATUS_TONE: Record<MeetingStatus, "ok" | "info" | "warn" | "neutral"> = {
  scheduled: "info",
  in_progress: "warn",
  completed: "ok",
  cancelled: "neutral",
};

export function MeetingsView() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newItem, setNewItem] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      setMeetings(await listMeetings());
    } catch (err) {
      setError(err);
      setMeetings([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function open(m: Meeting) {
    setSelected(m);
    try {
      // The list payload may omit nested collections; fetch the full record.
      setSelected(await getMeeting(m.id));
    } catch (err) {
      setError(err);
    }
  }

  async function toggleItem(meetingId: string, itemId: string, done: boolean) {
    setBusy(true);
    try {
      await updateActionItem(meetingId, itemId, { is_completed: done });
      setSelected(await getMeeting(meetingId));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function addItem(meetingId: string) {
    if (!newItem.trim()) return;
    setBusy(true);
    try {
      await createActionItem(meetingId, { description: newItem.trim() });
      setNewItem("");
      setSelected(await getMeeting(meetingId));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Meetings"
        description="Meeting records with AI summaries, speaker logs, and action items."
        action={
          <div className="flex gap-2">
            <Button onClick={() => void load()} disabled={busy}>
              <IconRefresh className={cn("size-3.5", busy && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="primary" onClick={() => setCreating(true)}>
              <IconPlus className="size-3.5" />
              New meeting
            </Button>
          </div>
        }
      />

      {error ? <ErrorNotice error={error} onRetry={() => void load()} /> : null}

      <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
        <Card className="lg:max-h-[36rem] lg:overflow-y-auto">
          <CardHeader
            title="All meetings"
            description={meetings ? `${meetings.length} total` : "Loading…"}
            action={<Badge tone="ok">Live</Badge>}
          />
          <CardBody className="space-y-1.5">
            {meetings === null ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : meetings.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-muted">
                No meetings yet.
              </p>
            ) : (
              meetings.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => void open(m)}
                  aria-pressed={selected?.id === m.id}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 text-left transition",
                    selected?.id === m.id
                      ? "border-accent/40 bg-accent/[0.08]"
                      : "border-transparent hover:border-line hover:bg-surface-2/60",
                  )}
                >
                  <p className="truncate text-xs font-medium text-ink">{m.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge tone={STATUS_TONE[m.status]}>{m.status.replace("_", " ")}</Badge>
                    <span className="text-[10px] tabular-nums text-ink-faint">
                      {shortDate(m.scheduled_at)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </CardBody>
        </Card>

        {selected ? (
          <div className="space-y-5">
            <Card>
              <CardHeader
                title={selected.title}
                description={`${shortDate(selected.scheduled_at)}${
                  selected.duration_minutes ? ` · ${selected.duration_minutes} min` : ""
                }`}
                action={<Badge tone={STATUS_TONE[selected.status]}>{selected.status}</Badge>}
              />
              <CardBody className="space-y-4">
                <section>
                  <h3 className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                    AI summary
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                    {selected.ai_summary ?? "No summary generated yet."}
                  </p>
                </section>

                {selected.transcript_text ? (
                  <section>
                    <h3 className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                      Transcript
                    </h3>
                    <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-line-soft bg-canvas px-3 py-2.5 text-[10px] leading-relaxed text-ink-muted">
                      {selected.transcript_text}
                    </pre>
                  </section>
                ) : null}

                {selected.speakers && selected.speakers.length > 0 ? (
                  <section>
                    <h3 className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                      Speakers
                    </h3>
                    <ul className="mt-1.5 space-y-1.5">
                      {selected.speakers.map((s) => (
                        <li key={s.id} className="flex gap-2 text-[11px]">
                          <Badge tone="info">{s.speaker_label}</Badge>
                          <span className="flex-1 text-ink-muted">{s.text ?? "—"}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Action items"
                description="Follow-ups captured from this meeting."
              />
              <CardBody className="space-y-3">
                {!selected.action_items || selected.action_items.length === 0 ? (
                  <p className="text-xs text-ink-muted">No action items yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {selected.action_items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start gap-2.5 rounded-lg border border-line-soft bg-canvas/50 px-3 py-2.5"
                      >
                        <input
                          type="checkbox"
                          checked={item.is_completed}
                          disabled={busy}
                          onChange={(e) =>
                            void toggleItem(selected.id, item.id, e.target.checked)
                          }
                          id={`ai-${item.id}`}
                          className="mt-0.5 size-3.5 accent-[var(--color-accent)]"
                        />
                        <label
                          htmlFor={`ai-${item.id}`}
                          className={cn(
                            "flex-1 cursor-pointer text-[11px] leading-relaxed",
                            item.is_completed
                              ? "text-ink-faint line-through"
                              : "text-ink-muted",
                          )}
                        >
                          {item.description}
                          {item.deadline ? (
                            <span className="ml-2 tabular-nums text-ink-faint">
                              due {shortDate(item.deadline)}
                            </span>
                          ) : null}
                        </label>
                        {item.linked_task_id ? <Badge tone="accent">Task</Badge> : null}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex items-end gap-2 border-t border-line-soft pt-3">
                  <div className="flex-1">
                    <Field label="Add action item" htmlFor="new-action">
                      <Input
                        id="new-action"
                        value={newItem}
                        placeholder="e.g. Send revised quotation by Friday"
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void addItem(selected.id);
                        }}
                      />
                    </Field>
                  </div>
                  <Button
                    variant="primary"
                    disabled={!newItem.trim() || busy}
                    onClick={() => void addItem(selected.id)}
                  >
                    Add
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        ) : (
          <Card>
            <EmptyState
              title="Select a meeting"
              description="Choose a meeting from the list to see its summary, transcript, and action items."
            />
          </Card>
        )}
      </div>

      {creating ? (
        <MeetingDialog
          busy={busy}
          onCancel={() => setCreating(false)}
          onSave={async (draft) => {
            setBusy(true);
            setError(null);
            try {
              const created = await createMeeting(draft);
              setMeetings((prev) => (prev ? [created, ...prev] : [created]));
              setSelected(created);
              setCreating(false);
            } catch (err) {
              setError(err);
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
    </>
  );
}

function MeetingDialog({
  busy,
  onCancel,
  onSave,
}: {
  busy: boolean;
  onCancel: () => void;
  onSave: (draft: {
    title: string;
    scheduled_at: string | null;
    duration_minutes: number | null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(30);

  const canSave = title.trim().length > 1 && !busy;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-canvas/80 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="m-dialog-title"
    >
      <Card className="w-full max-w-md animate-fade-up shadow-2xl">
        <CardHeader
          title={<span id="m-dialog-title">New meeting</span>}
          description="Maps to the Meeting model."
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSave) return;
            void onSave({
              title: title.trim(),
              scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
              duration_minutes: duration || null,
            });
          }}
        >
          <CardBody className="space-y-4">
            <Field label="Title" htmlFor="m-title">
              <Input
                id="m-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Scheduled at" htmlFor="m-when">
                <Input
                  id="m-when"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </Field>
              <Field label="Duration (min)" htmlFor="m-dur">
                <Input
                  id="m-dur"
                  type="number"
                  min={0}
                  className="tabular-nums"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </Field>
            </div>
          </CardBody>
          <div className="flex justify-end gap-2 border-t border-line-soft px-5 py-3.5">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canSave}>
              {busy ? "Creating…" : "Create meeting"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
