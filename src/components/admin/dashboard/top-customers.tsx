import { EmptyState } from "@/components/ui/empty-state";
import { formatGHS } from "@/lib/format";
import type { TopCustomerRow } from "@/lib/admin/dashboard";

export function TopCustomersTable({ customers }: { customers: TopCustomerRow[] }) {
  if (customers.length === 0) {
    return (
      <EmptyState
        icon="customers"
        title="No customer sales yet"
        description="Customers who buy in this period will appear here."
      />
    );
  }

  const maxRevenue = Math.max(...customers.map((customer) => customer.revenue), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-erp-border bg-erp-canvas text-[11px] font-semibold uppercase tracking-wide text-erp-text-secondary">
            <th className="px-4 py-2 text-left">Customer</th>
            <th className="px-4 py-2 text-right">Orders</th>
            <th className="px-4 py-2 text-right">Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-erp-border">
          {customers.map((customer) => (
            <tr
              key={`${customer.name}-${customer.revenue}`}
              className="transition-colors hover:bg-erp-canvas/60"
            >
              <td className="max-w-56 px-4 py-2.5">
                <span className="block truncate text-[13px] font-medium text-erp-text">
                  {customer.name}
                </span>
                <span className="mt-0.5 block h-1 overflow-hidden rounded-full bg-erp-canvas">
                  <span
                    className="block h-full bg-erp-gold"
                    style={{ width: `${(customer.revenue / maxRevenue) * 100}%` }}
                    aria-hidden="true"
                  />
                </span>
              </td>
              <td className="px-4 py-2.5 text-right text-[13px] tabular-nums text-erp-text-secondary">
                {customer.order_count.toLocaleString()}
              </td>
              <td className="px-4 py-2.5 text-right text-[13px] font-medium tabular-nums text-erp-text">
                {formatGHS(customer.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}