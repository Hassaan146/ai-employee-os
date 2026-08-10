"use client";

/**
 * Internal tester for the AI tool registry.
 *
 * The backend marks POST /ai-tools-test/{tool} as temporary — the tools move
 * to a central AI execution router once that exists. So this is deliberately a
 * developer panel on the system page rather than product UI: when the endpoint
 * goes away, one panel is deleted instead of a feature being rebuilt.
 */

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { ErrorNotice } from "@/components/ErrorNotice";
import { AI_TOOL_NAMES, runAiTool } from "@/lib/api/operations";

/** Starter payloads so the panel is usable without reading the backend source. */
const SAMPLE_PARAMS: Record<string, string> = {
  create_customer: '{\n  "name": "Acme Ltd",\n  "email": "hello@acme.com"\n}',
  update_lead: '{\n  "lead_id": "<uuid>",\n  "stage": "contacted"\n}',
  create_task: '{\n  "title": "Follow up with Acme",\n  "priority": "high"\n}',
  generate_quotation:
    '{\n  "customer_id": "<uuid>",\n  "line_items": [\n    { "description": "Consulting", "quantity": 5, "unit_price": 400 }\n  ]\n}',
  create_invoice:
    '{\n  "customer_id": "<uuid>",\n  "line_items": [\n    { "description": "Laptop", "quantity": 2, "unit_price": 1200 }\n  ]\n}',
  send_email:
    '{\n  "to_email": "hello@acme.com",\n  "subject": "Hello",\n  "body_html": "<p>Hi there</p>"\n}',
};

export function AiToolTester() {
  const [tool, setTool] = useState<string>(AI_TOOL_NAMES[0]);
  const [params, setParams] = useState(SAMPLE_PARAMS[AI_TOOL_NAMES[0]]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function pickTool(name: string) {
    setTool(name);
    setParams(SAMPLE_PARAMS[name] ?? "{}");
    setResult(null);
    setParseError(null);
  }

  async function run() {
    setParseError(null);
    setError(null);
    setResult(null);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(params) as Record<string, unknown>;
    } catch (err) {
      setParseError(
        err instanceof Error ? `Invalid JSON: ${err.message}` : "Invalid JSON",
      );
      return;
    }

    setBusy(true);
    try {
      setResult(JSON.stringify(await runAiTool(tool, parsed), null, 2));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="AI tool tester"
        description="Run a tool from the AI registry directly, for debugging."
        action={<Badge tone="warn">Internal · temporary endpoint</Badge>}
      />
      <CardBody className="space-y-4">
        <p className="text-[11px] leading-relaxed text-ink-muted">
          The backend exposes these tools at{" "}
          <code className="font-mono text-ink">POST /api/v1/ai-tools-test/&#123;tool&#125;</code>{" "}
          only until the central AI execution router exists. This panel is for
          the team, not for end users.
        </p>

        <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
          <Field label="Tool" htmlFor="ai-tool">
            <Select id="ai-tool" value={tool} onChange={(e) => pickTool(e.target.value)}>
              {AI_TOOL_NAMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Parameters (JSON)"
            htmlFor="ai-params"
            hint={parseError ?? "Replace <uuid> placeholders with real record ids."}
          >
            <Textarea
              id="ai-params"
              rows={7}
              value={params}
              onChange={(e) => setParams(e.target.value)}
              aria-invalid={!!parseError}
              className="font-mono text-[11px]"
            />
          </Field>
        </div>

        <Button variant="primary" onClick={() => void run()} disabled={busy}>
          {busy ? "Running…" : `Run ${tool}`}
        </Button>

        {error ? <ErrorNotice error={error} /> : null}

        {result ? (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
              Result
            </p>
            <pre className="max-h-64 overflow-auto rounded-lg border border-line-soft bg-canvas px-3 py-2.5 font-mono text-[10px] leading-relaxed text-ink-muted">
              {result}
            </pre>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
