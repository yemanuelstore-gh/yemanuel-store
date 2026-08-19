import type { Metadata } from "next";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/status-badge";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Pagination } from "@/components/admin/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/admin/no-access";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { listDepartments, PAGE_SIZE } from "@/lib/admin/hr";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Departments — Yemanuel ERP",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.staff.manage)) {
    return (
      <PageContainer>
        <PageHeader title="Departments" breadcrumb={[{ label: "HR" }, { label: "Departments" }]} />
        <NoAccess module="departments" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listDepartments(client, { page, pageSize: PAGE_SIZE, q });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);

  return (
    <PageContainer>
      <PageHeader
        title="Departments"
        description="Organisational units within Yemanuel Store."
        breadcrumb={[{ label: "HR" }, { label: "Departments" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/hr/departments"
          q={q}
          searchPlaceholder="Search department…"
          count={`${total.toLocaleString()} department${total === 1 ? "" : "s"}`}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="departments"
            title="No departments found"
            description={q ? "Try adjusting your search." : "Departments will appear here."}
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Department</TH>
                  <TH>Description</TH>
                  <TH>Employees</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((department) => (
                  <TR key={department.id}>
                    <TD className="font-medium text-erp-text">{department.name}</TD>
                    <TD className="max-w-96">
                      <span className="block truncate text-erp-text-secondary">
                        {department.description ?? "—"}
                      </span>
                    </TD>
                    <TD className="tabular-nums text-erp-text-secondary">
                      {department.employee_count}
                    </TD>
                    <TD>
                      <StatusBadge status={department.is_active ? "Active" : "Inactive"} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination params={urlParams} page={page} total={total} />
          </>
        )}
      </Card>
    </PageContainer>
  );
}