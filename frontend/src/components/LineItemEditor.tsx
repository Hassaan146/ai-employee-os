"use client";

/**
 * Line-item builder shared by the invoice and quotation forms.
 *
 * Totals shown here are a client-side preview only. The backend recomputes
 * subtotal, tax, discount, and total on save (services/calculations.py), and
 * its numbers are authoritative — the preview exists so the user isn't typing
 * blind, not to be the source of truth.
 */

import { Button, Field, Input } from "@/components/ui/primitives";
import { money } from "@/lib/format";
import type { LineItemDraft } from "@/lib/types";

export function LineItemEditor({
  items,
  currency,
  taxPercent,
  discountPercent,
  onChange,
}: {
  items: LineItemDraft[];
  currency: string;
  taxPercent: number;
  discountPercent: number;
  onChange: (items: LineItemDraft[]) => void;
}) {
  function update(index: number, patch: Partial<LineItemDraft>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  const subtotal = items.reduce(
    (sum, it) => sum + (it.quantity || 0) * (it.unit_price || 0),
    0,
  );
  const discountAmount = subtotal * (discountPercent / 100);
  const taxAmount = (subtotal - discountAmount) * (taxPercent / 100);
  const total = subtotal - discountAmount + taxAmount;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="flex-1">
              <Field label={i === 0 ? "Description" : ""} htmlFor={`li-desc-${i}`}>
                <Input
                  id={`li-desc-${i}`}
                  value={item.description}
                  placeholder="e.g. Laptop — Dell XPS 15"
                  onChange={(e) => update(i, { description: e.target.value })}
                />
              </Field>
            </div>
            <div className="w-20">
              <Field label={i === 0 ? "Qty" : ""} htmlFor={`li-qty-${i}`}>
                <Input
                  id={`li-qty-${i}`}
                  type="number"
                  min={0}
                  step="1"
                  className="tabular-nums"
                  value={item.quantity}
                  onChange={(e) => update(i, { quantity: Number(e.target.value) })}
                />
              </Field>
            </div>
            <div className="w-28">
              <Field label={i === 0 ? "Unit price" : ""} htmlFor={`li-price-${i}`}>
                <Input
                  id={`li-price-${i}`}
                  type="number"
                  min={0}
                  step="0.01"
                  className="tabular-nums"
                  value={item.unit_price}
                  onChange={(e) => update(i, { unit_price: Number(e.target.value) })}
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              disabled={items.length === 1}
              aria-label={`Remove line item ${i + 1}`}
              className="mb-1 rounded border border-line px-2 py-2 text-[10px] text-ink-faint transition hover:border-danger/40 hover:text-danger disabled:opacity-40"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <Button
        onClick={() => onChange([...items, { description: "", quantity: 1, unit_price: 0 }])}
      >
        Add line item
      </Button>

      <dl className="space-y-1 border-t border-line-soft pt-3 text-[11px]">
        <Row label="Subtotal" value={money(subtotal, currency)} />
        {discountPercent > 0 ? (
          <Row
            label={`Discount (${discountPercent}%)`}
            value={`− ${money(discountAmount, currency)}`}
          />
        ) : null}
        {taxPercent > 0 ? (
          <Row label={`Tax (${taxPercent}%)`} value={money(taxAmount, currency)} />
        ) : null}
        <div className="flex justify-between gap-3 border-t border-line-soft pt-1.5">
          <dt className="font-medium text-ink">Total (preview)</dt>
          <dd className="font-semibold tabular-nums text-accent">
            {money(total, currency)}
          </dd>
        </div>
      </dl>
      <p className="text-[10px] text-ink-faint">
        Final amounts are calculated by the backend on save.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}
