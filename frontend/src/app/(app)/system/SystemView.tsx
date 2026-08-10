"use client";

/**
 * System status — the only page backed entirely by endpoints that exist today.
 *
 *   GET {BACKEND_URL}/health      backend/app/main.py
 *   GET {AI_URL}/api/health       ai/app/api/health.py
 *   GET {AI_URL}/api/providers    ai/app/api/health.py
 *
 * It doubles as the integration checklist: the endpoint table shows what is
 * wired up and what the backend team still owes the frontend.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  Skeleton,
  StatusDot,
  cn,
} from "@/components/ui/primitives";
import { IconRefresh } from "@/components/ui/icons";
import { AiToolTester } from "@/components/AiToolTester";
import { checkAllServices, fetchBackendInfo, fetchProviders } from "@/lib/api/system";
import { AI_URL, BACKEND_URL } from "@/lib/config";
import type { ServiceHealth } from "@/lib/types";

/** Every endpoint the frontend depends on, and whether it exists yet. */
const ENDPOINT_MATRIX: {
  method: string;
  path: string;
  service: "Backend" | "AI";
  status: "live" | "pending";
  usedBy: string;
}[] = [
  { method: "GET", path: "/health", service: "Backend", status: "live", usedBy: "System status, top bar" },
  { method: "GET", path: "/api/health", service: "AI", status: "live", usedBy: "System status, top bar" },
  { method: "GET", path: "/api/providers", service: "AI", status: "live", usedBy: "System status" },
  { method: "POST", path: "/api/v1/auth/{login,register}", service: "Backend", status: "live", usedBy: "Sign in / sign up" },
  { method: "GET", path: "/api/v1/auth/me", service: "Backend", status: "live", usedBy: "Session restore" },
  { method: "ALL", path: "/api/v1/crm/customers", service: "Backend", status: "live", usedBy: "Customers" },
  { method: "ALL", path: "/api/v1/crm/leads", service: "Backend", status: "live", usedBy: "Leads" },
  { method: "ALL", path: "/api/v1/crm/pipeline", service: "Backend", status: "live", usedBy: "Sales pipeline" },
  { method: "ALL", path: "/api/v1/crm/activities", service: "Backend", status: "live", usedBy: "Lead activity history" },
  { method: "ALL", path: "/api/v1/tasks", service: "Backend", status: "live", usedBy: "Tasks board" },
  { method: "ALL", path: "/api/v1/invoices", service: "Backend", status: "live", usedBy: "Invoices" },
  { method: "GET", path: "/api/v1/invoices/{id}/pdf", service: "Backend", status: "live", usedBy: "Invoice PDF" },
  { method: "POST", path: "/api/v1/invoices/process-{recurring,reminders}", service: "Backend", status: "live", usedBy: "Invoice batch jobs" },
  { method: "ALL", path: "/api/v1/quotations", service: "Backend", status: "live", usedBy: "Quotations + approval flow" },
  { method: "GET", path: "/api/v1/quotations/{id}/pdf", service: "Backend", status: "live", usedBy: "Quotation PDF" },
  { method: "ALL", path: "/api/v1/documents", service: "Backend", status: "live", usedBy: "Documents" },
  { method: "POST", path: "/api/v1/documents/{id}/parse", service: "Backend", status: "live", usedBy: "Document OCR" },
  { method: "ALL", path: "/api/v1/meetings", service: "Backend", status: "live", usedBy: "Meetings + action items" },
  { method: "POST", path: "/api/v1/email/send*", service: "Backend", status: "live", usedBy: "Email invoice / quotation" },
  { method: "GET", path: "/api/v1/reports/{sales,revenue,productivity}", service: "Backend", status: "live", usedBy: "Reports" },
  { method: "GET", path: "/api/v1/reports/expense", service: "Backend", status: "pending", usedBy: "Reports (needs Expense model)" },
  { method: "GET", path: "/api/v1/audit-logs", service: "Backend", status: "live", usedBy: "Audit logs" },
  { method: "GET", path: "/api/v1/whatsapp/messages", service: "Backend", status: "live", usedBy: "WhatsApp inbox" },
  { method: "POST", path: "/api/v1/ai-tools-test/{tool}", service: "Backend", status: "live", usedBy: "AI tool tester (internal)" },
  { method: "POST", path: "/chat", service: "AI", status: "pending", usedBy: "Assistant chat" },
  { method: "GET", path: "/api/v1/ai-employees", service: "Backend", status: "pending", usedBy: "AI employees" },
  { method: "GET", path: "/api/v1/users", service: "Backend", status: "pending", usedBy: "Team" },
  { method: "GET", path: "/api/v1/companies/me", service: "Backend", status: "pending", usedBy: "Company & plan" },
];

