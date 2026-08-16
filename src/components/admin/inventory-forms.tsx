"use client";

import { useState } from "react";
import { ActionForm, Field, InlineSubmitForm, Select, TextArea, TextInput } from "@/components/admin/ui";
import {
  createAdjustmentAction,
  createTransferAction,
  updateAdjustmentStatusAction,
  updateTransferItemStatusAction,
  updateTransferStatusAction,
} from "@/lib/admin/inventory-actions";

export function TransferForm({
  locations,
  variants,
}: {
  locations: { id: string; name: string }[];
  variants: { id: string; name: string; sku: string; products: { name: string } | null }[];
}) {
  const [rows, setRows] = useState<number[]>([0]);

  return (
    <ActionForm
      action={createTransferAction}
      submitLabel="Create transfer"
      pendingLabel="Creating…"
      cancelHref="/admin/inventory/transfers"
      className="max-w-3xl space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From location" htmlFor="transfer-from" required>
          <Select id="transfer-from" name="fromLocationId" required>
            <option value="">Select source…</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="To location" htmlFor="transfer-to" required>
          <Select id="transfer-to" name="toLocationId" required>
            <option value="">Select destination…</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
          Items
        </p>
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row} className="grid gap-2 sm:grid-cols-[1fr_8rem]">
              <Select name={`variantId-${row}`} required aria-label={`Variant ${row + 1}`}>
                <option value="">Select variant…</option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name} ({variant.sku}) — {variant.products?.name ?? "—"}
                  </option>
                ))}
              </Select>
              <TextInput
                name={`quantity-${row}`}
                type="number"
                required
                min="0.001"
                step="0.001"
                inputMode="decimal"
                placeholder="Qty"
                aria-label={`Quantity ${row + 1}`}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRows((current) => [...current, current.length])}
          className="mt-2 text-[11px] font-semibold text-navy hover:underline"
        >
          + Add another item
        </button>
      </div>

      <Field label="Notes" htmlFor="transfer-notes">
        <TextArea id="transfer-notes" name="notes" rows={3} />
      </Field>
    </ActionForm>
  );
}

export function TransferStatusForm({ transferId }: { transferId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <InlineSubmitForm
        action={updateTransferStatusAction}
        label="Mark received"
        pendingLabel="Saving…"
        variant="primary"
      >
        <input type="hidden" name="transferId" value={transferId} />
        <input type="hidden" name="status" value="received" />
      </InlineSubmitForm>
      <InlineSubmitForm
        action={updateTransferStatusAction}
        label="Cancel transfer"
        pendingLabel="Saving…"
      >
        <input type="hidden" name="transferId" value={transferId} />
        <input type="hidden" name="status" value="cancelled" />
      </InlineSubmitForm>
    </div>
  );
}

export function TransferItemStatusForm({
  itemId,
  currentStatus,
}: {
  itemId: string;
  currentStatus: string;
}) {
  const next = currentStatus === "pending" ? "shipped" : "received";
  return (
    <InlineSubmitForm
      action={updateTransferItemStatusAction}
      label={`Mark ${next}`}
      pendingLabel="Saving…"
      variant="secondary"
    >
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="status" value={next} />
    </InlineSubmitForm>
  );
}

export function AdjustmentForm({
  inventoryItems,
}: {
  inventoryItems: {
    id: string;
    location_id: string;
    quantity_on_hand: number;
    product_variants: { id: string; name: string; sku: string } | null;
    locations: { name: string } | null;
  }[];
}) {
  const [rows, setRows] = useState<number[]>([0]);

  return (
    <ActionForm
      action={createAdjustmentAction}
      submitLabel="Create adjustment"
      pendingLabel="Creating…"
      cancelHref="/admin/inventory/adjustments"
      className="max-w-3xl space-y-4"
    >
      <Field label="Reason" htmlFor="adjustment-reason" required>
        <TextInput
          id="adjustment-reason"
          name="reason"
          required
          minLength={3}
          placeholder="e.g. Cycle count correction"
        />
      </Field>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
          Items — signed quantity, e.g. +5 or -3
        </p>
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row} className="grid gap-2 sm:grid-cols-[1fr_8rem]">
              <Select name={`inventoryItemId-${row}`} required aria-label={`Item ${row + 1}`}>
                <option value="">Select inventory item…</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.product_variants?.name ?? "—"} ({item.product_variants?.sku ?? "—"}) ·{" "}
                    {item.locations?.name ?? "—"} · on hand {item.quantity_on_hand}
                  </option>
                ))}
              </Select>
              <TextInput
                name={`quantityChange-${row}`}
                type="number"
                required
                step="0.001"
                inputMode="decimal"
                placeholder="e.g. +5"
                aria-label={`Quantity change ${row + 1}`}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRows((current) => [...current, current.length])}
          className="mt-2 text-[11px] font-semibold text-navy hover:underline"
        >
          + Add another item
        </button>
      </div>

      <Field label="Per-item reason (optional)" htmlFor="adjustment-item-reason">
        <TextInput
          id="adjustment-item-reason"
          name="itemReason-0"
          placeholder="Overrides the main reason for item 1"
        />
      </Field>
    </ActionForm>
  );
}

export function AdjustmentStatusForm({ adjustmentId }: { adjustmentId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <InlineSubmitForm
        action={updateAdjustmentStatusAction}
        label="Apply adjustment"
        pendingLabel="Saving…"
        variant="primary"
      >
        <input type="hidden" name="adjustmentId" value={adjustmentId} />
        <input type="hidden" name="status" value="applied" />
      </InlineSubmitForm>
      <InlineSubmitForm
        action={updateAdjustmentStatusAction}
        label="Cancel adjustment"
        pendingLabel="Saving…"
      >
        <input type="hidden" name="adjustmentId" value={adjustmentId} />
        <input type="hidden" name="status" value="cancelled" />
      </InlineSubmitForm>
    </div>
  );
}