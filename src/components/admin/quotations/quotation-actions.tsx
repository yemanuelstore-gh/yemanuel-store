"use client";

import Link from "next/link";
import { InlineSubmitForm } from "@/components/admin/ui";
import { setQuotationStatusAction, convertQuotationToOrderAction } from "@/lib/admin/quotation-actions";
import type { QuotationStatus } from "@/lib/admin/quotations";
import { cn } from "@/lib/cn";
import { PosIcon } from "@/components/admin/pos/pos-icons";

/**
 * Status-driven action bar for the quotation detail page. Transitions are
 * enforced server-side in setQuotationStatusAction; the buttons here only
 * mirror the allowed transitions.
 */
export function QuotationActions({
  quotationId,
  status,
  canUpdate,
  convertedOrderNumber,
}: {
  quotationId: string;
  status: QuotationStatus;
  canUpdate: boolean;
  convertedOrderNumber: string | null;
}) {
  const transition = (targetStatus: string, label: string, variant: "primary" | "secondary" | "danger" = "secondary") => (
    <InlineSubmitForm
      action={setQuotationStatusAction}
      label={label}
      pendingLabel="Updating…"
      variant={variant}
    >
      <input type="hidden" name="quotationId" value={quotationId} />
      <input type="hidden" name="targetStatus" value={targetStatus} />
    </InlineSubmitForm>
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Link
        href="/admin/quotations"
        className="inline-flex h-7 items-center gap-1 rounded-md border border-line-strong bg-white px-2.5 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40 hover:text-ink"
      >
        <PosIcon name="chevronLeft" className="h-3.5 w-3.5" />
        Quotations
      </Link>

      {canUpdate && status !== "expired" && (
        <Link
          href={`/admin/quotations/${quotationId}/edit`}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-line-strong bg-white px-2.5 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40 hover:text-ink"
        >
          <PosIcon name="receipt" className="h-3.5 w-3.5" />
          Edit
        </Link>
      )}

      {status === "draft" && canUpdate && transition("sent", "Send", "primary")}
      {status === "sent" && canUpdate && transition("accepted", "Accept", "primary")}
      {(status === "draft" || status === "sent") && canUpdate && transition("rejected", "Reject", "danger")}

      {status === "accepted" && convertedOrderNumber === null && canUpdate && (
        <InlineSubmitForm
          action={convertQuotationToOrderAction}
          label="Convert to Order"
          pendingLabel="Converting…"
          variant="primary"
        >
          <input type="hidden" name="quotationId" value={quotationId} />
        </InlineSubmitForm>
      )}

      {convertedOrderNumber !== null && (
        <Link
          href={`/admin/orders/${convertedOrderNumber}`}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-md bg-navy px-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90",
          )}
        >
          <PosIcon name="cart" className="h-3.5 w-3.5" />
          Order {convertedOrderNumber}
        </Link>
      )}

      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-7 items-center gap-1 rounded-md border border-line-strong bg-white px-2.5 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40 hover:text-ink"
      >
        <PosIcon name="printer" className="h-3.5 w-3.5" />
        Print
      </button>
    </div>
  );
}