import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmptyState, PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { getQuotation, quotationStatusLabel } from "@/lib/admin/quotations";
import { updateQuotationAction } from "@/lib/admin/quotation-actions";
import { QuotationEditor } from "@/components/admin/quotations/quotation-editor";
import { QuotationBadge } from "@/components/admin/quotations/quotation-badge";

export const metadata: Metadata = {
  title: "Edit Quotation — Yemanuel Store Admin",
};

export default async function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return <UnauthorizedPage message="Your account does not have the sales.read permission." />;
  }
  if (!hasPermission(session, PERMISSIONS.sales.update)) {
    return <UnauthorizedPage message="Your account does not have the sales.update permission." />;
  }

  const { id } = await params;
  const quotation = await getQuotation(id);
  if (!quotation) {
    return (
      <AdminEmptyState
        title="Quotation not found"
        message="Return to the quotation list to continue."
        actionHref="/admin/quotations"
        actionLabel="Back to Quotations"
      />
    );
  }

  const editable = quotation.status === "draft" || quotation.status === "sent";
  if (!editable) {
    return (
      <AdminEmptyState
        title="Quotation locked"
        message={`A ${quotationStatusLabel(quotation.status)} quotation can no longer be edited.`}
        actionHref={`/admin/quotations/${quotation.id}`}
        actionLabel="View quotation"
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Edit ${quotation.quotationNumber}`}
        description="Prices are resolved from the authoritative product pricing and cannot be overwritten."
        actions={
          <>
            <QuotationBadge status={quotation.status} />
            <Link
              href={`/admin/quotations/${quotation.id}`}
              className="inline-flex h-7 items-center rounded-md border border-line-strong bg-white px-2.5 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40 hover:text-ink"
            >
              Cancel
            </Link>
          </>
        }
      />
      <QuotationEditor quotation={quotation} canSend={false} action={updateQuotationAction} />
    </div>
  );
}