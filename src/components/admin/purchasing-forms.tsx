"use client";

import { useState, useId } from "react";
import { ActionForm, Field, Select, TextInput, TextArea } from "@/components/admin/ui";
import {
  createGoodsReceiptAction,
  createPurchaseOrderAction,
  createPurchasePaymentAction,
  createSupplierInvoiceAction,
  updateGoodsReceiptStatusAction,
  updatePurchaseOrderStatusAction,
  updateSupplierInvoiceStatusAction,
} from "@/lib/admin/purchasing-actions";

export function VariantRows({
  prefix,
  variants,
}: {
  prefix: string;
  variants: { id: string; name: string; sku: string; products: { name: string } | null }[];
}) {
  const [rows, setRows] = useState([0]);
  const fieldName = (rowIndex: number, field: string) => `${field}-${prefix}-${rowIndex}`;

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={row} className="grid gap-2 sm:grid-cols-[1fr_110px_120px_36px]">
          <Field label={index === 0 ? "Variant" : undefined} htmlFor={fieldName(row, "variantId")}>
            <Select id={fieldName(row, "variantId")} name={fieldName(row, "variantId")} required>
              <option value="">Select variant…</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name} ({variant.sku}) — {variant.products?.name ?? "—"}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={index === 0 ? "Quantity" : undefined}
            htmlFor={fieldName(row, "quantity")}
          >
            <TextInput
              id={fieldName(row, "quantity")}
              name={fieldName(row, "quantity")}
              type="number"
              min="0.001"
              step="0.001"
              required
            />
          </Field>
          <Field
            label={index === 0 ? "Unit cost (GH₵)" : undefined}
            htmlFor={fieldName(row, "unitCost")}
          >
            <TextInput
              id={fieldName(row, "unitCost")}
              name={fieldName(row, "unitCost")}
              type="number"
              min="0"
              step="0.01"
              required
            />
          </Field>
          <div className="flex items-end pb-0.5">
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows((current) => current.filter((r) => r !== row))}
                className="rounded border border-line px-2 py-1.5 text-xs text-danger hover:bg-danger-soft"
                aria-label="Remove row"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((current) => [...current, current.length])}
        className="text-[11px] font-semibold text-navy hover:underline"
      >
        + Add line
      </button>
    </div>
  );
}

export function PurchaseOrderForm({
  suppliers,
  locations,
  variants,
}: {
  suppliers: { id: string; name: string; supplierCode: string }[];
  locations: { id: string; name: string }[];
  variants: { id: string; name: string; sku: string; products: { name: string } | null }[];
}) {
  const uid = useId();
  return (
    <ActionForm
      action={createPurchaseOrderAction}
      submitLabel="Create purchase order"
      pendingLabel="Creating…"
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Supplier" htmlFor="po-supplier" required>
          <Select id="po-supplier" name="supplierId" required>
            <option value="">Select supplier…</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name} ({supplier.supplierCode})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Receiving location" htmlFor="po-location" required>
          <Select id="po-location" name="locationId" required>
            <option value="">Select location…</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Expected delivery" htmlFor="po-expected">
          <TextInput id="po-expected" name="expectedDate" type="date" />
        </Field>
      </div>
      <VariantRows prefix={uid} variants={variants} />
      <Field label="Notes" htmlFor="po-notes">
        <TextArea id="po-notes" name="notes" rows={3} />
      </Field>
    </ActionForm>
  );
}

export function PurchaseOrderStatusForm({ poId, current }: { poId: string; current: string }) {
  return (
    <ActionForm
      action={updatePurchaseOrderStatusAction}
      submitLabel="Update status"
      pendingLabel="Updating…"
      className="space-y-3"
    >
      <input type="hidden" name="poId" value={poId} />
      <Field label="Status" htmlFor="po-status" required>
        <Select id="po-status" name="status" required defaultValue={current}>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="partially_received">Partially received</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </Field>
    </ActionForm>
  );
}

