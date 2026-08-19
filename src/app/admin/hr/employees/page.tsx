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
import { listEmployees, PAGE_SIZE } from "@/lib/admin/hr";
import {
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYEE_STATUS_LABELS,
  labelFor,
} from "@/lib/admin/labels";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Employees — Yemanuel ERP",
};

const EMPLOYEE_STATUSES = ["active", "on_leave", "terminated", "suspended", "inactive"];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.staff.manage)) {
    return (
      <PageContainer>
        <PageHeader title="Employees" breadcrumb={[{ label: "HR" }, { label: "Employees" }]} />
        <NoAccess module="employees" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const status = firstParam(params.status);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listEmployees(client, { page, pageSize: PAGE_SIZE, q, status });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (status) urlParams.set("status", status);

  return (
    <PageContainer>
      <PageHeader
        title="Employees"
        description="Staff employed by Yemanuel Store."
        breadcrumb={[{ label: "HR" }, { label: "Employees" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/hr/employees"
          q={q}
          searchPlaceholder="Search code, name or email…"
          count={`${total.toLocaleString()} employee${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "status",
              label: "status",
              value: status,
              options: EMPLOYEE_STATUSES.map((value) => ({
                value,
                label: labelFor(value, EMPLOYEE_STATUS_LABELS),
              })),
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="employees"
            title="No employees found"
            description={
              q || status
                ? "Try adjusting your search or filters."
                : "Employee records will appear here once staff are added."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Code</TH>
                  <TH>Employee</TH>
                  <TH>Job Title</TH>
                  <TH>Department</TH>
                  <TH>Type</TH>
                  <TH>Hired</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((employee) => (
                  <TR key={employee.id}>
                    <TD className="font-mono text-[12px] text-erp-navy">
                      {employee.employee_code ?? "—"}
                    </TD>
                    <TD>
                      <span className="font-medium text-erp-text">
                        {employee.first_name} {employee.last_name}
                      </span>
                      <span className="block max-w-48 truncate text-[11px] text-erp-text-muted">
                        {employee.email ?? ""}
                      </span>
                    </TD>
                    <TD className="max-w-44">
                      <span className="block truncate text-erp-text-secondary">
                        {employee.job_title ?? "—"}
                      </span>
                    </TD>
                    <TD className="max-w-40">
                      <span className="block truncate text-erp-text-secondary">
                        {employee.departments?.name ?? "—"}
                      </span>
                    </TD>
                    <TD className="text-erp-text-secondary">
                      {labelFor(employee.employment_type, EMPLOYMENT_TYPE_LABELS)}
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(employee.hire_date)}
                    </TD>
                    <TD>
                      <StatusBadge status={labelFor(employee.employment_status, EMPLOYEE_STATUS_LABELS)} />
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