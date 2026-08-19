import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatGHS } from "@/lib/format";
import type { RecentOrderRow } from "@/lib/admin/dashboard";
import { EmptyState } from "@/components/ui/empty-state";

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today ${time}`;
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${time}`;
}

export function RecentOrdersTable({ orders }: { orders: RecentOrderRow[] }) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon="orders"
        title="No recent orders"
        description="Orders placed on the storefront or at the point of sale will appear here."
      />
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Order</TH>
          <TH>Customer</TH>
          <TH className="text-right">Amount</TH>
          <TH>Payment</TH>
          <TH>Status</TH>
          <TH>Date</TH>
        </TR>
      </THead>
      <TBody>
        {orders.map((order) => (
          <TR key={order.order_number}>
            <TD className="font-medium text-erp-navy">
              {order.order_number}
            </TD>
            <TD className="max-w-48">
              <span className="block truncate">{order.customer_name}</span>
            </TD>
            <TD className="text-right font-medium tabular-nums">
              {formatGHS(order.total_amount)}
            </TD>
            <TD>
              <StatusBadge status={order.payment_status} />
            </TD>
            <TD>
              <StatusBadge status={order.status} />
            </TD>
            <TD className="text-erp-text-secondary">{formatDate(order.created_at)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}