"use client";

/**
 * Customers — live against backend/app/api/customers.py.
 *
 * No preview fallback: these endpoints exist, so failures are shown as errors
 * rather than being papered over with fixtures.
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
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from "@/lib/api/crm";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Customer, CustomerDraft } from "@/lib/types";

const STATUS_OPTIONS = ["active", "inactive", "prospect"] as const;

export function CustomersView() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Customer | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setCustomers(await listCustomers());
    } catch (err) {
      setError(err);
      setCustomers([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!customers) return [];
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter !== "all" && (c.status ?? "") !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.company_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [customers, query, statusFilter]);

  async function save(draft: CustomerDraft, existing: Customer | null) {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      if (existing) {
        const updated = await updateCustomer(existing.id, draft);
        setCustomers((prev) =>
          prev ? prev.map((c) => (c.id === updated.id ? updated : c)) : prev,
        );
      } else {
        const created = await createCustomer(draft, user.company_id);
        setCustomers((prev) => (prev ? [...prev, created] : [created]));
      }
      setEditing(null);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function remove(customer: Customer) {
    setBusy(true);
    setError(null);
    try {
      await deleteCustomer(customer.id);
      setCustomers((prev) => (prev ? prev.filter((c) => c.id !== customer.id) : prev));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Customers"
        description="Every customer record in the CRM. Backed by live backend endpoints."
        action={
          <div className="flex gap-2">
            <Button onClick={() => void load()} disabled={busy}>
              <IconRefresh className={cn("size-3.5", busy && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="primary" onClick={() => setEditing("new")}>
              <IconPlus className="size-3.5" />
              New customer
            </Button>
          </div>
        }
      />

      {error ? <ErrorNotice error={error} onRetry={() => void load()} /> : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <Field label="Search" htmlFor="cust-search">
            <Input
              id="cust-search"
              placeholder="Name, email, or company…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
        </div>
        <div className="w-44">
          <Field label="Status" htmlFor="cust-status">
            <Select
              id="cust-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
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
          title="All customers"
          description={
            customers ? `${filtered.length} of ${customers.length} shown` : "Loading…"
          }
          action={<Badge tone="ok">Live</Badge>}
        />

        {customers === null ? (
          <CardBody className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </CardBody>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={customers.length === 0 ? "No customers yet" : "No matches"}
            description={
              customers.length === 0
                ? "Add your first customer to start tracking relationships."
                : "Try a different search term or status."
            }
            action={
              customers.length === 0 ? (
                <Button variant="primary" onClick={() => setEditing("new")}>
                  <IconPlus className="size-3.5" />
                  New customer
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-xs">
              <thead>
                <tr className="border-b border-line-soft text-[10px] uppercase tracking-wider text-ink-faint">
                  <th scope="col" className="px-5 py-3 font-medium">Customer</th>
                  <th scope="col" className="px-5 py-3 font-medium">Company</th>
                  <th scope="col" className="px-5 py-3 font-medium">Phone</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 font-medium">Added</th>
                  <th scope="col" className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {filtered.map((c) => (
                  <tr key={c.id} className="transition hover:bg-surface-2/40">
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">{c.name}</p>
                      <p className="text-[11px] text-ink-faint">{c.email ?? "—"}</p>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">{c.company_name ?? "—"}</td>
                    <td className="px-5 py-3 text-ink-muted">{c.phone ?? "—"}</td>
                    <td className="px-5 py-3">
                      <Badge tone={c.status === "active" ? "ok" : "neutral"}>
                        {c.status ?? "unset"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" onClick={() => setEditing(c)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => void remove(c)}
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
        <CustomerDialog
          customer={editing === "new" ? null : editing}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      ) : null}
    </>
  );
}

/* ---------------------------- Create / edit ---------------------------- */

function CustomerDialog({
  customer,
  busy,
  onCancel,
  onSave,
}: {
  customer: Customer | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (draft: CustomerDraft, existing: Customer | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState<CustomerDraft>({
    name: customer?.name ?? "",
    email: customer?.email ?? null,
    phone: customer?.phone ?? null,
    company_name: customer?.company_name ?? null,
    address: customer?.address ?? null,
    status: customer?.status ?? "active",
  });

  const canSave = draft.name.trim().length > 1 && !busy;

  function set<K extends keyof CustomerDraft>(key: K, value: string) {
    setDraft((d) => ({ ...d, [key]: value || null }) as CustomerDraft);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-canvas/80 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cust-dialog-title"
    >
      <Card className="w-full max-w-lg animate-fade-up shadow-2xl">
        <CardHeader
          title={
            <span id="cust-dialog-title">
              {customer ? `Edit ${customer.name}` : "New customer"}
            </span>
          }
          description="Maps to the Customer model in the CRM."
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave) void onSave({ ...draft, name: draft.name.trim() }, customer);
          }}
        >
          <CardBody className="space-y-4">
            <Field label="Name" htmlFor="c-name">
              <Input
                id="c-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                autoFocus
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" htmlFor="c-email">
                <Input
                  id="c-email"
                  type="email"
                  value={draft.email ?? ""}
                  onChange={(e) => set("email", e.target.value)}
                />
              </Field>
              <Field label="Phone" htmlFor="c-phone">
                <Input
                  id="c-phone"
                  value={draft.phone ?? ""}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Company" htmlFor="c-company">
              <Input
                id="c-company"
                value={draft.company_name ?? ""}
                onChange={(e) => set("company_name", e.target.value)}
              />
            </Field>

            <Field label="Address" htmlFor="c-address">
              <Input
                id="c-address"
                value={draft.address ?? ""}
                onChange={(e) => set("address", e.target.value)}
              />
            </Field>

            <Field label="Status" htmlFor="c-status">
              <Select
                id="c-status"
                value={draft.status ?? "active"}
                onChange={(e) => set("status", e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
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
              {busy ? "Saving…" : customer ? "Save changes" : "Create customer"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
