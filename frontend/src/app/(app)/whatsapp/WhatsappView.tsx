"use client";

/**
 * WhatsApp inbox — live against backend/app/api/whatsapp.py.
 *
 * Read-only. Messages arrive via the webhook the backend exposes to WhatsApp
 * Business; the assistant auto-replies server-side. There is no send endpoint,
 * so this view shows the conversation and says plainly that replies are
 * automatic rather than offering a compose box that would not work.
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
  Skeleton,
  cn,
} from "@/components/ui/primitives";
import { IconRefresh } from "@/components/ui/icons";
import { ErrorNotice } from "@/components/ErrorNotice";
import { listWhatsAppMessages } from "@/lib/api/operations";
import type { WhatsAppMessage } from "@/lib/types";

export function WhatsappView() {
  const [messages, setMessages] = useState<WhatsAppMessage[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setMessages(await listWhatsAppMessages());
    } catch (err) {
      setError(err);
      setMessages([]);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Group messages into conversations by sender number. */
  const conversations = useMemo(() => {
    const map = new Map<string, WhatsAppMessage[]>();
    (messages ?? []).forEach((m) => {
      if (!map.has(m.from_number)) map.set(m.from_number, []);
      map.get(m.from_number)!.push(m);
    });
    return [...map.entries()]
      .map(([number, msgs]) => ({
        number,
        msgs: [...msgs].sort(
          (a, b) => +new Date(a.created_at) - +new Date(b.created_at),
        ),
      }))
      .filter((c) => !filter.trim() || c.number.includes(filter.trim()));
  }, [messages, filter]);

  const active = conversations.find((c) => c.number === selected) ?? conversations[0];
  const autoReplied = (messages ?? []).filter((m) => m.reply_sent).length;

  return (
    <>
      <PageHeader
        title="WhatsApp"
        description="Incoming customer messages and the assistant's automatic replies."
        action={
          <Button onClick={() => void load()} disabled={busy}>
            <IconRefresh className={cn("size-3.5", busy && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {error ? <ErrorNotice error={error} onRetry={() => void load()} /> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Conversations" value={messages ? String(conversations.length) : null} />
        <Stat label="Messages" value={messages ? String(messages.length) : null} />
        <Stat label="Auto-replied" value={messages ? String(autoReplied) : null} />
      </section>

      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        <Card className="lg:max-h-[34rem] lg:overflow-y-auto">
          <CardHeader
            title="Conversations"
            description="Grouped by sender."
            action={<Badge tone="ok">Live</Badge>}
          />
          <CardBody className="space-y-2">
            <Field label="Filter by number" htmlFor="wa-filter">
              <Input
                id="wa-filter"
                placeholder="+1555…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </Field>

            {messages === null ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : conversations.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-muted">
                No messages received yet.
              </p>
            ) : (
              conversations.map((c) => {
                const last = c.msgs[c.msgs.length - 1];
                return (
                  <button
                    key={c.number}
                    type="button"
                    onClick={() => setSelected(c.number)}
                    aria-pressed={active?.number === c.number}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2.5 text-left transition",
                      active?.number === c.number
                        ? "border-accent/40 bg-accent/[0.08]"
                        : "border-transparent hover:border-line hover:bg-surface-2/60",
                    )}
                  >
                    <p className="truncate font-mono text-[11px] font-medium text-ink">
                      {c.number}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-ink-faint">
                      {last?.message_body ?? "—"}
                    </p>
                    <Badge className="mt-1">{c.msgs.length} msg</Badge>
                  </button>
                );
              })
            )}
          </CardBody>
        </Card>

        <Card className="flex min-h-0 flex-col">
          <CardHeader
            title={active ? active.number : "Conversation"}
            description="Customer messages with the assistant's replies inline."
          />
          <CardBody className="flex-1 space-y-4 overflow-y-auto">
            {messages === null ? (
              <Skeleton className="h-40 w-full" />
            ) : !active ? (
              <EmptyState
                title="No conversation selected"
                description="Messages appear here once customers write in via WhatsApp Business."
              />
            ) : (
              active.msgs.map((m) => (
                <div key={m.id} className="space-y-2">
                  {/* Inbound */}
                  <div className="flex gap-3">
                    <div className="max-w-[80%] space-y-1">
                      <div className="rounded-xl border border-line-soft bg-canvas/60 px-3.5 py-2.5 text-xs leading-relaxed text-ink">
                        {m.message_body ?? "—"}
                      </div>
                      <p className="text-[10px] text-ink-faint">
                        {new Date(m.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Assistant reply */}
                  {m.reply_sent ? (
                    <div className="flex justify-end gap-3">
                      <div className="max-w-[80%] space-y-1">
                        <div className="rounded-xl bg-accent px-3.5 py-2.5 text-xs leading-relaxed text-accent-ink">
                          {m.reply_text ?? "(reply sent)"}
                        </div>
                        <p className="text-right text-[10px] text-ink-faint">
                          Auto-replied by assistant
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-warn">No automatic reply sent</p>
                  )}
                </div>
              ))
            )}
          </CardBody>

          <div className="border-t border-line-soft px-5 py-3">
            <p className="text-[11px] leading-relaxed text-ink-muted">
              Replies are generated and sent server-side by the WhatsApp
              assistant. The backend exposes no outbound send endpoint, so there
              is no compose box here yet.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <Card>
      <CardBody className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
          {label}
        </p>
        {value === null ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {value}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
