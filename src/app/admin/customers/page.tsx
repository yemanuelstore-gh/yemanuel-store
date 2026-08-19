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
import { listCustomers, PAGE_SIZE } from "@/lib/admin/sales";
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
  labelFor,
} from "@/lib/admin/labels";
import { formatDate, formatGhanaPhone } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customers — Yemanuel ERP",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.customers.read)) {
    return (
      <PageContainer>
        <PageHeader title="Customers" breadcrumb={[{ label: "Sales" }, { label: "Customers" }]} />
        <NoAccess module="customers" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const type = firstParam(params.type);
  const status = firstParam(params.status);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listCustomers(client, {
    page,
    pageSize: PAGE_SIZE,
    q,
    type,
    status,
  });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (type) urlParams.set("type", type);
  if (status) urlParams.set("status", status);

  return (
    <PageContainer>
      <PageHeader
        title="Customers"
        description="Everyone who has shopped with Yemanuel Store."
        breadcrumb={[{ label: "Sales" }, { label: "Customers" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/customers"
          q={q}
          searchPlaceholder="Search name, code, email or phone…"
          count={`${total.toLocaleString()} customer${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "type",
              label: "type",
              value: type,
              options: [
                { value: "individual", label: "Individual" },
                { value: "business", label: "Business" },
              ],
            },
            {
              name: "status",
              label: "status",
              value: status,
              options: [
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "blocked", label: "Blocked" },
              ],
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="customers"
            title="No customers found"
            description={
              q || type || status
                ? "Try adjusting your search or filters."
                : "Customers who shop with Yemanuel Store will appear here."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Code</TH>
                  <TH>Name</TH>
                  <TH>Type</TH>
                  <TH>Phone</TH>
                  <TH>Email</TH>
                  <TH>Status</TH>
                  <TH>Customer since</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((customer) => (
                  <TR key={customer.id}>
                    <TD className="font-medium text-erp-navy">{customer.customer_code}</TD>
                    <TD className="max-w-52">
                      <span className="block truncate font-medium text-erp-text">
                        {customer.business_name ||
                          [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
                          "—"}
                      </span>
                    </TD>
                    <TD className="text-erp-text-secondary">
                      {labelFor(customer.customer_type, CUSTOMER_TYPE_LABELS)}
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatGhanaPhone(customer.phone ?? "")}
                    </TD>
                    <TD className="max-w-44">
                      <span className="block truncate text-erp-text-secondary">{customer.email ?? "—"}</span>
                    </TD>
                    <TD>
                      <StatusBadge status={labelFor(customer.status, CUSTOMER_STATUS_LABELS)} />
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(customer.created_at)}
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