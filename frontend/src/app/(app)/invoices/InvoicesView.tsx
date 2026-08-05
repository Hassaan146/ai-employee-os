"use client";

/**
 * Invoices — live against backend/app/api/invoices.py.
 *
 * Totals are computed and returned by the backend; this view only displays
 * them. Money columns use tabular figures so digits align down the column.
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
import { LineItemEditor } from "@/components/LineItemEditor";
import {
  createInvoice,
  deleteInvoice,
  listInvoices,
  updateInvoiceStatus,
} from "@/lib/api/operations";
import { listCustomers } from "@/lib/api/crm";
import { money, shortDate } from "@/lib/format";
import {
  INVOICE_STATUSES,
  type Customer,
  type Invoice,
  type LineItemDraft,
} from "@/lib/types";

const STATUS_TONE: Record<string, "ok" | "info" | "warn" | "danger" | "neutral"> = {
  draft: "neutral",
  sent: "info",
  paid: "ok",
  partially_paid: "warn",
  overdue: "danger",
  cancelled: "neutral",
};

export function InvoicesView() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<Invoice | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [inv, cus] = await Promise.all([listInvoices(), listCustomers()]);
      setInvoices(inv);
      setCustomers(cus);
    } catch (err) {
      setError(err);
      setInvoices([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const customerName = (id: string) =>
    customers.find((c) => c.id === id)?.name ?? `Customer ${id.slice(0, 8)}`;

  const shown = (invoices ?? []).filter(
    (i) => statusFilter === "all" || i.status === statusFilter,
  );

  const outstanding = (invoices ?? [])
    .filter((i) => i.status !== "paid" && i.status !== "cancelled")
    .reduce((s, i) => s + (i.total_amount - i.amount_paid), 0);

  async function setStatus(inv: Invoice, status: string) {
    setBusy(true);
    setError(null);
    try {
      const updated = await updateInvoiceStatus(
        inv.id,
        status,
        status === "paid" ? inv.total_amount : undefined,
      );
      setInvoices((prev) => prev?.map((i) => (i.id === updated.id ? updated : i)) ?? prev);
    } catch (err) {
      setError(err);
      void load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(inv: Invoice) {
    setBusy(true);
    try {
      await deleteInvoice(inv.id);
      setInvoices((prev) => prev?.filter((i) => i.id !== inv.id) ?? prev);
      setConfirming(null);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Billing documents with tax, discounts, and payment tracking."
        action={
          <div className="flex gap-2">
            <Button onClick={() => void load()} disabled={busy}>
              <IconRefresh className={cn("size-3.5", busy && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="primary"
              onClick={() => setCreating(true)}
              disabled={customers.length === 0}
              title={customers.length === 0 ? "Add a customer first" : undefined}
            >
              <IconPlus className="size-3.5" />
              New invoice
            </Button>
          </div>
        }
      />

      {error ? <ErrorNotice error={error} onRetry={() => void load()} /> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <Tile label="Invoices" value={invoices ? String(invoices.length) : null} />
        <Tile label="Outstanding" value={invoices ? money(outstanding) : null} />
        <Tile
          label="Paid"
          value={
            invoices ? String(invoices.filter((i) => i.status === "paid").length) : null
          }
        />
      </section>

      <div className="w-48">
        <Field label="Status" htmlFor="inv-status">
          <Select
            id="inv-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Card>
        <CardHeader
          title="All invoices"
          description={invoices ? `${shown.length} shown` : "Loading…"}
          action={<Badge tone="ok">Live</Badge>}
        />

        {invoices === null ? (
          <CardBody className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </CardBody>
        ) : shown.length === 0 ? (
          <EmptyState
            title={invoices.length === 0 ? "No invoices yet" : "No matches"}
            description={
              customers.length === 0
                ? "Add a customer first — an invoice must be billed to someone."
                : "Create an invoice to start tracking payment."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-xs">
              <thead>
                <tr className="border-b border-line-soft text-[10px] uppercase tracking-wider text-ink-faint">
                  <th scope="col" className="px-5 py-3 font-medium">Invoice</th>
                  <th scope="col" className="px-5 py-3 font-medium">Customer</th>
                  <th scope="col" className="px-5 py-3 font-medium text-right">Total</th>
                  <th scope="col" className="px-5 py-3 font-medium text-right">Paid</th>
                  <th scope="col" className="px-5 py-3 font-medium">Due</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {shown.map((inv) => (
                  <tr key={inv.id} className="transition hover:bg-surface-2/40">
                    <td className="px-5 py-3 font-mono text-[11px] text-ink">
                      {inv.invoice_number}
                    </td>
                    <td className="px-5 py-3 text-ink-muted">
                      {customerName(inv.customer_id)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink">
                      {money(inv.total_amount, inv.currency)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink-muted">
                      {money(inv.amount_paid, inv.currency)}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-ink-muted">
                      {shortDate(inv.due_date)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS_TONE[inv.status] ?? "neutral"}>
                        {inv.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <label className="sr-only" htmlFor={`inv-st-${inv.id}`}>
                          Change status of invoice {inv.invoice_number}
                        </label>
                        <select
                          id={`inv-st-${inv.id}`}
                          value={inv.status}
                          disabled={busy}
                          onChange={(e) => void setStatus(inv, e.target.value)}
                          className="rounded border border-line bg-canvas px-1.5 py-1 text-[10px] text-ink-muted focus:border-accent/50 focus:outline-none"
                        >
                          {INVOICE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                        <Button variant="danger" onClick={() => setConfirming(inv)}>
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

      {creating ? (
        <InvoiceDialog
          customers={customers}
          busy={busy}
          onCancel={() => setCreating(false)}
          onSave={async (draft) => {
            setBusy(true);
            setError(null);
            try {
              const created = await createInvoice(draft);
              setInvoices((prev) => (prev ? [created, ...prev] : [created]));
              setCreating(false);
            } catch (err) {
              setError(err);
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}

      {confirming ? (
        <ConfirmDialog
          title="Delete this invoice?"
          body={`Invoice ${confirming.invoice_number} will be permanently removed. This cannot be undone.`}
          busy={busy}
          onConfirm={() => void remove(confirming)}
          onCancel={() => setConfirming(null)}
        />
      ) : null}
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
          <Skeleton className="h-7 w-24" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {value}
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function InvoiceDialog({
  customers,
  busy,
  onCancel,
  onSave,
}: {
  customers: Customer[];
  busy: boolean;
  onCancel: () => void;
  onSave: (draft: {
    customer_id: string;
    line_items: LineItemDraft[];
    tax_percent: number;
    discount_percent: number;
    currency: string;
    due_date: string | null;
    notes: string | null;
  }) => Promise<void>;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [items, setItems] = useState<LineItemDraft[]>([
    { description: "", quantity: 1, unit_price: 0 },
  ]);
  const [taxPercent, setTaxPercent] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const validItems = items.filter((i) => i.description.trim() && i.quantity > 0);
  const canSave = !!customerId && validItems.length > 0 && !busy;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-canvas/80 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inv-dialog-title"
    >
      <Card className="w-full max-w-2xl animate-fade-up shadow-2xl">
        <CardHeader
          title={<span id="inv-dialog-title">New invoice</span>}
          description="The backend calculates subtotal, tax, discount, and total."
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSave) return;
            void onSave({
              customer_id: customerId,
              line_items: validItems,
              tax_percent: taxPercent,
              discount_percent: discountPercent,
              currency,
              due_date: dueDate || null,
              notes: notes.trim() || null,
            });
          }}
        >
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bill to" htmlFor="inv-customer">
                <Select
                  id="inv-customer"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Due date" htmlFor="inv-due">
                <Input
                  id="inv-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Currency" htmlFor="inv-currency">
                <Input
                  id="inv-currency"
                  value={currency}
                  maxLength={3}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              </Field>
              <Field label="Tax %" htmlFor="inv-tax">
                <Input
                  id="inv-tax"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  className="tabular-nums"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value))}
                />
              </Field>
              <Field label="Discount %" htmlFor="inv-disc">
                <Input
                  id="inv-disc"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  className="tabular-nums"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                />
              </Field>
            </div>

            <LineItemEditor
              items={items}
              currency={currency}
              taxPercent={taxPercent}
              discountPercent={discountPercent}
              onChange={setItems}
            />

            <Field label="Notes" htmlFor="inv-notes">
              <Textarea
                id="inv-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </CardBody>

          <div className="flex justify-end gap-2 border-t border-line-soft px-5 py-3.5">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canSave}>
              {busy ? "Creating…" : "Create invoice"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
