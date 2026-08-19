import { formatGHS } from "@/lib/format";
import { formatCompactGHS } from "@/lib/admin/dashboard";
import type { TopProductRow } from "@/lib/admin/dashboard";
import { EmptyState } from "@/components/ui/empty-state";

export function TopProductsTable({ products }: { products: TopProductRow[] }) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon="products"
        title="No product sales yet"
        description="Products you sell in this period will appear here."
      />
    );
  }

  const maxRevenue = Math.max(...products.map((product) => product.revenue), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-erp-border bg-erp-canvas text-[11px] font-semibold uppercase tracking-wide text-erp-text-secondary">
            <th className="px-4 py-2 text-left">Product</th>
            <th className="px-4 py-2 text-right">Units</th>
            <th className="px-4 py-2 text-right">Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-erp-border">
          {products.map((product) => (
            <tr key={`${product.product_name}-${product.sku}`} className="transition-colors hover:bg-erp-canvas/60">
              <td className="max-w-56 px-4 py-2.5">
                <span className="block truncate text-[13px] font-medium text-erp-text">
                  {product.product_name}
                </span>
                {product.variant_name && (
                  <span className="block truncate text-[11px] text-erp-text-muted">
                    {product.variant_name}
                    {product.sku ? ` · ${product.sku}` : ""}
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right text-[13px] tabular-nums text-erp-text-secondary">
                {product.units.toLocaleString()}
              </td>
              <td className="px-4 py-2.5 text-right text-[13px] font-medium tabular-nums text-erp-text">
                {formatGHS(product.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-1 flex h-1 overflow-hidden rounded-full bg-erp-canvas" aria-hidden="true">
        {products.map((product) => (
          <div
            key={`${product.product_name}-${product.sku}`}
            className="h-full bg-erp-gold"
            style={{ width: `${(product.revenue / maxRevenue) * 100}%` }}
          />
        ))}
      </div>
      <p className="px-4 py-2 text-[11px] text-erp-text-muted">
        Total product revenue {formatCompactGHS(products.reduce((sum, p) => sum + p.revenue, 0))}
      </p>
    </div>
  );
}