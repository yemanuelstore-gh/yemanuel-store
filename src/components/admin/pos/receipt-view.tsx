"use client";

import { formatGHS } from "@/lib/format";
import type { PosReceipt } from "@/lib/pos/types";
import { PosIcon } from "./pos-icons";

const RECEIPT_PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  card: "Card",
  bank_transfer: "Bank Transfer",
};

export function ReceiptView({
  receipt,
  onClose,
}: {
  receipt: PosReceipt | null;
  onClose: () => void;
}) {
  if (!receipt) return null;

  const date = new Date(receipt.createdAt);
  const timeLabel = new Intl.DateTimeFormat("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .pos-print-area, .pos-print-area * { visibility: visible; }
          .pos-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 280px;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3"
        role="dialog"
        aria-modal="true"
        aria-label="Sale receipt"
      >
        <div className="pos-print-area flex max-h-[90vh] w-[320px] flex-col overflow-hidden rounded-lg border border-line-strong bg-white shadow-xl">
          <div className="flex shrink-0 items-center justify-between border-b border-line bg-ink-soft/40 px-3 py-2 print:hidden">
            <h2 className="text-[13px] font-bold text-ink">Sale complete</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close receipt"
              className="flex h-7 w-7 items-center justify-center rounded text-ink-soft transition-colors hover:bg-line/60 hover:text-ink"
            >
              <PosIcon name="close" className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 text-ink">
            <div className="mb-3 text-center">
              <p className="text-[15px] font-bold tracking-wide">YEMANUEL STORE</p>
              <p className="text-[10px] text-ink-faint">
                Sale receipt · {receipt.orderNumber}
              </p>
              <p className="text-[10px] text-ink-faint">{timeLabel}</p>
            </div>

            <div className="mb-3 border-y border-dashed border-line-strong py-1.5 text-[10px] text-ink-faint">
              <p>Cashier: {receipt.cashierName}</p>
              <p>Customer: {receipt.customerName ?? "Walk-in"}</p>
            </div>

            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="text-left text-[9px] uppercase tracking-wider text-ink-faint">
                  <th className="pb-1 font-medium">Item</th>
                  <th className="pb-1 text-right font-medium">Qty</th>
                  <th className="pb-1 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item, index) => (
                  <tr key={`${item.sku}-${index}`}>
                    <td className="py-0.5 pr-1 align-top">
                      {item.productName}
                      {item.variantName ? ` (${item.variantName})` : ""}
                    </td>
                    <td className="py-0.5 text-right tabular-nums">
                      {item.quantity} × {formatGHS(item.unitPrice)}
                    </td>
                    <td className="py-0.5 text-right font-semibold tabular-nums">
                      {formatGHS(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-2 space-y-0.5 border-t border-dashed border-line-strong pt-1.5 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatGHS(receipt.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span className="tabular-nums">{formatGHS(receipt.discountTotal)}</span>
              </div>
              <div className="flex justify-between text-[13px] font-bold">
                <span>Total</span>
                <span className="tabular-nums">{formatGHS(receipt.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>
                  {RECEIPT_PAYMENT_LABELS[receipt.paymentMethod] ?? "Payment"}
                </span>
                <span className="tabular-nums">{formatGHS(receipt.amountPaid)}</span>
              </div>
              {receipt.change > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span>Change</span>
                  <span className="tabular-nums">{formatGHS(receipt.change)}</span>
                </div>
              )}
              {receipt.paymentReference && (
                <p className="pt-1 text-[9px] text-ink-faint">
                  Ref: {receipt.paymentReference}
                </p>
              )}
            </div>

            <p className="mt-3 text-center text-[9px] text-ink-faint">
              Thank you for shopping with us!
            </p>
          </div>

          <div className="flex shrink-0 gap-1.5 border-t border-line p-2.5 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-navy bg-white text-[12px] font-semibold text-navy transition-colors hover:bg-navy/5"
            >
              <PosIcon name="printer" className="h-3.5 w-3.5" />
              Print receipt
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-navy text-[12px] font-bold text-white transition-opacity hover:opacity-90"
            >
              <PosIcon name="cart" className="h-3.5 w-3.5" />
              New sale
            </button>
          </div>
        </div>
      </div>
    </>
  );
}