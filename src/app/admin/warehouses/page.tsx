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
import { listWarehouses, PAGE_SIZE } from "@/lib/admin/inventory";
import { humanize } from "@/lib/admin/labels";
import { formatGhanaPhone } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Warehouses — Yemanuel ERP",
};

const LOCATION_TYPES = ["store", "warehouse", "pickup_point"];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function WarehousesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.inventory.read)) {
    return (
      <PageContainer>
        <PageHeader title="Warehouses" breadcrumb={[{ label: "Inventory" }, { label: "Warehouses" }]} />
        <NoAccess module="warehouses" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const type = firstParam(params.type);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listWarehouses(client, { page, pageSize: PAGE_SIZE, q, type });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (type) urlParams.set("type", type);

  return (
    <PageContainer>
      <PageHeader
        title="Warehouses"
        description="Stock locations where inventory is held."
        breadcrumb={[{ label: "Inventory" }, { label: "Warehouses" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/warehouses"
          q={q}
          searchPlaceholder="Search name, code or city…"
          count={`${total.toLocaleString()} location${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "type",
              label: "type",
              value: type,
              options: LOCATION_TYPES.map((value) => ({ value, label: humanize(value) })),
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="warehouses"
            title="No locations found"
            description={
              q || type ? "Try adjusting your search or filters." : "Stock locations will appear here."
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
                  <TH>City</TH>
                  <TH>Address</TH>
                  <TH>Phone</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((location) => (
                  <TR key={location.id}>
                    <TD className="font-mono text-[12px] text-erp-navy">{location.code ?? "—"}</TD>
                    <TD className="font-medium text-erp-text">{location.name}</TD>
                    <TD className="text-erp-text-secondary">
                      {humanize(location.location_type)}
                    </TD>
                    <TD className="text-erp-text-secondary">{location.city ?? "—"}</TD>
                    <TD className="max-w-56 text-erp-text-secondary">
                      <span className="block truncate">{location.address_line_1 ?? "—"}</span>
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatGhanaPhone(location.phone ?? "")}
                    </TD>
                    <TD>
                      <StatusBadge status={humanize(location.status ?? "")} />
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