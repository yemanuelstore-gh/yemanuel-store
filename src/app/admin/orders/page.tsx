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
import { listOrders, PAGE_SIZE } from "@/lib/admin/sales";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  CHANNEL_LABELS,
  labelFor,
} from "@/lib/admin/labels";
import { formatDate, formatGHS } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Orders — Yemanuel Store ERP",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return (
      <PageContainer>
        <PageHeader title="Orders" breadcrumb={[{ label: "Sales" }, { label: "Orders" }]} />
        <NoAccess module="sales" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const status = firstParam(params.status);
  const paymentStatus = firstParam(params.paymentStatus);
  const channel = firstParam(params.channel);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listOrders(client, {
    page,
    pageSize: PAGE_SIZE,
    q,
    status,
    paymentStatus,
    channel,
  });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (status) urlParams.set("status", status);
  if (paymentStatus) urlParams.set("paymentStatus", paymentStatus);
  if (channel) urlParams.set("channel", channel);

  return (
    <PageContainer>
      <PageHeader
        title="Orders"
        description="All orders placed through the storefront and point of sale."
        breadcrumb={[{ label: "Sales" }, { label: "Orders" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/orders"
          q={q}
          searchPlaceholder="Search order number or guest name…"
          count={`${total.toLocaleString()} order${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "status",
              label: "status",
              value: status,
              options: [
                { value: "pending", label: "Pending" },
                { value: "processing", label: "Processing" },
                { value: "shipped", label: "Shipped" },
                { value: "delivered", label: "Delivered" },
                { value: "cancelled", label: "Cancelled" },
              ],
            },
            {
              name: "paymentStatus",
              label: "payment",
              value: paymentStatus,
              options: [
                { value: "unpaid", label: "Unpaid" },
                { value: "paid", label: "Paid" },
                { value: "partially_paid", label: "Partially Paid" },
                { value: "partially_refunded", label: "Partially Refunded" },
                { value: "refunded", label: "Refunded" },
                { value: "pending", label: "Pending" },
                { value: "failed", label: "Failed" },
              ],
            },
            {
              name: "channel",
              label: "channel",
              value: channel,
              options: [
                { value: "online", label: "Online" },
                { value: "in_store", label: "In Store" },
              ],
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="orders"
            title="No orders found"
            description={
              q || status || paymentStatus || channel
                ? "Try adjusting your search or filters."
                : "Orders placed on the storefront or at the point of sale will appear here."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Order</TH>
                  <TH>Customer</TH>
                  <TH>Channel</TH>
                  <TH className="text-right">Amount</TH>
                  <TH>Payment</TH>
                  <TH>Status</TH>
                  <TH>Date</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((order) => (
                  <TR key={order.id}>
                    <TD className="font-medium text-erp-navy">{order.order_number}</TD>
                    <TD className="max-w-48">
                      <span className="block truncate">
                        {order.customers
                          ? order.customers.business_name ||
                            [order.customers.first_name, order.customers.last_name]
                              .filter(Boolean)
                              .join(" ") ||
                            "—"
                          : order.guest_name ?? "Guest"}
                      </span>
                    </TD>
                    <TD className="text-erp-text-secondary">
                      {labelFor(order.channel, CHANNEL_LABELS)}
                    </TD>
                    <TD className="text-right font-medium tabular-nums">
                      {formatGHS(order.total_amount ?? 0)}
                    </TD>
                    <TD>
                      <StatusBadge status={labelFor(order.payment_status, PAYMENT_STATUS_LABELS)} />
                    </TD>
                    <TD>
                      <StatusBadge status={labelFor(order.status, ORDER_STATUS_LABELS)} />
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(order.created_at)}
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