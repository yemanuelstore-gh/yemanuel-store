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
import { listPayrollPeriods, listSalaryStructures, PAGE_SIZE } from "@/lib/admin/hr";
import { PAYROLL_PERIOD_STATUS_LABELS, labelFor } from "@/lib/admin/labels";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payroll — Yemanuel ERP",
};

const PERIOD_STATUSES = ["draft", "open", "processing", "closed", "paid"];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.staff.manage)) {
    return (
      <PageContainer>
        <PageHeader title="Payroll" breadcrumb={[{ label: "HR" }, { label: "Payroll" }]} />
        <NoAccess module="payroll" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const status = firstParam(params.status);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const [periods, structures] = await Promise.all([
    listPayrollPeriods(client, { page, pageSize: PAGE_SIZE, q, status }),
    listSalaryStructures(client),
  ]);
  const { rows, total } = periods;

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (status) urlParams.set("status", status);

  return (
    <PageContainer>
      <PageHeader
        title="Payroll"
        description="Payroll periods and salary structures."
        breadcrumb={[{ label: "HR" }, { label: "Payroll" }]}
      />

      <Card className="overflow-hidden">
        <div className="border-b border-erp-border px-4 py-3">
          <h2 className="text-sm font-semibold text-erp-text">Payroll Periods</h2>
        </div>
        <ListToolbar
          baseHref="/admin/hr/payroll"
          q={q}
          searchPlaceholder="Search period name…"
          count={`${total.toLocaleString()} period${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "status",
              label: "status",
              value: status,
              options: PERIOD_STATUSES.map((value) => ({
                value,
                label: labelFor(value, PAYROLL_PERIOD_STATUS_LABELS),
              })),
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="payroll"
            title="No payroll periods found"
            description={
              q || status
                ? "Try adjusting your search or filters."
                : "Payroll periods will appear here once created."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Period</TH>
                  <TH>Start</TH>
                  <TH>End</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((period) => (
                  <TR key={period.id}>
                    <TD className="font-medium text-erp-text">{period.name}</TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(period.start_date)}
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(period.end_date)}
                    </TD>
                    <TD>
                      <StatusBadge status={labelFor(period.status, PAYROLL_PERIOD_STATUS_LABELS)} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination params={urlParams} page={page} total={total} />
          </>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-erp-border px-4 py-3">
          <h2 className="text-sm font-semibold text-erp-text">
            Salary Structures
            <span className="ml-2 font-normal text-erp-text-muted">
              {structures.length} structure{structures.length === 1 ? "" : "s"}
            </span>
          </h2>
        </div>
        {structures.length === 0 ? (
          <EmptyState
            icon="payroll"
            title="No salary structures yet"
            description="Salary structures define the earning and deduction components applied each pay period."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Structure</TH>
                <TH>Description</TH>
                <TH>Components</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {structures.map((structure) => (
                <TR key={structure.id}>
                  <TD className="font-medium text-erp-text">{structure.name}</TD>
                  <TD className="max-w-96">
                    <span className="block truncate text-erp-text-secondary">
                      {structure.description ?? "—"}
                    </span>
                  </TD>
                  <TD className="tabular-nums text-erp-text-secondary">
                    {structure.component_count}
                  </TD>
                  <TD>
                    <StatusBadge status={structure.is_active ? "Active" : "Inactive"} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </PageContainer>
  );
}