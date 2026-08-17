import { formatGHS } from "@/lib/format";
import type { QuotationDetail } from "@/lib/admin/quotations";
import { QuotationBadge } from "./quotation-badge";

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));

/**
 * Professional quotation document. Serves as both the on-screen detail view
 * and the browser-print layout (`.print-document` becomes the only visible
 * content when printing, mirroring the POS receipt pattern).
 */
export function QuotationDocument({ quotation }: { quotation: QuotationDetail }) {
  const { customer, items } = quotation;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-document, .print-document * { visibility: visible; }
          .print-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="print-document overflow-hidden rounded-lg border border-line bg-white">
        <div className="border-b-2 border-navy px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-lg font-bold tracking-wide text-navy">YEMANUEL STORE</p>
              <p className="text-[11px] leading-5 text-ink-soft">
                Premium fabrics, fashion &amp; lifestyle goods
                <br />
                Accra, Ghana · Tel: 024 412 3456
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold uppercase tracking-widest text-ink">
                Quotation
              </p>
              <p className="text-[13px] font-semibold tabular-nums text-navy">
                {quotation.quotationNumber}
              </p>
              <div className="mt-1 flex justify-end">
                <QuotationBadge status={quotation.status} />
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                Quotation date
              </p>
              <p className="font-medium text-ink">{formatDate(quotation.quotationDate)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                Valid until
              </p>
              <p className="font-medium text-ink">{formatDate(quotation.validUntil)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                Prepared by
              </p>
              <p className="font-medium text-ink">{quotation.createdByName ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                Last updated
              </p>
              <p className="font-medium text-ink">{formatDate(quotation.updatedAt.slice(0, 10))}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-b border-line px-5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              Bill to
            </p>
            {customer ? (
              <>
                <p className="text-[13px] font-semibold text-ink">{customer.name}</p>
                {customer.businessName && (
                  <p className="text-[12px] text-ink-soft">{customer.businessName}</p>
                )}
                {customer.phone && (
                  <p className="text-[12px] text-ink-soft">{customer.phone}</p>
                )}
                {customer.email && <p className="text-[12px] text-ink-soft">{customer.email}</p>}
                {customer.address && (
                  <p className="mt-0.5 max-w-sm text-[12px] leading-5 text-ink-soft">
                    {customer.address}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[13px] text-ink-soft">Walk-in customer</p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              Payment terms
            </p>
            <p className="text-[12px] leading-5 text-ink-soft">
              {quotation.paymentTerms || "On acceptance"}
            </p>
            {quotation.deliveryNotes && (
              <>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  Delivery
                </p>
                <p className="text-[12px] leading-5 text-ink-soft">{quotation.deliveryNotes}</p>
              </>
            )}
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-y border-line-strong bg-line/30">
                  <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                    #
                  </th>
                  <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                    Product
                  </th>
                  <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                    SKU
                  </th>
                  <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                    Qty
                  </th>
                  <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                    Unit price
                  </th>
                  <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                    Discount
                  </th>
                  <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-2 py-1.5 text-[12px] tabular-nums text-ink-faint">
                      {index + 1}
                    </td>
                    <td className="px-2 py-1.5">
                      <p className="text-[13px] font-medium text-ink">{item.productName}</p>
                      <p className="text-[11px] text-ink-faint">{item.variantName}</p>
                    </td>
                    <td className="px-2 py-1.5 font-mono text-[11px] text-ink-faint">{item.sku}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-ink">{item.quantity}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-ink">
                      {formatGHS(item.unitPrice)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-ink">
                      {item.discountAmount > 0 ? formatGHS(item.discountAmount) : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-ink">
                      {formatGHS(item.lineTotal)}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-2 py-4 text-center text-xs text-ink-faint">
                      No items on this quotation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-[260px] space-y-1 text-[13px]">
              <div className="flex justify-between text-ink-soft">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatGHS(quotation.subtotal)}</span>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Discount</span>
                <span className="tabular-nums">{formatGHS(quotation.discountTotal)}</span>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Tax</span>
                <span className="tabular-nums">{formatGHS(quotation.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-line-strong pt-1.5 text-[15px] font-bold text-navy">
                <span>Grand total</span>
                <span className="tabular-nums">{formatGHS(quotation.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {(quotation.customerNotes || quotation.terms) && (
          <div className="grid grid-cols-1 gap-4 border-t border-line px-5 py-4 md:grid-cols-2">
            {quotation.customerNotes && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  Notes
                </p>
                <p className="whitespace-pre-line text-[12px] leading-5 text-ink-soft">
                  {quotation.customerNotes}
                </p>
              </div>
            )}
            {quotation.terms && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  Terms
                </p>
                <p className="whitespace-pre-line text-[12px] leading-5 text-ink-soft">
                  {quotation.terms}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line px-5 py-4">
          <p className="text-[11px] leading-5 text-ink-faint">
            This quotation is a proposal and does not create any obligation to buy.
            <br />
            Prices are stated in Ghana Cedis (GH₵) and are exclusive of tax unless stated.
          </p>
          <div className="text-center">
            <p className="border-t border-ink px-6 pt-1 text-[11px] font-medium text-ink">
              Authorised by
            </p>
            <p className="mt-1 text-[10px] text-ink-faint">{quotation.createdByName ?? ""}</p>
          </div>
        </div>
      </div>
    </>
  );
}