import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { PurchaseOrderForm } from "@/components/admin/purchasing-forms";
import {
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Pagination,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getPurchaseOrders } from "@/lib/admin/purchasing";
import { getLocations, getVariantsForSelect } from "@/lib/admin/inventory";
import { getSuppliers } from "@/lib/admin/suppliers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { purchaseOrderStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Purchase Orders — Yemanuel Store Admin",
};

type SearchParams = Promise<{ page?: string }>;

export default async function AdminPurchaseOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.purchases.read)) {
    return <UnauthorizedPage message="Your account does not have the purchases.read permission." />;
  }
  const canCreate = hasPermission(session, PERMISSIONS.purchases.create);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await getPurchaseOrders({ page });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Purchase Orders"
        description={`${result.total} purchase order${result.total === 1 ? "" : "s"} on record.`}
      />

      <div className="rounded-lg border border-line bg-white">
        {result.orders.length === 0 ? (
          <AdminEmptyState
            title="No purchase orders yet"
            message="Create your first purchase order to track inbound stock."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>PO number</Th>
                <Th>Supplier</Th>
                <Th>Status</Th>
                <Th className="text-right">Lines</Th>
                <Th className="text-right">Units</Th>
                <Th>Expected</Th>
                <Th>Created</Th>
              </>
            }
          >
            {result.orders.map((order) => (
              <tr key={order.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/purchases/orders/${order.id}`}
                    className="font-mono text-xs font-semibold text-navy hover:underline"
                  >
                    {order.poNumber}
                  </Link>
                </Td>
                <Td className="font-medium">{order.supplierName}</Td>
                <Td>
                  <AdminBadge tone={purchaseOrderStatusTone(order.status)}>
                    {statusLabel(order.status)}
                  </AdminBadge>
                </Td>
                <Td className="text-right text-ink-soft">{order.itemCount}</Td>
                <Td className="text-right text-ink-soft">{order.totalUnits}</Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {order.expectedDate
                    ? new Date(order.expectedDate).toLocaleDateString("en-GB")
                    : "—"}
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(order.createdAt).toLocaleDateString("en-GB")}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
        <Pagination page={page} pageSize={25} total={result.total} basePath="/admin/purchases/orders" />
      </div>

      {canCreate && (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
            New purchase order
          </h2>
          <PurchaseOrderForm
            suppliers={(await getSuppliers({ pageSize: 500 })).suppliers}
            locations={await getLocations()}
            variants={await getVariantsForSelect()}
          />
        </section>
      )}
    </div>
  );
}