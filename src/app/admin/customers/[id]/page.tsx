import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBadge } from "@/components/admin/admin-badge";
import { CustomerForm } from "@/components/admin/customer-forms";
import { AdminEmptyState, AdminTable, DataRow, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getCustomerById } from "@/lib/admin/customers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS, formatGhanaPhone } from "@/lib/format";
import {
  customerStatusTone,
  orderPaymentStatusTone,
  orderStatusTone,
  statusLabel,
} from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Customer — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminCustomerDetailPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  const canUpdate = hasPermission(session, PERMISSIONS.customers.update);
  if (!hasPermission(session, PERMISSIONS.customers.read)) {
    return <UnauthorizedPage message="Your account does not have the customers.read permission." />;
  }

  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${customer.firstName} ${customer.lastName}`}
        description={`${customer.customerCode} · ${statusLabel(customer.customerType)} · Joined ${new Date(
          customer.createdAt,
        ).toLocaleDateString("en-GB")}`}
        actions={
          <AdminBadge tone={customerStatusTone(customer.status)}>
            {statusLabel(customer.status)}
          </AdminBadge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Profile
          </h2>
          <dl>
            <DataRow
              label="Name"
              value={`${customer.firstName} ${customer.lastName}`}
            />
            <DataRow label="Business" value={customer.businessName ?? "—"} />
            <DataRow label="Phone" value={formatGhanaPhone(customer.phone)} />
            <DataRow label="Email" value={customer.email ?? "—"} />
            <DataRow label="TIN" value={customer.tinNumber ?? "—"} />
            <DataRow label="Orders" value={String(customer.orderCount)} />
          </dl>
        </div>
        {canUpdate && (
          <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Edit customer
            </h2>
            <CustomerForm
              initial={{
                id: customer.id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                businessName: customer.businessName,
                phone: customer.phone,
                email: customer.email,
                tinNumber: customer.tinNumber,
                customerType: customer.customerType,
                status: customer.status,
                notes: customer.notes,
              }}
            />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Addresses
          </h2>
        </div>
        {customer.addresses.length === 0 ? (
          <AdminEmptyState
            title="No saved addresses"
            message="The customer has not saved any addresses yet."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Label</Th>
                <Th>Recipient</Th>
                <Th>Phone</Th>
                <Th>Address</Th>
                <Th>Defaults</Th>
              </>
            }
          >
            {customer.addresses.map((address) => (
              <tr key={address.id} className="transition-colors hover:bg-navy-soft/40">
                <Td className="font-medium">{address.label}</Td>
                <Td>{address.recipientName}</Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {formatGhanaPhone(address.recipientPhone)}
                </Td>
                <Td className="max-w-64 text-ink-soft">
                  {[address.addressLine1, address.addressLine2, address.cityName, address.regionName]
                    .filter(Boolean)
                    .join(", ")}
                </Td>
                <Td className="text-xs text-ink-soft">
                  {[
                    address.isDefaultDelivery ? "delivery" : null,
                    address.isDefaultBilling ? "billing" : null,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </div>

      <div className="rounded-lg border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Order history
          </h2>
          <span className="text-[11px] text-ink-faint">
            {customer.orderCount} total · showing latest {customer.orders.length}
          </span>
        </div>
        {customer.orders.length === 0 ? (
          <AdminEmptyState
            title="No orders"
            message="This customer has not placed any orders yet."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Order</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th>Payment</Th>
                <Th className="text-right">Total</Th>
              </>
            }
          >
            {customer.orders.map((order) => (
              <tr key={order.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/orders/${order.orderNumber}`}
                    className="font-semibold text-navy hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(order.createdAt).toLocaleDateString("en-GB")}
                </Td>
                <Td>
                  <AdminBadge tone={orderStatusTone(order.status)}>
                    {statusLabel(order.status)}
                  </AdminBadge>
                </Td>
                <Td>
                  <AdminBadge tone={orderPaymentStatusTone(order.paymentStatus)}>
                    {statusLabel(order.paymentStatus)}
                  </AdminBadge>
                </Td>
                <Td className="whitespace-nowrap text-right font-semibold">
                  {formatGHS(order.totalAmount)}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </div>

      {customer.notes && (
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Notes</h2>
          <p className="mt-2 text-[13px] leading-6 text-ink-soft">{customer.notes}</p>
        </div>
      )}

      <Link
        href="/admin/customers"
        className="text-[11px] font-semibold text-navy hover:underline"
      >
        ← All customers
      </Link>
    </div>
  );
}