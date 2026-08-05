"use client";

/**
 * Tasks — live against backend/app/api/tasks.py.
 *
 * Rendered as a status board. Unlike the CRM collections, GET /tasks is
 * paginated, so the board shows one page at a time and says how many records
 * exist rather than implying it is showing everything.
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
  Select,
  Skeleton,
  Textarea,
  cn,
} from "@/components/ui/primitives";
import { IconPlus, IconRefresh } from "@/components/ui/icons";
import { ErrorNotice } from "@/components/ErrorNotice";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createTask, deleteTask, listTasks, updateTask } from "@/lib/api/operations";
import { shortDate } from "@/lib/format";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskDraft,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types";

const PRIORITY_TONE: Record<TaskPriority, "neutral" | "info" | "warn" | "danger"> = {
  low: "neutral",
  medium: "info",
  high: "warn",
  urgent: "danger",
};

const STATUS_ACCENT: Record<TaskStatus, string> = {
  todo: "border-t-ink-faint",
  in_progress: "border-t-info",
  blocked: "border-t-danger",
  done: "border-t-ok",
  cancelled: "border-t-line",
};

const PAGE_SIZE = 100;

export function TasksView() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await listTasks({
        page_size: PAGE_SIZE,
        priority: priorityFilter === "all" ? undefined : priorityFilter,
      });
      setTasks(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err);
      setTasks([]);
    }
  }, [priorityFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function move(task: Task, status: TaskStatus) {
    setBusy(true);
    setError(null);
    try {
      const updated = await updateTask(task.id, { status });
      setTasks((prev) => prev?.map((t) => (t.id === updated.id ? updated : t)) ?? prev);
    } catch (err) {
      setError(err);
      void load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(task: Task) {
    setBusy(true);
    setError(null);
    try {
      await deleteTask(task.id);
      setTasks((prev) => prev?.filter((t) => t.id !== task.id) ?? prev);
      setTotal((t) => Math.max(0, t - 1));
      setConfirming(null);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function save(draft: TaskDraft) {
    setBusy(true);
    setError(null);
    try {
      const created = await createTask(draft);
      setTasks((prev) => (prev ? [created, ...prev] : [created]));
      setTotal((t) => t + 1);
      setCreating(false);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Work assigned across the company, including tasks AI employees created."
        action={
          <div className="flex gap-2">
            <Button onClick={() => void load()} disabled={busy}>
              <IconRefresh className={cn("size-3.5", busy && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="primary" onClick={() => setCreating(true)}>
              <IconPlus className="size-3.5" />
              New task
            </Button>
          </div>
        }
      />

      {error ? <ErrorNotice error={error} onRetry={() => void load()} /> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-44">
          <Field label="Priority" htmlFor="task-priority">
            <Select
              id="task-priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All priorities</option>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="text-[11px] text-ink-muted">
          {tasks
            ? `Showing ${tasks.length} of ${total} task${total === 1 ? "" : "s"}`
            : "Loading…"}
        </p>
      </div>

      {tasks === null ? (
        <div className="grid gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <EmptyState
            title="No tasks yet"
            description="Create a task, or let an AI employee generate one from a meeting or conversation."
            action={
              <Button variant="primary" onClick={() => setCreating(true)}>
                <IconPlus className="size-3.5" />
                New task
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {TASK_STATUSES.map((status) => {
              const items = tasks.filter((t) => t.status === status);
              return (
                <section key={status} className="w-64 shrink-0">
                  <div
                    className={cn(
                      "rounded-xl border border-line border-t-2 bg-surface/70",
                      STATUS_ACCENT[status],
                    )}
                  >
                    <div className="flex items-center justify-between border-b border-line-soft px-3.5 py-2.5">
                      <h2 className="text-xs font-medium capitalize text-ink">
                        {status.replace("_", " ")}
                      </h2>
                      <Badge>{items.length}</Badge>
                    </div>
                    <div className="min-h-24 space-y-2 p-2.5">
                      {items.length === 0 ? (
                        <p className="px-1 py-3 text-center text-[11px] text-ink-faint">
                          Empty
                        </p>
                      ) : (
                        items.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            busy={busy}
                            onMove={(s) => void move(task, s)}
                            onDelete={() => setConfirming(task)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {creating ? (
        <TaskDialog busy={busy} onCancel={() => setCreating(false)} onSave={save} />
      ) : null}

      {confirming ? (
        <ConfirmDialog
          title="Delete this task?"
          body={`"${confirming.title}" will be permanently removed. This cannot be undone.`}
          busy={busy}
          onConfirm={() => void remove(confirming)}
          onCancel={() => setConfirming(null)}
        />
      ) : null}
    </>
  );
}

function TaskCard({
  task,
  busy,
  onMove,
  onDelete,
}: {
  task: Task;
  busy: boolean;
  onMove: (s: TaskStatus) => void;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-lg border border-line-soft bg-canvas/60 px-3 py-2.5">
      <p className="text-xs font-medium text-ink">{task.title}</p>
      {task.description ? (
        <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-ink-muted">
          {task.description}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
        {task.is_ai_generated ? <Badge tone="accent">AI</Badge> : null}
        {task.due_date ? (
          <span className="text-[10px] tabular-nums text-ink-faint">
            due {shortDate(task.due_date)}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-line-soft pt-2">
        <label className="sr-only" htmlFor={`move-${task.id}`}>
          Move {task.title} to another status
        </label>
        <select
          id={`move-${task.id}`}
          value={task.status}
          disabled={busy}
          onChange={(e) => onMove(e.target.value as TaskStatus)}
          className="flex-1 rounded border border-line bg-canvas px-1.5 py-1 text-[10px] capitalize text-ink-muted focus:border-accent/50 focus:outline-none"
        >
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label={`Delete task ${task.title}`}
          className="rounded border border-line px-1.5 py-1 text-[10px] text-ink-faint transition hover:border-danger/40 hover:text-danger disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function TaskDialog({
  busy,
  onCancel,
  onSave,
}: {
  busy: boolean;
  onCancel: () => void;
  onSave: (draft: TaskDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<TaskDraft>({
    title: "",
    description: null,
    priority: "medium",
    status: "todo",
    due_date: null,
    customer_id: null,
  });

  const canSave = draft.title.trim().length > 1 && !busy;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-canvas/80 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-dialog-title"
    >
      <Card className="w-full max-w-lg animate-fade-up shadow-2xl">
        <CardHeader
          title={<span id="task-dialog-title">New task</span>}
          description="Maps to the Task model."
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave) void onSave({ ...draft, title: draft.title.trim() });
          }}
        >
          <CardBody className="space-y-4">
            <Field label="Title" htmlFor="t-title">
              <Input
                id="t-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                autoFocus
              />
            </Field>

            <Field label="Description" htmlFor="t-desc">
              <Textarea
                id="t-desc"
                rows={3}
                value={draft.description ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value || null })
                }
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Priority" htmlFor="t-priority">
                <Select
                  id="t-priority"
                  value={draft.priority}
                  onChange={(e) =>
                    setDraft({ ...draft, priority: e.target.value as TaskPriority })
                  }
                >
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status" htmlFor="t-status">
                <Select
                  id="t-status"
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({ ...draft, status: e.target.value as TaskStatus })
                  }
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Due date" htmlFor="t-due">
                <Input
                  id="t-due"
                  type="date"
                  value={draft.due_date?.slice(0, 10) ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, due_date: e.target.value || null })
                  }
                />
              </Field>
            </div>
          </CardBody>

          <div className="flex justify-end gap-2 border-t border-line-soft px-5 py-3.5">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canSave}>
              {busy ? "Creating…" : "Create task"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
