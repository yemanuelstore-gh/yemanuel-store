import type { Metadata } from "next";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/admin/no-access";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Attendance — Yemanuel ERP",
};

export default async function AttendancePage() {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.staff.manage)) {
    return (
      <PageContainer>
        <PageHeader title="Attendance" breadcrumb={[{ label: "HR" }, { label: "Attendance" }]} />
        <NoAccess module="attendance" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Attendance"
        description="Employee clock-in and attendance records."
        breadcrumb={[{ label: "HR" }, { label: "Attendance" }]}
      />
      <EmptyState
        icon="attendance"
        title="Attendance module coming soon"
        description="Time tracking records will appear here once attendance capture is enabled for your store."
      />
    </PageContainer>
  );
}