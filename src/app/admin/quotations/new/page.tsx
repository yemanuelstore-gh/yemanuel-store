import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createQuotationAction } from "@/lib/admin/quotation-actions";
import { QuotationEditor } from "@/components/admin/quotations/quotation-editor";

export const metadata: Metadata = {
  title: "New Quotation — Yemanuel Store Admin",
};

export default async function NewQuotationPage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return <UnauthorizedPage message="Your account does not have the sales.read permission." />;
  }
  if (!hasPermission(session, PERMISSIONS.sales.create)) {
    return <UnauthorizedPage message="Your account does not have the sales.create permission." />;
  }

  const canSend = hasPermission(session, PERMISSIONS.sales.update);

  return (
    <div className="space-y-4">
      <PageHeader
        title="New Quotation"
        description="Build a quotation from the catalogue. Prices are resolved from the authoritative product pricing."
      />
      <QuotationEditor canSend={canSend} action={createQuotationAction} />
    </div>
  );
}