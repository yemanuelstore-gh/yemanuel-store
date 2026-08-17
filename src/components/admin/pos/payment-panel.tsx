"use client";

import { formatGHS } from "@/lib/format";
import { POS_PAYMENT_METHODS } from "@/lib/pos/types";
import { coversTotal, changeDue } from "@/lib/pos/format";
import type { PosIconName } from "./pos-icons";
import { PosIcon } from "./pos-icons";
import type { PosSelectedCustomer } from "./customer-picker";

const METHOD_LABELS: Record<(typeof POS_PAYMENT_METHODS)[number], string> = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  card: "Card",
  bank_transfer: "Bank Transfer",
};

const METHOD_ICONS: Record<(typeof POS_PAYMENT_METHODS)[number], PosIconName> = {
  cash: "cash",
  mobile_money: "mobileMoney",
  card: "card",
  bank_transfer: "bank",
};

export type PosPaymentMethod = (typeof POS_PAYMENT_METHODS)[number];

export function PaymentPanel({
  total,
  paymentMethod,
  cashTendered,
  customer,
  guestName,
  canCompleteSale,
  submitting,
  onMethodChange,
  onCashTendered,
  onOpenCustomerPicker,
  onComplete,
}: {
  total: number;
  paymentMethod: PosPaymentMethod | null;
  cashTendered: string;
  customer: PosSelectedCustomer | null;
  guestName: string;
  canCompleteSale: boolean;
  submitting: boolean;
  onMethodChange: (method: PosPaymentMethod) => void;
  onCashTendered: (value: string) => void;
  onOpenCustomerPicker: () => void;
  onComplete: () => void;
}) {
  const tendered = Number(cashTendered);
  const isCash = paymentMethod === "cash";
  const short =
    isCash && Number.isFinite(tendered) ? !coversTotal(tendered, total) : false;
  const change = isCash && Number.isFinite(tendered) ? changeDue(tendered, total) : 0;

  const completeDisabled =
    !canCompleteSale ||
    submitting ||
    total <= 0 ||
    paymentMethod === null ||
    (isCash && (!Number.isFinite(tendered) || short));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-3 py-2">
        <h2 className="text-[12px] font-bold uppercase tracking-wider text-ink-soft">
          Payment
        </h2>
        <span className="text-[11px] font-semibold tabular-nums text-ink">
          Due: {formatGHS(total)}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <button
          type="button"
          onClick={onOpenCustomerPicker}
          className="flex w-full items-center justify-between gap-2 rounded-md border border-line-strong bg-white px-2.5 py-2 text-left transition-colors hover:border-navy/40"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy/10 text-navy">
              <PosIcon name="user" className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-semibold text-ink">
                {customer ? customer.name : guestName.trim() !== "" ? guestName : "Walk-in customer"}
              </span>
              <span className="block text-[10px] text-ink-faint">
                {customer ? customer.phone : "No account needed"}
              </span>
            </span>
          </span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-navy">
            {customer ? "Change" : "Select"}
            <PosIcon name="chevronRight" className="h-3.5 w-3.5" />
          </span>
        </button>

        <fieldset>
          <legend className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
            Payment method
          </legend>
          <div className="grid grid-cols-2 gap-1.5">
            {POS_PAYMENT_METHODS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => onMethodChange(method)}
                className={
                  paymentMethod === method
                    ? "flex items-center gap-1.5 rounded-md border border-navy bg-navy px-2 py-1.5 text-left text-[11px] font-semibold text-white"
                    : "flex items-center gap-1.5 rounded-md border border-line-strong bg-white px-2 py-1.5 text-left text-[11px] font-medium text-ink-soft transition-colors hover:border-navy/40 hover:text-navy"
                }
              >
                <PosIcon name={METHOD_ICONS[method]} className="h-3.5 w-3.5 shrink-0" />
                {METHOD_LABELS[method]}
              </button>
            ))}
          </div>
        </fieldset>

        {isCash && (
          <div className="space-y-1.5">
            <label
              htmlFor="pos-cash-tendered"
              className="block text-[10px] font-bold uppercase tracking-wider text-ink-soft"
            >
              Cash tendered (GH₵)
            </label>
            <input
              id="pos-cash-tendered"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={cashTendered}
              onChange={(event) => onCashTendered(event.target.value)}
              placeholder="0.00"
              className="h-8 w-full rounded-md border border-line-strong bg-white px-2 text-right font-mono text-[14px] font-semibold tabular-nums text-ink placeholder:text-ink-faint focus:border-navy focus:outline-2 focus:outline-navy/25"
            />
            {Number.isFinite(tendered) && tendered >= 0 && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-ink-soft">Change</span>
                <span
                  className={
                    short
                      ? "font-bold tabular-nums text-danger"
                      : "font-bold tabular-nums text-success"
                  }
                >
                  {short ? `Short by ${formatGHS(-change)}` : formatGHS(change)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-1.5 border-t border-line-strong p-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-ink">Amount due</span>
          <span className="text-lg font-bold tabular-nums text-navy">
            {formatGHS(total)}
          </span>
        </div>
        <button
          type="button"
          onClick={onComplete}
          disabled={completeDisabled}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-navy text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? (
            <>
              <PosIcon name="loader" className="h-4 w-4 animate-spin" />
              Completing…
            </>
          ) : (
            <>
              <PosIcon name="check" className="h-4 w-4" />
              Complete Sale
            </>
          )}
        </button>
      </div>
    </div>
  );
}