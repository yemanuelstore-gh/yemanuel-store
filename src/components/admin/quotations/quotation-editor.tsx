"use client";

import { useActionState, useState } from "react";
import { Field, TextArea, TextInput } from "@/components/admin/ui";
import { formatGHS } from "@/lib/format";
import { roundMoney } from "@/lib/pricing";
import type { ActionResult } from "@/components/admin/ui";
import type { QuotationCatalogueItem } from "@/lib/admin/quotation-catalogue";
import type { QuotationDetail } from "@/lib/admin/quotations";
import { cn } from "@/lib/cn";
import { PosIcon } from "@/components/admin/pos/pos-icons";
import { QuotationCustomerPicker, type QuotationCustomer } from "./customer-picker";
import { QuotationItemPicker } from "./item-picker";

export type EditorLine = {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  /** Authoritative unit price resolved by the server search. */
  price: number;
  quantity: number;
  discount: number;
};

function defaultDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function QuotationEditor({
  quotation,
  canSend,
  action,
}: {
  quotation?: QuotationDetail;
  canSend: boolean;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const editing = quotation !== undefined;

  const [customer, setCustomer] = useState<QuotationCustomer | null>(
    quotation?.customer && quotation.customer.id !== ""
      ? { id: quotation.customer.id, name: quotation.customer.name, phone: quotation.customer.phone ?? "" }
      : null,
  );
  const [guestName, setGuestName] = useState(
    quotation?.customer && quotation.customer.id === "" ? quotation.customer.name : "",
  );
  const [guestPhone, setGuestPhone] = useState(
    quotation?.customer && quotation.customer.id === "" ? (quotation.customer.phone ?? "") : "",
  );
  const [quotationDate, setQuotationDate] = useState(quotation?.quotationDate ?? defaultDate(0));
  const [validUntil, setValidUntil] = useState(quotation?.validUntil ?? defaultDate(30));
  const [lines, setLines] = useState<EditorLine[]>(
    quotation?.items.map((item) => ({
      variantId: item.variantId ?? "",
      productName: item.productName,
      variantName: item.variantName,
      sku: item.sku,
      price: item.unitPrice,
      quantity: item.quantity,
      discount: item.discountAmount,
    })) ?? [],
  );
  const [discountTotal, setDiscountTotal] = useState(
    quotation ? String(quotation.discountTotal) : "",
  );
  const [customerNotes, setCustomerNotes] = useState(quotation?.customerNotes ?? "");
  const [internalNotes, setInternalNotes] = useState(quotation?.internalNotes ?? "");
  const [terms, setTerms] = useState(quotation?.terms ?? "");
  const [paymentTerms, setPaymentTerms] = useState(quotation?.paymentTerms ?? "");
  const [deliveryNotes, setDeliveryNotes] = useState(quotation?.deliveryNotes ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);

  const [state, formAction, pending] = useActionState(action, { ok: true, message: "" });

  const subtotal = roundMoney(
    lines.reduce((total, line) => total + (line.price - line.discount) * line.quantity, 0),
  );
  const orderDiscount = discountTotal.trim() === "" ? 0 : Number(discountTotal);
  const discountValid = Number.isFinite(orderDiscount) && orderDiscount >= 0;
  const taxable = roundMoney(subtotal - (discountValid ? orderDiscount : 0));
  const total = taxable;

  const addLine = (item: QuotationCatalogueItem) => {
    setLines((current) => [
      ...current,
      {
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        price: item.price,
        quantity: 1,
        discount: 0,
      },
    ]);
    setItemPickerOpen(false);
  };

  const updateLine = (variantId: string, patch: Partial<EditorLine>) => {
    setLines((current) =>
      current.map((line) => (line.variantId === variantId ? { ...line, ...patch } : line)),
    );
  };

  const removeLine = (variantId: string) => {
    setLines((current) => current.filter((line) => line.variantId !== variantId));
  };

  return (
    <form action={formAction} className="space-y-3">
      {state.message !== "" && (
        <p
          role={state.ok ? "status" : "alert"}
          className={cn(
            "rounded-md border px-3 py-2 text-xs leading-5",
            state.ok
              ? "border-line bg-navy-soft/60 text-navy"
              : "border-danger/30 bg-danger-soft text-danger",
          )}
        >
          {state.message}
        </p>
      )}

      {editing && <input type="hidden" name="quotationId" value={quotation.id} />}

      <div className="rounded-lg border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-ink-soft">
            Quotation
          </h2>
          <span className="text-[12px] font-semibold text-ink">
            {editing ? quotation.quotationNumber : "Number assigned on save"}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="md:col-span-2">
            <Field label="Customer" htmlFor="quotation-customer" required>
              <button
                id="quotation-customer"
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-line-strong bg-white px-2.5 text-left text-[13px] text-ink transition-colors hover:border-navy/40"
              >
                <span className="min-w-0 truncate">
                  {customer ? customer.name : guestName.trim() !== "" ? `${guestName} (guest)` : "Choose a customer…"}
                </span>
                <PosIcon name="chevronDown" className="h-4 w-4 shrink-0 text-ink-faint" />
              </button>
            </Field>
            <input type="hidden" name="customerId" value={customer?.id ?? ""} />
            <input type="hidden" name="guestName" value={customer ? "" : guestName} />
            <input type="hidden" name="guestPhone" value={customer ? "" : guestPhone} />
          </div>
          <Field label="Quotation date" htmlFor="quotation-date" required>
            <TextInput
              id="quotation-date"
              type="date"
              name="quotationDate"
              value={quotationDate}
              onChange={(event) => setQuotationDate(event.target.value)}
              required
            />
          </Field>
          <Field label="Valid until" htmlFor="quotation-valid-until" required>
            <TextInput
              id="quotation-valid-until"
              type="date"
              name="validUntil"
              value={validUntil}
              min={quotationDate}
              onChange={(event) => setValidUntil(event.target.value)}
              required
            />
          </Field>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-ink-soft">
            Items
          </h2>
          <span className="text-[11px] text-ink-faint">
            {lines.length} line{lines.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-line-strong bg-line/30">
                <th className="whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                  Product
                </th>
                <th className="whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                  Qty
                </th>
                <th className="whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                  Unit price
                </th>
                <th className="whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                  Discount
                </th>
                <th className="whitespace-nowrap px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                  Line total
                </th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lines.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-xs text-ink-faint">
                    No items yet — add products to build the quotation.
                  </td>
                </tr>
              )}
              {lines.map((line, index) => {
                const lineTotal = roundMoney((line.price - line.discount) * line.quantity);
                return (
                  <tr key={line.variantId}>
                    <input type="hidden" name={`variantId-${index}`} value={line.variantId} />
                    <input type="hidden" name={`quantity-${index}`} value={line.quantity} />
                    <input type="hidden" name={`discount-${index}`} value={line.discount} />
                    <td className="px-3 py-1.5">
                      <p className="text-[13px] font-medium text-ink">{line.productName}</p>
                      <p className="text-[11px] text-ink-faint">
                        {line.variantName}
                        {line.sku ? ` · ${line.sku}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        min={1}
                        max={999}
                        step={1}
                        value={line.quantity}
                        onChange={(event) =>
                          updateLine(line.variantId, { quantity: Math.max(1, Number(event.target.value) || 1) })
                        }
                        aria-label={`Quantity of ${line.productName}`}
                        className="h-7 w-16 rounded border border-line-strong px-1.5 text-right text-[13px] font-medium tabular-nums text-ink focus:border-navy focus:outline-2 focus:outline-navy/25"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="text-[13px] font-medium tabular-nums text-ink">
                        {formatGHS(line.price)}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        min={0}
                        max={line.price}
                        step={0.01}
                        value={line.discount}
                        onChange={(event) =>
                          updateLine(line.variantId, { discount: Math.max(0, Number(event.target.value) || 0) })
                        }
                        aria-label={`Discount for ${line.productName}`}
                        className="h-7 w-24 rounded border border-line-strong px-1.5 text-right text-[13px] tabular-nums text-ink focus:border-navy focus:outline-2 focus:outline-navy/25"
                      />
                      {line.discount > line.price && (
                        <p className="text-[10px] text-danger">Exceeds unit price</p>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <span className="text-[13px] font-semibold tabular-nums text-navy">
                        {formatGHS(lineTotal)}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        type="button"
                        aria-label={`Remove ${line.productName} from the quotation`}
                        onClick={() => removeLine(line.variantId)}
                        className="flex h-6 w-6 items-center justify-center rounded text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                      >
                        <PosIcon name="trash" className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-3 py-2">
          <button
            type="button"
            onClick={() => setItemPickerOpen(true)}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-dashed border-line-strong px-2.5 text-xs font-medium text-navy transition-colors hover:border-navy hover:bg-navy/5"
          >
            <PosIcon name="plus" className="h-3.5 w-3.5" />
            Add product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="rounded-lg border border-line bg-white">
          <div className="border-b border-line px-3 py-2">
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-ink-soft">
              Notes &amp; terms
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2">
            <Field label="Customer notes" htmlFor="quotation-customer-notes">
              <TextArea
                id="quotation-customer-notes"
                name="customerNotes"
                value={customerNotes}
                onChange={(event) => setCustomerNotes(event.target.value)}
                placeholder="Visible on the printed quotation"
              />
            </Field>
            <Field label="Internal notes" htmlFor="quotation-internal-notes">
              <TextArea
                id="quotation-internal-notes"
                name="internalNotes"
                value={internalNotes}
                onChange={(event) => setInternalNotes(event.target.value)}
                placeholder="Visible to staff only"
              />
            </Field>
            <Field label="Terms" htmlFor="quotation-terms">
              <TextArea
                id="quotation-terms"
                name="terms"
                value={terms}
                onChange={(event) => setTerms(event.target.value)}
                placeholder="e.g. Prices valid for 30 days; delivery within 5 working days of payment."
              />
            </Field>
            <Field label="Payment terms" htmlFor="quotation-payment-terms">
              <TextInput
                id="quotation-payment-terms"
                name="paymentTerms"
                value={paymentTerms}
                onChange={(event) => setPaymentTerms(event.target.value)}
                placeholder="e.g. 50% advance, balance on delivery"
              />
            </Field>
            <Field label="Delivery notes" htmlFor="quotation-delivery-notes" hint="Optional">
              <TextInput
                id="quotation-delivery-notes"
                name="deliveryNotes"
                value={deliveryNotes}
                onChange={(event) => setDeliveryNotes(event.target.value)}
                placeholder="e.g. Collection at the Accra store"
              />
            </Field>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white">
          <div className="border-b border-line px-3 py-2">
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-ink-soft">
              Totals
            </h2>
          </div>
          <div className="space-y-2.5 p-3">
            <div className="flex items-center justify-between text-[12px] text-ink-soft">
              <span>Subtotal</span>
              <span className="font-semibold tabular-nums text-ink">{formatGHS(subtotal)}</span>
            </div>
            <div>
              <label
                htmlFor="quotation-discount"
                className="mb-0.5 flex items-center justify-between text-[12px] text-ink-soft"
              >
                <span>Order discount</span>
                {!discountValid && <span className="text-[10px] text-danger">Invalid</span>}
              </label>
              <input
                id="quotation-discount"
                type="number"
                name="discountTotal"
                min={0}
                max={subtotal}
                step={0.01}
                value={discountTotal}
                onChange={(event) => setDiscountTotal(event.target.value)}
                className="h-7 w-full rounded border border-line-strong px-1.5 text-right text-[13px] tabular-nums text-ink focus:border-navy focus:outline-2 focus:outline-navy/25"
              />
              {discountValid && orderDiscount > subtotal && (
                <p className="text-[10px] text-danger">Discount exceeds subtotal</p>
              )}
            </div>
            <div className="flex items-center justify-between text-[12px] text-ink-soft">
              <span>Taxable amount</span>
              <span className="font-semibold tabular-nums text-ink">{formatGHS(taxable)}</span>
            </div>
            <div className="flex items-center justify-between text-[12px] text-ink-soft">
              <span>Tax</span>
              <span className="font-semibold tabular-nums text-ink">GH₵0.00</span>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-2">
              <span className="text-[13px] font-bold text-ink">Grand total</span>
              <span className="text-base font-bold tabular-nums text-navy">{formatGHS(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line pt-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-8 items-center rounded-md bg-navy px-3.5 text-xs font-semibold text-white transition-colors hover:bg-navy-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending
            ? "Saving…"
            : editing
              ? "Save Changes"
              : "Save Draft"}
        </button>
        {!editing && canSend && (
          <button
            type="submit"
            name="intent"
            value="save_send"
            disabled={pending}
            className="inline-flex h-8 items-center rounded-md border border-navy bg-white px-3.5 text-xs font-semibold text-navy transition-colors hover:bg-navy/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save & Send"}
          </button>
        )}
        <a
          href={editing ? `/admin/quotations/${quotation.id}` : "/admin/quotations"}
          className="inline-flex h-8 items-center rounded-md border border-line-strong bg-white px-3.5 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40 hover:text-ink"
        >
          Cancel
        </a>
      </div>

      <QuotationCustomerPicker
        open={pickerOpen}
        selected={customer}
        guestName={guestName}
        guestPhone={guestPhone}
        onSelect={(next) => {
          setCustomer(next);
          setGuestName("");
          setGuestPhone("");
        }}
        onGuestName={(value) => {
          setGuestName(value);
          if (value.trim() !== "") setCustomer(null);
        }}
        onGuestPhone={(value) => setGuestPhone(value)}
        onClose={() => setPickerOpen(false)}
      />

      <QuotationItemPicker
        open={itemPickerOpen}
        addedVariantIds={new Set(lines.map((line) => line.variantId))}
        onAdd={addLine}
        onClose={() => setItemPickerOpen(false)}
      />
    </form>
  );
}