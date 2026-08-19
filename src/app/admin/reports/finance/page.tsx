import type { Metadata } from "next";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { NoAccess } from "@/components/admin/no-access";
import { FinanceReport } from "@/components/admin/reports/finance-report";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finance Report — Yemanuel Store ERP",
};

export default async function FinanceReportPage() {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.reports.view)) {
    return (
      <PageContainer>
        <PageHeader
          title="Finance Report"
          breadcrumb={[{ label: "Reports" }, { label: "Finance" }]}
        />
        <NoAccess module="finance reports" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Finance Report"
        description="Overview of money in and out for this month."
        breadcrumb={[{ label: "Reports" }, { label: "Finance" }]}
      />
      <FinanceReport />
    </PageContainer>
  );
}