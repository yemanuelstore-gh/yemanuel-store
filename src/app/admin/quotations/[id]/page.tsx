import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmptyState, PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { getQuotation } from "@/lib/admin/quotations";
import { QuotationDocument } from "@/components/admin/quotations/quotation-document";
import { QuotationActions } from "@/components/admin/quotations/quotation-actions";

export const metadata: Metadata = {
  title: "Quotation — Yemanuel Store Admin",
};

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return <UnauthorizedPage message="Your account does not have the sales.read permission." />;
  }

  const { id } = await params;
  const quotation = await getQuotation(id);
  if (!quotation) {
    return (
      <AdminEmptyState
        title="Quotation not found"
        message="It may have been removed. Return to the quotation list to continue."
        actionHref="/admin/quotations"
        actionLabel="Back to Quotations"
      />
    );
  }

  const canUpdate = hasPermission(session, PERMISSIONS.sales.update);

  return (
    <div className="space-y-3">
      <PageHeader
        title={quotation.quotationNumber}
        description="Quotation document"
        actions={
          <QuotationActions
            quotationId={quotation.id}
            status={quotation.status}
            canUpdate={canUpdate}
            convertedOrderNumber={quotation.convertedOrderNumber}
          />
        }
      />

      {quotation.internalNotes && (
        <div className="rounded-lg border border-line bg-white px-3 py-2 print:hidden">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
            Internal notes
          </p>
          <p className="whitespace-pre-line text-xs leading-5 text-ink-soft">
            {quotation.internalNotes}
          </p>
        </div>
      )}

      <QuotationDocument quotation={quotation} />

      <p className="print:hidden">
        <Link
          href="/admin/quotations"
          className="text-xs font-medium text-navy hover:underline"
        >
          ← Back to Quotations
        </Link>
      </p>
    </div>
  );
}