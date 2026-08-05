"use client";

/**
 * Quotations — live against backend/app/api/quotations.py.
 *
 * Includes the approval workflow: draft → send → approve / reject. Actions are
 * only offered when they are legal for the current status, so the UI does not
 * invite a request the backend will refuse.
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
} from "@/components/ui/primitives";
import { IconPlus, IconRefresh } from "@/components/ui/icons";
import { ErrorNotice } from "@/components/ErrorNotice";
import { LineItemEditor } from "@/components/LineItemEditor";
import {
  approveQuotation,
  createQuotation,
  listQuotations,
  rejectQuotation,
  sendQuotation,
} from "@/lib/api/operations";
import { listCustomers } from "@/lib/api/crm";
import { money, shortDate } from "@/lib/format";
import {
  QUOTATION_STATUSES,
  type Customer,
  type LineItemDraft,
  type Quotation,
  type QuotationStatus,
} from "@/lib/types";

const STATUS_TONE: Record<QuotationStatus, "ok" | "info" | "warn" | "danger" | "neutral"> = {
  draft: "neutral",
  sent: "info",
  approved: "ok",
  rejected: "danger",
  expired: "warn",
  converted: "accent" as never,
};

/** Which workflow actions make sense for each status. */
function actionsFor(status: QuotationStatus): ("send" | "approve" | "reject")[] {
  if (status === "draft") return ["send"];
  if (status === "sent") return ["approve", "reject"];
  return [];
}

