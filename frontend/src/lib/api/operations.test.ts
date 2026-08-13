/**
 * Tests for the operations API — tasks, invoices, quotations, documents,
 * meetings, reports, audit logs, WhatsApp, email, and PDF links.
 *
 * The important guarantee here is path shape. The CRM routers declare their
 * collections as "/" under a prefix (so they need a trailing slash) while these
 * newer routers declare them as "" (so they must not have one). Getting that
 * wrong causes a redirect that can strip the Authorization header, which fails
 * as a confusing 401 rather than an obvious 404 — so every path is pinned.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveQuotation,
  createInvoice,
  createTask,
  deleteTask,
  emailInvoice,
  emailQuotation,
  getAuditStats,
  getProductivityReport,
  getSalesReport,
  invoicePdfUrl,
  listAuditLogs,
  listDocuments,
  listInvoices,
  listMeetings,
  listQuotations,
  listTasks,
  listWhatsAppMessages,
  parseDocument,
  processInvoiceReminders,
  processRecurringInvoices,
  quotationPdfUrl,
  rejectQuotation,
  runAiTool,
  sendEmail,
  sendQuotation,
  updateActionItem,
  updateInvoiceStatus,
  updateTask,
} from "@/lib/api/operations";
import { BACKEND_URL } from "@/lib/config";
import { clearToken, setToken } from "@/lib/auth/session";

function stubOk(body: unknown = {}) {
  const spy = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

const V1 = `${BACKEND_URL}/api/v1`;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  clearToken();
});

describe("collection paths carry no trailing slash", () => {
  it.each([
    ["listTasks", () => listTasks(), `${V1}/tasks`],
    ["listInvoices", () => listInvoices(), `${V1}/invoices`],
    ["listQuotations", () => listQuotations(), `${V1}/quotations`],
    ["listDocuments", () => listDocuments(), `${V1}/documents`],
    ["listMeetings", () => listMeetings(), `${V1}/meetings`],
  ] as const)("%s calls %s", async (_n, call, expected) => {
    const spy = stubOk({ items: [] });
    await call();
    expect(spy.mock.calls[0][0]).toBe(expected);
  });
});

describe("tasks", () => {
  it("passes filters and pagination as query params", async () => {
    const spy = stubOk({ items: [], total: 0, page: 1, page_size: 50 });

    await listTasks({ status: "todo", priority: "high", page: 2, page_size: 50 });

    const url = new URL(spy.mock.calls[0][0]);
    expect(url.searchParams.get("status")).toBe("todo");
    expect(url.searchParams.get("priority")).toBe("high");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("page_size")).toBe("50");
  });

  it("omits the query string entirely when no params are given", async () => {
    const spy = stubOk({ items: [] });
    await listTasks();
    expect(spy.mock.calls[0][0]).toBe(`${V1}/tasks`);
  });

  it("creates with POST and updates with PATCH", async () => {
    const spy = stubOk({});
    await createTask({
      title: "Follow up",
      description: null,
      priority: "high",
      status: "todo",
      due_date: null,
      customer_id: null,
    });
    expect(spy.mock.calls[0][1].method).toBe("POST");

    await updateTask("t-1", { status: "done" });
    expect(spy.mock.calls[1][1].method).toBe("PATCH");
    expect(spy.mock.calls[1][0]).toBe(`${V1}/tasks/t-1`);

    await deleteTask("t-1");
    expect(spy.mock.calls[2][1].method).toBe("DELETE");
  });
});

describe("invoices", () => {
  it("sends the draft as-is; the backend computes totals", async () => {
    const spy = stubOk({});
    await createInvoice({
      customer_id: "c-1",
      line_items: [{ description: "Laptop", quantity: 2, unit_price: 1200 }],
      tax_percent: 10,
    });

    const body = JSON.parse(spy.mock.calls[0][1].body);
    expect(body.customer_id).toBe("c-1");
    expect(body.line_items).toHaveLength(1);
    // No client-computed totals may be sent — they would be ignored at best.
    expect(body).not.toHaveProperty("total_amount");
    expect(body).not.toHaveProperty("subtotal");
  });

  it("marks paid with an amount", async () => {
    const spy = stubOk({});
    await updateInvoiceStatus("i-1", "paid", 500);

    expect(spy.mock.calls[0][0]).toBe(`${V1}/invoices/i-1/status`);
    expect(JSON.parse(spy.mock.calls[0][1].body)).toEqual({
      status: "paid",
      amount_paid: 500,
    });
  });

  it("sends null amount_paid when none is supplied", async () => {
    const spy = stubOk({});
    await updateInvoiceStatus("i-1", "sent");
    expect(JSON.parse(spy.mock.calls[0][1].body).amount_paid).toBeNull();
  });

  it.each([
    ["processRecurringInvoices", () => processRecurringInvoices(), "process-recurring"],
    ["processInvoiceReminders", () => processInvoiceReminders(), "process-reminders"],
  ] as const)("%s posts to the batch endpoint", async (_n, call, segment) => {
    const spy = stubOk({});
    await call();
    expect(spy.mock.calls[0][0]).toBe(`${V1}/invoices/${segment}`);
    expect(spy.mock.calls[0][1].method).toBe("POST");
  });
});

describe("quotation workflow", () => {
  it.each([
    ["send", (id: string) => sendQuotation(id)],
    ["approve", (id: string) => approveQuotation(id)],
    ["reject", (id: string) => rejectQuotation(id)],
  ] as const)("%s posts to its own action path", async (action, call) => {
    const spy = stubOk({});
    await call("q-1");
    expect(spy.mock.calls[0][0]).toBe(`${V1}/quotations/q-1/${action}`);
    expect(spy.mock.calls[0][1].method).toBe("POST");
  });
});

describe("PDF links", () => {
  // A browser navigation cannot carry an Authorization header, so the token
  // has to travel as a query param for these two.
  it("embeds the token in the invoice PDF url", () => {
    setToken("jwt-pdf");
    expect(invoicePdfUrl("i-1")).toBe(`${V1}/invoices/i-1/pdf?token=jwt-pdf`);
  });

  it("embeds the token in the quotation PDF url", () => {
    setToken("jwt-pdf");
    expect(quotationPdfUrl("q-1")).toBe(`${V1}/quotations/q-1/pdf?token=jwt-pdf`);
  });

  it("still produces a usable url when there is no token", () => {
    expect(invoicePdfUrl("i-1")).toContain("/invoices/i-1/pdf");
  });
});

describe("email", () => {
  it.each([
    ["emailInvoice", () => emailInvoice("i-1"), `${V1}/email/send-invoice/i-1`],
    ["emailQuotation", () => emailQuotation("q-1"), `${V1}/email/send-quotation/q-1`],
  ] as const)("%s posts to %s", async (_n, call, expected) => {
    const spy = stubOk({});
    await call();
    expect(spy.mock.calls[0][0]).toBe(expected);
    expect(spy.mock.calls[0][1].method).toBe("POST");
  });

  it("sends a composed email body", async () => {
    const spy = stubOk({});
    await sendEmail({
      to_email: "a@b.com",
      subject: "Hi",
      body_html: "<p>Hi</p>",
    });
    expect(JSON.parse(spy.mock.calls[0][1].body)).toMatchObject({
      to_email: "a@b.com",
      subject: "Hi",
    });
  });
});

describe("reports", () => {
  it("passes the period through", async () => {
    const spy = stubOk({});
    await getSalesReport("month");
    expect(spy.mock.calls[0][0]).toBe(`${V1}/reports/sales?period=month`);
  });

  it("defaults the period to all", async () => {
    const spy = stubOk({});
    await getSalesReport();
    expect(spy.mock.calls[0][0]).toContain("period=all");
  });

  it("productivity takes no period", async () => {
    const spy = stubOk({});
    await getProductivityReport();
    expect(spy.mock.calls[0][0]).toBe(`${V1}/reports/productivity`);
  });
});

describe("audit logs", () => {
  it("drops empty and 'all' filter values rather than sending them", async () => {
    const spy = stubOk([]);

    await listAuditLogs({
      actor_type: "all",
      action: "",
      resource_type: "invoice",
      limit: 50,
    });

    const url = new URL(spy.mock.calls[0][0]);
    // "all" is a UI concept meaning "no filter" — sending it would filter on
    // the literal string and silently return nothing.
    expect(url.searchParams.has("actor_type")).toBe(false);
    expect(url.searchParams.has("action")).toBe(false);
    expect(url.searchParams.get("resource_type")).toBe("invoice");
    expect(url.searchParams.get("limit")).toBe("50");
  });

  it("requests the stats endpoint", async () => {
    const spy = stubOk({});
    await getAuditStats();
    expect(spy.mock.calls[0][0]).toBe(`${V1}/audit-logs/stats`);
  });
});

describe("whatsapp, documents, meetings", () => {
  it("filters whatsapp messages by number when given", async () => {
    const spy = stubOk([]);
    await listWhatsAppMessages("+15550001111");
    expect(spy.mock.calls[0][0]).toBe(
      `${V1}/whatsapp/messages?from_number=%2B15550001111`,
    );
  });

  it("omits the filter when no number is given", async () => {
    const spy = stubOk([]);
    await listWhatsAppMessages();
    expect(spy.mock.calls[0][0]).toBe(`${V1}/whatsapp/messages`);
  });

  it("parses a document by id", async () => {
    const spy = stubOk({});
    await parseDocument("d-1");
    expect(spy.mock.calls[0][0]).toBe(`${V1}/documents/d-1/parse`);
    expect(spy.mock.calls[0][1].method).toBe("POST");
  });

  it("patches a nested meeting action item", async () => {
    const spy = stubOk({});
    await updateActionItem("m-1", "a-1", { is_completed: true });
    expect(spy.mock.calls[0][0]).toBe(`${V1}/meetings/m-1/action-items/a-1`);
    expect(spy.mock.calls[0][1].method).toBe("PATCH");
  });
});

describe("ai tool runner", () => {
  it("posts params to the named tool", async () => {
    const spy = stubOk({});
    await runAiTool("create_customer", { name: "Acme" });

    expect(spy.mock.calls[0][0]).toBe(`${V1}/ai-tools-test/create_customer`);
    expect(JSON.parse(spy.mock.calls[0][1].body)).toEqual({ name: "Acme" });
  });
});
