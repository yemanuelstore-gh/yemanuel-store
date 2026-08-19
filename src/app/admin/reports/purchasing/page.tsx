import type { Metadata } from "next";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/status-badge";
import { NoAccess } from "@/components/admin/no-access";
import { KpiCard } from "@/components/admin/kpi-card";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  getPurchaseOrderStatusCounts,
  getSupplierSpend,
  getPurchaseTotals,
} from "@/lib/admin/purchasing";
import { PO_STATUS_LABELS, labelFor } from "@/lib/admin/labels";
import { formatGHS } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Purchasing Report — Yemanuel Store ERP",
};

export default async function PurchasingReportPage() {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.reports.view)) {
    return (
      <PageContainer>
        <PageHeader
          title="Purchasing Report"
          breadcrumb={[{ label: "Reports" }, { label: "Purchasing" }]}
        />
        <NoAccess module="purchasing reports" />
      </PageContainer>
    );
  }

  const client = await createClient();
  const [statusCounts, supplierSpend, totals] = await Promise.all([
    getPurchaseOrderStatusCounts(client),
    getSupplierSpend(client, 10),
    getPurchaseTotals(client),
  ]);

  return (
    <PageContainer>
      <PageHeader
        title="Purchasing Report"
        description="Purchase activity across suppliers and purchase orders."
        breadcrumb={[{ label: "Reports" }, { label: "Purchasing" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Purchase Orders"
          value={totals.po_count.toLocaleString()}
          icon="purchase-orders"
        />
        <KpiCard
          label="Goods Received"
          value={totals.receipt_count.toLocaleString()}
          icon="goods-receipts"
        />
        <KpiCard
          label="Invoices Total"
          value={formatGHS(totals.invoice_total)}
          icon="invoices"
        />
        <KpiCard
          label="Paid to Suppliers"
          value={formatGHS(totals.payment_total)}
          icon="payments"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-erp-border px-4 py-3">
            <h2 className="text-sm font-semibold text-erp-text">Purchase Orders by Status</h2>
          </div>
          {statusCounts.length === 0 ? (
            <p className="px-4 py-6 text-sm text-erp-text-secondary">
              No purchase orders recorded yet.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Status</TH>
                  <TH className="text-right">Orders</TH>
                </TR>
              </THead>
              <TBody>
                {statusCounts.map((row) => (
                  <TR key={row.status ?? "unknown"}>
                    <TD>
                      <StatusBadge status={labelFor(row.status, PO_STATUS_LABELS)} />
                    </TD>
                    <TD className="text-right font-semibold tabular-nums text-erp-text">
                      {row.count.toLocaleString()}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-erp-border px-4 py-3">
            <h2 className="text-sm font-semibold text-erp-text">Top Suppliers by Spend</h2>
          </div>
          {supplierSpend.length === 0 ? (
            <p className="px-4 py-6 text-sm text-erp-text-secondary">
              No payments made to suppliers yet.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Supplier</TH>
                  <TH className="text-right">Payments</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {supplierSpend.map((row) => (
                  <TR key={row.supplier_id ?? "unassigned"}>
                    <TD className="max-w-56">
                      <span className="block truncate font-medium text-erp-text">
                        {row.supplier_name}
                      </span>
                    </TD>
                    <TD className="text-right tabular-nums text-erp-text-secondary">
                      {row.payment_count.toLocaleString()}
                    </TD>
                    <TD className="text-right font-semibold tabular-nums text-erp-text">
                      {formatGHS(row.total)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}