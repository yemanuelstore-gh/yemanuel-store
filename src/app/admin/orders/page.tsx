import type { Metadata } from "next";
import Link from "next/link";
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
import { listOrders, PAGE_SIZE, customerDisplayName } from "@/lib/admin/sales";
import {
  CHANNEL_LABELS,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  labelFor,
} from "@/lib/admin/labels";
import { formatGHS, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Orders — Yemanuel ERP",
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
        <NoAccess module="orders" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const status = firstParam(params.status);
  const paymentStatus = firstParam(params.payment);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listOrders(client, {
    page,
    pageSize: PAGE_SIZE,
    q,
    status,
    paymentStatus,
  });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (status) urlParams.set("status", status);
  if (paymentStatus) urlParams.set("payment", paymentStatus);

  return (
    <PageContainer>
      <PageHeader
        title="Orders"
        description="Every order across the storefront and the point of sale."
        breadcrumb={[{ label: "Sales" }, { label: "Orders" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/orders"
          q={q}
          searchPlaceholder="Search order number or guest…"
          count={`${total.toLocaleString()} order${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "status",
              label: "order status",
              value: status,
              options: ORDER_STATUSES.map((value) => ({
                value,
                label: labelFor(value, ORDER_STATUS_LABELS),
              })),
            },
            {
              name: "payment",
              label: "payment status",
              value: paymentStatus,
              options: PAYMENT_STATUSES.map((value) => ({
                value,
                label: labelFor(value, PAYMENT_STATUS_LABELS),
              })),
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="orders"
            title="No orders found"
            description={
              q || status || paymentStatus
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
                    <TD className="font-medium text-erp-navy">
                      <Link
                        href={`/admin/orders/${order.order_number}`}
                        className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
                      >
                        {order.order_number}
                      </Link>
                    </TD>
                    <TD className="max-w-48">
                      <span className="block truncate">
                        {customerDisplayName(order.customers, order.guest_name)}
                      </span>
                    </TD>
                    <TD className="text-erp-text-secondary">
                      {labelFor(order.channel, CHANNEL_LABELS)}
                    </TD>
                    <TD className="text-right font-medium tabular-nums">
                      {formatGHS(Number(order.total_amount || 0))}
                    </TD>
                    <TD>
                      <StatusBadge status={labelFor(order.payment_status, PAYMENT_STATUS_LABELS)} />
                    </TD>
                    <TD>
                      <StatusBadge status={labelFor(order.status, ORDER_STATUS_LABELS)} />
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDateTime(order.created_at)}
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