import type { Metadata } from "next";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/admin/no-access";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leave — Yemanuel ERP",
};

export default async function LeavePage() {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.staff.manage)) {
    return (
      <PageContainer>
        <PageHeader title="Leave" breadcrumb={[{ label: "HR" }, { label: "Leave" }]} />
        <NoAccess module="leave" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Leave"
        description="Staff leave requests and balances."
        breadcrumb={[{ label: "HR" }, { label: "Leave" }]}
      />
      <EmptyState
        icon="leave"
        title="Leave module coming soon"
        description="Leave requests will appear here once the leave management module is enabled."
      />
    </PageContainer>
  );
}