export function QuotationsView() {
  const [quotations, setQuotations] = useState<Quotation[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [q, c] = await Promise.all([listQuotations(), listCustomers()]);
      setQuotations(q);
      setCustomers(c);
    } catch (err) {
      setError(err);
      setQuotations([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const customerName = (id: string) =>
    customers.find((c) => c.id === id)?.name ?? `Customer ${id.slice(0, 8)}`;

  const shown = (quotations ?? []).filter(
    (q) => statusFilter === "all" || q.status === statusFilter,
  );

  async function act(q: Quotation, action: "send" | "approve" | "reject") {
    setBusyId(q.id);
    setError(null);
    try {
      const fn =
        action === "send"
          ? sendQuotation
          : action === "approve"
            ? approveQuotation
            : rejectQuotation;
      const updated = await fn(q.id);
      setQuotations((prev) => prev?.map((x) => (x.id === updated.id ? updated : x)) ?? prev);
    } catch (err) {
      setError(err);
      void load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Quotations"
        description="Priced proposals with an approval workflow, before they become invoices."
        action={
          <div className="flex gap-2">
            <Button onClick={() => void load()} disabled={busy}>
              <IconRefresh className="size-3.5" />
              Refresh
            </Button>
            <Button
              variant="primary"
              onClick={() => setCreating(true)}
              disabled={customers.length === 0}
              title={customers.length === 0 ? "Add a customer first" : undefined}
            >
              <IconPlus className="size-3.5" />
              New quotation
            </Button>
          </div>
        }
      />

      {error ? <ErrorNotice error={error} onRetry={() => void load()} /> : null}

      <div className="w-48">
        <Field label="Status" htmlFor="q-status">
          <Select
            id="q-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            {QUOTATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Card>
        <CardHeader
          title="All quotations"
          description={quotations ? `${shown.length} shown` : "Loading…"}
          action={<Badge tone="ok">Live</Badge>}
        />

        {quotations === null ? (
          <CardBody className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </CardBody>
        ) : shown.length === 0 ? (
          <EmptyState
            title={quotations.length === 0 ? "No quotations yet" : "No matches"}
            description={
              customers.length === 0
                ? "Add a customer first — a quotation must be addressed to someone."
                : "Create a quotation to send a priced proposal."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-xs">
              <thead>
                <tr className="border-b border-line-soft text-[10px] uppercase tracking-wider text-ink-faint">
                  <th scope="col" className="px-5 py-3 font-medium">Number</th>
                  <th scope="col" className="px-5 py-3 font-medium">Customer</th>
                  <th scope="col" className="px-5 py-3 font-medium text-right">Total</th>
                  <th scope="col" className="px-5 py-3 font-medium">Valid until</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 font-medium text-right">Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {shown.map((q) => {
                  const actions = actionsFor(q.status);
                  return (
                    <tr key={q.id} className="transition hover:bg-surface-2/40">
                      <td className="px-5 py-3 font-mono text-[11px] text-ink">
                        {q.quotation_number}
                      </td>
                      <td className="px-5 py-3 text-ink-muted">
                        {customerName(q.customer_id)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-ink">
                        {money(q.total_amount, q.currency)}
                      </td>
                      <td className="px-5 py-3 tabular-nums text-ink-muted">
                        {shortDate(q.valid_until)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={STATUS_TONE[q.status] ?? "neutral"}>{q.status}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1.5">
                          {actions.length === 0 ? (
                            <span className="text-[10px] text-ink-faint">
                              No further action
                            </span>
                          ) : (
                            actions.map((a) => (
                              <Button
                                key={a}
                                variant={a === "reject" ? "danger" : "secondary"}
                                disabled={busyId === q.id}
                                onClick={() => void act(q, a)}
                              >
                                {busyId === q.id ? "…" : a}
                              </Button>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {creating ? (
        <QuotationDialog
          customers={customers}
          busy={busy}
          onCancel={() => setCreating(false)}
          onSave={async (draft) => {
            setBusy(true);
            setError(null);
            try {
              const created = await createQuotation(draft);
              setQuotations((prev) => (prev ? [created, ...prev] : [created]));
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

function QuotationDialog({
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
    quotation_number: string;
    currency: string;
    tax_percent: number;
    discount_percent: number;
    valid_until: string | null;
    notes: string | null;
    line_items: LineItemDraft[];
  }) => Promise<void>;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  // Quotation number is required by the backend and not auto-generated.
  const [number, setNumber] = useState(
    `QT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
  );
  const [items, setItems] = useState<LineItemDraft[]>([
    { description: "", quantity: 1, unit_price: 0 },
  ]);
  const [taxPercent, setTaxPercent] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");

  const validItems = items.filter((i) => i.description.trim() && i.quantity > 0);
  const canSave = !!customerId && number.trim().length > 2 && validItems.length > 0 && !busy;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-canvas/80 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="q-dialog-title"
    >
      <Card className="w-full max-w-2xl animate-fade-up shadow-2xl">
        <CardHeader
          title={<span id="q-dialog-title">New quotation</span>}
          description="Creates a draft. Send it to start the approval workflow."
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSave) return;
            void onSave({
              customer_id: customerId,
              quotation_number: number.trim(),
              currency,
              tax_percent: taxPercent,
              discount_percent: discountPercent,
              valid_until: validUntil || null,
              notes: notes.trim() || null,
              line_items: validItems,
            });
          }}
        >
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Customer" htmlFor="q-customer">
                <Select
                  id="q-customer"
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
              <Field
                label="Quotation number"
                htmlFor="q-number"
                hint="Must be unique. Pre-filled, edit if you use your own scheme."
              >
                <Input
                  id="q-number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Currency" htmlFor="q-currency">
                <Input
                  id="q-currency"
                  value={currency}
                  maxLength={3}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              </Field>
              <Field label="Tax %" htmlFor="q-tax">
                <Input
                  id="q-tax"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  className="tabular-nums"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value))}
                />
              </Field>
              <Field label="Discount %" htmlFor="q-disc">
                <Input
                  id="q-disc"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  className="tabular-nums"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                />
              </Field>
              <Field label="Valid until" htmlFor="q-valid">
                <Input
                  id="q-valid"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
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

            <Field label="Notes" htmlFor="q-notes">
              <Textarea
                id="q-notes"
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
              {busy ? "Creating…" : "Create quotation"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