export function SystemView() {
  const [services, setServices] = useState<ServiceHealth[] | null>(null);
  const [providers, setProviders] = useState<string[] | null | "loading">("loading");
  const [backendInfo, setBackendInfo] = useState<Record<string, unknown> | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    const [svc, prov, info] = await Promise.all([
      checkAllServices(),
      fetchProviders(),
      fetchBackendInfo(),
    ]);
    setServices(svc);
    setProviders(prov);
    setBackendInfo(info);
    setCheckedAt(new Date().toLocaleTimeString());
    setBusy(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const liveCount = ENDPOINT_MATRIX.filter((e) => e.status === "live").length;

  return (
    <>
      <PageHeader
        title="System status"
        description="Health of the backend and AI services, plus the endpoint contract between them and this frontend."
        action={
          <Button onClick={() => void refresh()} disabled={busy}>
            <IconRefresh className={cn("size-3.5", busy && "animate-spin")} />
            {busy ? "Checking" : "Re-check"}
          </Button>
        }
      />

      {checkedAt ? (
        <p className="-mt-2 text-[11px] text-ink-faint">
          Last checked at {checkedAt}
          {backendInfo
            ? ` · ${String(backendInfo.system ?? "backend")} v${String(backendInfo.version ?? "?")}`
            : ""}
        </p>
      ) : null}

      {/* ------------------------- Service cards ------------------------- */}
      <section className="grid gap-4 md:grid-cols-2">
        {services === null
          ? [0, 1].map((i) => <Skeleton key={i} className="h-44 w-full rounded-xl" />)
          : services.map((svc) => (
              <Card key={svc.key} className="animate-fade-up">
                <CardHeader
                  title={
                    <span className="flex items-center gap-2">
                      <StatusDot
                        tone={svc.state === "online" ? "ok" : "danger"}
                        pulse={svc.state === "online"}
                      />
                      {svc.name}
                    </span>
                  }
                  description={svc.baseUrl}
                  action={
                    <Badge tone={svc.state === "online" ? "ok" : "danger"}>
                      {svc.state === "online" ? "Online" : "Offline"}
                    </Badge>
                  }
                />
                <CardBody className="space-y-3">
                  {svc.state === "online" ? (
                    <>
                      <dl className="grid grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <dt className="text-ink-faint">Latency</dt>
                          <dd className="mt-0.5 font-mono text-ink">{svc.latencyMs} ms</dd>
                        </div>
                        <div>
                          <dt className="text-ink-faint">Probe</dt>
                          <dd className="mt-0.5 font-mono text-ink">
                            {svc.key === "backend" ? "GET /health" : "GET /api/health"}
                          </dd>
                        </div>
                      </dl>
                      <pre className="overflow-x-auto rounded-lg border border-line-soft bg-canvas px-3 py-2.5 font-mono text-[10px] leading-relaxed text-ink-muted">
                        {JSON.stringify(svc.payload, null, 2)}
                      </pre>
                    </>
                  ) : (
                    <div className="space-y-2 rounded-lg border border-danger/25 bg-danger/[0.06] px-3 py-2.5">
                      <p className="text-[11px] font-medium text-danger">
                        Could not reach the service
                      </p>
                      <p className="font-mono text-[10px] leading-relaxed text-ink-muted">
                        {svc.error}
                      </p>
                      <p className="text-[10px] leading-relaxed text-ink-faint">
                        Start it with{" "}
                        <code className="text-ink">
                          {svc.key === "backend"
                            ? "uvicorn app.main:app --reload --port 8000"
                            : "uvicorn app.main:app --reload --port 8001"}
                        </code>{" "}
                        from the{" "}
                        <code className="text-ink">{svc.key === "backend" ? "backend/" : "ai/"}</code>{" "}
                        directory.
                      </p>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
      </section>

      {/* --------------------------- Providers --------------------------- */}
      <Card>
        <CardHeader
          title="Configured LLM providers"
          description={`Reported by GET ${AI_URL}/api/providers`}
          action={<Badge tone="ok">Live</Badge>}
        />
        <CardBody>
          {providers === "loading" ? (
            <Skeleton className="h-7 w-64" />
          ) : providers === null ? (
            <p className="text-xs text-ink-muted">
              The AI service is unreachable, so the provider list is unavailable.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {providers.map((p) => (
                <Badge key={p} tone="accent" className="capitalize">
                  {p}
                </Badge>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* ------------------------ Endpoint matrix ------------------------ */}
      <Card>
        <CardHeader
          title="API contract"
          description="What this frontend calls, and which of those endpoints the backend has shipped."
          action={
            <Badge tone="info">
              {liveCount}/{ENDPOINT_MATRIX.length} groups live
            </Badge>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-xs">
            <thead>
              <tr className="border-b border-line-soft text-[10px] uppercase tracking-wider text-ink-faint">
                <th scope="col" className="px-5 py-2.5 font-medium">Method</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Path</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Service</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Consumed by</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {ENDPOINT_MATRIX.map((e) => (
                <tr key={`${e.method} ${e.service} ${e.path}`} className="hover:bg-surface-2/40">
                  <td className="px-5 py-2.5">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                        e.method === "GET" && "bg-info/10 text-info",
                        e.method === "POST" && "bg-ok/10 text-ok",
                        e.method === "PATCH" && "bg-warn/10 text-warn",
                      )}
                    >
                      {e.method}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 font-mono text-[11px] text-ink">{e.path}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{e.service}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{e.usedBy}</td>
                  <td className="px-5 py-2.5">
                    <Badge tone={e.status === "live" ? "ok" : "warn"}>
                      {e.status === "live" ? "Live" : "Pending"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CardBody className="border-t border-line-soft">
          <p className="text-[11px] leading-relaxed text-ink-muted">
            Base URLs are configured via{" "}
            <code className="font-mono text-ink">NEXT_PUBLIC_BACKEND_URL</code> (
            {BACKEND_URL}) and{" "}
            <code className="font-mono text-ink">NEXT_PUBLIC_AI_URL</code> ({AI_URL}).
            Pending endpoints fall back to preview fixtures; set{" "}
            <code className="font-mono text-ink">NEXT_PUBLIC_ALLOW_PREVIEW_DATA=false</code>{" "}
            to make them fail loudly instead.
          </p>
        </CardBody>
      </Card>

      <AiToolTester />
    </>
  );
}
