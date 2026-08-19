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
import { listSuppliers, PAGE_SIZE } from "@/lib/admin/purchasing";
import { humanize } from "@/lib/admin/labels";
import { formatGhanaPhone } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Suppliers — Yemanuel ERP",
};

const SUPPLIER_STATUSES = ["active", "inactive"];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.suppliers.read)) {
    return (
      <PageContainer>
        <PageHeader title="Suppliers" breadcrumb={[{ label: "Purchasing" }, { label: "Suppliers" }]} />
        <NoAccess module="suppliers" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const status = firstParam(params.status);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listSuppliers(client, { page, pageSize: PAGE_SIZE, q, status });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (status) urlParams.set("status", status);

  return (
    <PageContainer>
      <PageHeader
        title="Suppliers"
        description="Companies and vendors Yemanuel Store buys from."
        breadcrumb={[{ label: "Purchasing" }, { label: "Suppliers" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/suppliers"
          q={q}
          searchPlaceholder="Search name, code, email or phone…"
          count={`${total.toLocaleString()} supplier${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "status",
              label: "status",
              value: status,
              options: SUPPLIER_STATUSES.map((value) => ({ value, label: humanize(value) })),
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="suppliers"
            title="No suppliers found"
            description={
              q || status ? "Try adjusting your search or filters." : "Suppliers will appear here."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Code</TH>
                  <TH>Supplier</TH>
                  <TH>Contact</TH>
                  <TH>Phone</TH>
                  <TH>Email</TH>
                  <TH>Terms</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((supplier) => (
                  <TR key={supplier.id}>
                    <TD className="font-mono text-[12px] text-erp-navy">{supplier.supplier_code ?? "—"}</TD>
                    <TD className="font-medium text-erp-text">{supplier.name}</TD>
                    <TD className="text-erp-text-secondary">{supplier.contact_person ?? "—"}</TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatGhanaPhone(supplier.phone ?? "")}
                    </TD>
                    <TD className="max-w-44">
                      <span className="block truncate text-erp-text-secondary">{supplier.email ?? "—"}</span>
                    </TD>
                    <TD className="tabular-nums text-erp-text-secondary">
                      {supplier.payment_terms_days != null ? `${supplier.payment_terms_days} days` : "—"}
                    </TD>
                    <TD>
                      <StatusBadge status={humanize(supplier.status)} />
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