export function GoodsReceiptForm({
  purchaseOrders,
  locations,
  variants,
}: {
  purchaseOrders: { id: string; poNumber: string; supplierName: string }[];
  locations: { id: string; name: string }[];
  variants: { id: string; name: string; sku: string; products: { name: string } | null }[];
}) {
  const uid = useId();
  return (
    <ActionForm
      action={createGoodsReceiptAction}
      submitLabel="Create receipt"
      pendingLabel="Creating…"
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Purchase order (optional)" htmlFor="gr-po">
          <Select id="gr-po" name="purchaseOrderId">
            <option value="">No purchase order</option>
            {purchaseOrders.map((po) => (
              <option key={po.id} value={po.id}>
                {po.poNumber} — {po.supplierName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Receiving location" htmlFor="gr-location" required>
          <Select id="gr-location" name="locationId" required>
            <option value="">Select location…</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Received date" htmlFor="gr-date" required>
          <TextInput id="gr-date" name="receivedDate" type="date" required />
        </Field>
      </div>
      <VariantRows prefix={uid} variants={variants} />
      <Field label="Notes" htmlFor="gr-notes">
        <TextArea id="gr-notes" name="notes" rows={3} />
      </Field>
    </ActionForm>
  );
}

export function GoodsReceiptStatusForm({
  receiptId,
  current,
}: {
  receiptId: string;
  current: string;
}) {
  return (
    <ActionForm
      action={updateGoodsReceiptStatusAction}
      submitLabel="Update status"
      pendingLabel="Updating…"
      className="space-y-3"
    >
      <input type="hidden" name="receiptId" value={receiptId} />
      <Field label="Status" htmlFor="gr-status" required>
        <Select id="gr-status" name="status" required defaultValue={current}>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </Field>
    </ActionForm>
  );
}

export function SupplierInvoiceForm({
  suppliers,
  purchaseOrders,
}: {
  suppliers: { id: string; name: string; supplierCode: string }[];
  purchaseOrders: { id: string; poNumber: string; supplierName: string }[];
}) {
  return (
    <ActionForm
      action={createSupplierInvoiceAction}
      submitLabel="Record invoice"
      pendingLabel="Recording…"
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Supplier" htmlFor="inv-supplier" required>
          <Select id="inv-supplier" name="supplierId" required>
            <option value="">Select supplier…</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name} ({supplier.supplierCode})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Invoice number (supplier's)" htmlFor="inv-number" required>
          <TextInput id="inv-number" name="invoiceNumber" required placeholder="e.g. SUP-2026-011" />
        </Field>
        <Field label="Purchase order (optional)" htmlFor="inv-po">
          <Select id="inv-po" name="purchaseOrderId">
            <option value="">No purchase order</option>
            {purchaseOrders.map((po) => (
              <option key={po.id} value={po.id}>
                {po.poNumber} — {po.supplierName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Invoice date" htmlFor="inv-date" required>
          <TextInput id="inv-date" name="invoiceDate" type="date" required />
        </Field>
        <Field label="Due date" htmlFor="inv-due">
          <TextInput id="inv-due" name="dueDate" type="date" />
        </Field>
        <Field label="Amount (GH₵)" htmlFor="inv-amount" required>
          <TextInput id="inv-amount" name="amount" type="number" min="0.01" step="0.01" required />
        </Field>
      </div>
      <Field label="Notes" htmlFor="inv-notes">
        <TextArea id="inv-notes" name="notes" rows={3} />
      </Field>
    </ActionForm>
  );
}

export function SupplierInvoiceStatusForm({
  invoiceId,
  current,
}: {
  invoiceId: string;
  current: string;
}) {
  return (
    <ActionForm
      action={updateSupplierInvoiceStatusAction}
      submitLabel="Update status"
      pendingLabel="Updating…"
      className="space-y-3"
    >
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <Field label="Status" htmlFor="inv-status" required>
        <Select id="inv-status" name="status" required defaultValue={current}>
          <option value="pending">Pending</option>
          <option value="partially_paid">Partially paid</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </Field>
    </ActionForm>
  );
}

export function PurchasePaymentForm({
  suppliers,
  invoices,
  purchaseOrders,
}: {
  suppliers: { id: string; name: string; supplierCode: string }[];
  invoices: { id: string; invoiceNumber: string; supplierName: string; status: string }[];
  purchaseOrders: { id: string; poNumber: string; supplierName: string }[];
}) {
  return (
    <ActionForm
      action={createPurchasePaymentAction}
      submitLabel="Record payment"
      pendingLabel="Recording…"
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Supplier" htmlFor="pay-supplier" required>
          <Select id="pay-supplier" name="supplierId" required>
            <option value="">Select supplier…</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name} ({supplier.supplierCode})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Invoice (optional)" htmlFor="pay-invoice">
          <Select id="pay-invoice" name="invoiceId">
            <option value="">No invoice</option>
            {invoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.invoiceNumber} — {invoice.supplierName} ({invoice.status})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Purchase order (optional)" htmlFor="pay-po">
          <Select id="pay-po" name="purchaseOrderId">
            <option value="">No purchase order</option>
            {purchaseOrders.map((po) => (
              <option key={po.id} value={po.id}>
                {po.poNumber} — {po.supplierName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount (GH₵)" htmlFor="pay-amount" required>
          <TextInput id="pay-amount" name="amount" type="number" min="0.01" step="0.01" required />
        </Field>
        <Field label="Payment date" htmlFor="pay-date" required>
          <TextInput id="pay-date" name="paymentDate" type="date" required />
        </Field>
        <Field label="Method" htmlFor="pay-method" required>
          <Select id="pay-method" name="method" required defaultValue="bank_transfer">
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile money</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Reference" htmlFor="pay-reference">
          <TextInput id="pay-reference" name="reference" placeholder="e.g. transfer receipt no." />
        </Field>
      </div>
      <Field label="Notes" htmlFor="pay-notes">
        <TextArea id="pay-notes" name="notes" rows={3} />
      </Field>
    </ActionForm>
  );
}