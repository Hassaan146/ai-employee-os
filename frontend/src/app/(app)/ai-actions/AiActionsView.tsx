"use client";

/**
 * AI Actions — live against the central AI execution router
 * (backend/app/api/ai_execution.py).
 *
 * This is the product's core promise: the assistant does not just answer, it
 * performs real business operations. Each tool here creates or updates actual
 * records, writes an audit-log entry, and broadcasts over the company
 * WebSocket channel.
 *
 * The router returns HTTP 200 with `success: false` when a tool fails — only
 * an unknown tool name is a 400 — so the result is judged on the flag, never
 * on the promise resolving.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  PageHeader,
  Skeleton,
  Textarea,
  cn,
} from "@/components/ui/primitives";
import { IconChevronRight, IconRefresh, IconTool } from "@/components/ui/icons";
import { ErrorNotice } from "@/components/ErrorNotice";
import { executeAiAction, listAiTools, type AiExecuteResponse } from "@/lib/api/operations";

/** What each tool does and a starting payload, so the page is self-explanatory. */
const TOOL_INFO: Record<
  string,
  { label: string; description: string; sample: string }
> = {
  create_customer: {
    label: "Create customer",
    description: "Adds a customer record to the CRM.",
    sample: '{\n  "name": "Zenith Corp",\n  "email": "ops@zenithcorp.com"\n}',
  },
  update_lead: {
    label: "Update lead",
    description: "Moves a lead or edits its details.",
    sample: '{\n  "lead_id": "<lead uuid>",\n  "stage": "contacted"\n}',
  },
  create_task: {
    label: "Create task",
    description: "Raises a task assigned to the workspace.",
    sample:
      '{\n  "title": "Follow up with Zenith",\n  "priority": "high"\n}',
  },
  generate_quotation: {
    label: "Generate quotation",
    description: "Builds a priced quotation for a customer.",
    sample:
      '{\n  "customer_id": "<customer uuid>",\n  "line_items": [\n    { "description": "Consulting", "quantity": 5, "unit_price": 400 }\n  ]\n}',
  },
  create_invoice: {
    label: "Create invoice",
    description: "Issues an invoice with tax and totals computed server-side.",
    sample:
      '{\n  "customer_id": "<customer uuid>",\n  "line_items": [\n    { "description": "Laptop", "quantity": 2, "unit_price": 1200 }\n  ]\n}',
  },
  send_email: {
    label: "Send email",
    description: "Sends an email on the company's behalf.",
    sample:
      '{\n  "to_email": "ops@zenithcorp.com",\n  "subject": "Your quotation",\n  "body_html": "<p>Attached.</p>"\n}',
  },
};

interface RunRecord {
  id: string;
  tool: string;
  at: string;
  response: AiExecuteResponse;
}

export function AiActionsView() {
  const [tools, setTools] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [params, setParams] = useState("{}");
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await listAiTools();
      setTools(res.tools);
      if (res.tools.length > 0) {
        setSelected((cur) => cur ?? res.tools[0]);
        setParams((cur) =>
          cur === "{}" ? (TOOL_INFO[res.tools[0]]?.sample ?? "{}") : cur,
        );
      }
    } catch (err) {
      setError(err);
      setTools([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function pick(tool: string) {
    setSelected(tool);
    setParams(TOOL_INFO[tool]?.sample ?? "{}");
    setParseError(null);
  }

  async function run() {
    if (!selected) return;
    setParseError(null);
    setError(null);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(params) as Record<string, unknown>;
    } catch (err) {
      setParseError(err instanceof Error ? `Invalid JSON: ${err.message}` : "Invalid JSON");
      return;
    }

    setBusy(true);
    try {
      const response = await executeAiAction(selected, parsed);
      setHistory((prev) => [
        {
          id: crypto.randomUUID(),
          tool: selected,
          at: new Date().toISOString(),
          response,
        },
        ...prev,
      ]);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const info = selected ? TOOL_INFO[selected] : undefined;

  return (
    <>
      <PageHeader
        title="AI actions"
        description="Run a real business operation through the AI execution router. Every action is audited and broadcast to the workspace."
        action={
          <Button onClick={() => void load()} disabled={busy}>
            <IconRefresh className={cn("size-3.5", busy && "animate-spin")} />
            Refresh tools
          </Button>
        }
      />

      {error ? <ErrorNotice error={error} onRetry={() => void load()} /> : null}

      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        {/* ------------------------- Tool registry ------------------------ */}
        <Card className="lg:max-h-[34rem] lg:overflow-y-auto">
          <CardHeader
            title="Available tools"
            description="Read from the server registry."
            action={<Badge tone="ok">Live</Badge>}
          />
          <CardBody className="space-y-1.5">
            {tools === null ? (
              [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : tools.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-muted">
                The router reports no registered tools.
              </p>
            ) : (
              tools.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => pick(t)}
                  aria-pressed={selected === t}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition",
                    selected === t
                      ? "border-accent/40 bg-accent/[0.08]"
                      : "border-transparent hover:border-line hover:bg-surface-2/60",
                  )}
                >
                  <IconTool
                    className={cn(
                      "mt-0.5 size-3.5 shrink-0",
                      selected === t ? "text-accent" : "text-ink-faint",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-xs font-medium",
                        selected === t ? "text-accent" : "text-ink",
                      )}
                    >
                      {TOOL_INFO[t]?.label ?? t}
                    </span>
                    <span className="block truncate font-mono text-[10px] text-ink-faint">
                      {t}
                    </span>
                  </span>
                </button>
              ))
            )}
          </CardBody>
        </Card>

        {/* --------------------------- Run panel -------------------------- */}
        <div className="space-y-5">
          <Card>
            <CardHeader
              title={info?.label ?? selected ?? "Select a tool"}
              description={info?.description ?? "Choose a tool from the registry."}
            />
            <CardBody className="space-y-4">
              <Field
                label="Parameters (JSON)"
                htmlFor="ai-action-params"
                hint={
                  parseError ??
                  "Replace placeholder ids with real record ids from the CRM."
                }
              >
                <Textarea
                  id="ai-action-params"
                  rows={9}
                  value={params}
                  onChange={(e) => setParams(e.target.value)}
                  aria-invalid={!!parseError}
                  className="font-mono text-[11px]"
                />
              </Field>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  onClick={() => void run()}
                  disabled={busy || !selected}
                >
                  {busy ? "Executing…" : `Run ${selected ?? ""}`}
                </Button>
                <Link
                  href="/audit-logs"
                  className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                >
                  See it in the audit log <IconChevronRight className="size-3" />
                </Link>
              </div>

              <p className="text-[11px] leading-relaxed text-ink-muted">
                These actions write real records. Each run is recorded in the
                audit trail against an AI actor, so the workspace can see what
                was done on its behalf.
              </p>
            </CardBody>
          </Card>

          {/* ---------------------------- Results --------------------------- */}
          <Card>
            <CardHeader
              title="Run history"
              description="Results from this session, newest first."
            />
            <CardBody className="space-y-2">
              {history.length === 0 ? (
                <p className="py-6 text-center text-xs text-ink-muted">
                  No actions run yet.
                </p>
              ) : (
                history.map((run) => (
                  <details
                    key={run.id}
                    className="rounded-lg border border-line-soft bg-canvas/50 px-3 py-2.5"
                    open={run === history[0]}
                  >
                    <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-[11px]">
                      <Badge tone={run.response.success ? "ok" : "danger"}>
                        {run.response.success ? "Success" : "Failed"}
                      </Badge>
                      <code className="font-mono text-ink">{run.tool}</code>
                      <span className="text-ink-faint">
                        {new Date(run.at).toLocaleTimeString()}
                      </span>
                    </summary>

                    {run.response.error ? (
                      <p className="mt-2 text-[11px] leading-relaxed text-danger">
                        {run.response.error}
                      </p>
                    ) : null}

                    <pre className="mt-2 max-h-52 overflow-auto rounded border border-line-soft bg-canvas px-2.5 py-2 font-mono text-[10px] leading-relaxed text-ink-muted">
                      {JSON.stringify(run.response.result ?? {}, null, 2)}
                    </pre>
                  </details>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
