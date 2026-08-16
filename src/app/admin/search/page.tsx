import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminEmptyState, AdminTable, PageHeader, SearchForm, Td, Th } from "@/components/admin/ui";
import { getSearchResults } from "@/lib/admin/search";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGhanaPhone } from "@/lib/format";
import { orderStatusTone, productStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Search — Yemanuel Store Admin",
};

type SearchParams = Promise<{ q?: string }>;

function ResultSection({
  title,
  children,
  count,
}: {
  title: string;
  children: ReactNode;
  count: number;
}) {
  return (
    <section className="rounded-lg border border-line bg-white">
      <div className="border-b border-line px-4 py-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
          {title} <span className="ml-1 font-normal normal-case text-ink-faint">({count})</span>
        </h2>
      </div>
      {children}
    </section>
  );
}

export default async function AdminSearchPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (!session) return null;

  const { q } = await searchParams;
  const term = (q ?? "").trim();

  const canReadProducts = hasPermission(session, PERMISSIONS.products.read);
  const canReadCustomers = hasPermission(session, PERMISSIONS.customers.read);
  const canReadSales = hasPermission(session, PERMISSIONS.sales.read);
  const canReadSuppliers = hasPermission(session, PERMISSIONS.suppliers.read);

  const results =
    term.length > 0
      ? await getSearchResults(term)
      : {
          products: [],
          variants: [],
          customers: [],
          orders: [],
          suppliers: [],
        };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Search"
        description="Find products, variants, customers, orders and suppliers."
      />

      <div className="rounded-lg border border-line bg-white">
        <div className="px-4 py-2.5">
          <SearchForm placeholder="Search across the store…" initialValue={term} />
        </div>
      </div>

      {term.length === 0 ? (
        <div className="rounded-lg border border-line bg-white p-4 text-xs text-ink-soft">
          Type a query to search across the store. Results respect your read permissions.
        </div>
      ) : (
        <div className="space-y-4">
          {canReadProducts && (
            <ResultSection title="Products" count={results.products.length}>
              {results.products.length === 0 ? (
                <AdminEmptyState title="No product matches" message="Try a different term." />
              ) : (
                <AdminTable head={<><Th>Name</Th><Th>Status</Th></>}>
                  {results.products.map((product) => (
                    <tr key={product.id} className="transition-colors hover:bg-navy-soft/40">
                      <Td>
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="font-medium text-navy hover:underline"
                        >
                          {product.name}
                        </Link>
                      </Td>
                      <Td>
                        <AdminBadge tone={productStatusTone(product.status)}>
                          {statusLabel(product.status)}
                        </AdminBadge>
                      </Td>
                    </tr>
                  ))}
                </AdminTable>
              )}
            </ResultSection>
          )}

          {canReadProducts && (
            <ResultSection title="Variants" count={results.variants.length}>
              {results.variants.length === 0 ? (
                <AdminEmptyState title="No variant matches" message="Try a SKU or variant name." />
              ) : (
                <AdminTable head={<><Th>Variant</Th><Th>SKU</Th><Th>Product</Th></>}>
                  {results.variants.map((variant) => (
                    <tr key={variant.id} className="transition-colors hover:bg-navy-soft/40">
                      <Td className="font-medium">{variant.name}</Td>
                      <Td>
                        <span className="font-mono text-xs text-ink-soft">{variant.sku}</span>
                      </Td>
                      <Td className="text-ink-soft">{variant.productName ?? "—"}</Td>
                    </tr>
                  ))}
                </AdminTable>
              )}
            </ResultSection>
          )}

          {canReadCustomers && (
            <ResultSection title="Customers" count={results.customers.length}>
              {results.customers.length === 0 ? (
                <AdminEmptyState title="No customer matches" message="Try a name, phone or code." />
              ) : (
                <AdminTable head={<><Th>Code</Th><Th>Name</Th><Th>Phone</Th><Th>Email</Th></>}>
                  {results.customers.map((customer) => (
                    <tr key={customer.id} className="transition-colors hover:bg-navy-soft/40">
                      <Td>
                        <span className="font-mono text-xs text-ink-soft">
                          {customer.customerCode}
                        </span>
                      </Td>
                      <Td>
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="font-medium text-navy hover:underline"
                        >
                          {customer.firstName} {customer.lastName}
                        </Link>
                      </Td>
                      <Td className="whitespace-nowrap text-ink-soft">
                        {formatGhanaPhone(customer.phone)}
                      </Td>
                      <Td className="text-ink-soft">{customer.email ?? "—"}</Td>
                    </tr>
                  ))}
                </AdminTable>
              )}
            </ResultSection>
          )}

          {canReadSales && (
            <ResultSection title="Orders" count={results.orders.length}>
              {results.orders.length === 0 ? (
                <AdminEmptyState title="No order matches" message="Search by order number." />
              ) : (
                <AdminTable head={<><Th>Order</Th><Th>Customer</Th><Th>Status</Th></>}>
                  {results.orders.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-navy-soft/40">
                      <Td>
                        <Link
                          href={`/admin/orders/${order.orderNumber}`}
                          className="font-mono text-xs font-semibold text-navy hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </Td>
                      <Td className="text-ink-soft">{order.customerName ?? "—"}</Td>
                      <Td>
                        <AdminBadge tone={orderStatusTone(order.status)}>
                          {statusLabel(order.status)}
                        </AdminBadge>
                      </Td>
                    </tr>
                  ))}
                </AdminTable>
              )}
            </ResultSection>
          )}

          {canReadSuppliers && (
            <ResultSection title="Suppliers" count={results.suppliers.length}>
              {results.suppliers.length === 0 ? (
                <AdminEmptyState title="No supplier matches" message="Try a name, code or phone." />
              ) : (
                <AdminTable head={<><Th>Code</Th><Th>Name</Th><Th>Phone</Th></>}>
                  {results.suppliers.map((supplier) => (
                    <tr key={supplier.id} className="transition-colors hover:bg-navy-soft/40">
                      <Td>
                        <span className="font-mono text-xs text-ink-soft">
                          {supplier.supplierCode}
                        </span>
                      </Td>
                      <Td>
                        <Link
                          href={`/admin/suppliers/${supplier.id}`}
                          className="font-medium text-navy hover:underline"
                        >
                          {supplier.name}
                        </Link>
                      </Td>
                      <Td className="whitespace-nowrap text-ink-soft">
                        {formatGhanaPhone(supplier.phone)}
                      </Td>
                    </tr>
                  ))}
                </AdminTable>
              )}
            </ResultSection>
          )}

          {!canReadProducts &&
            !canReadCustomers &&
            !canReadSales &&
            !canReadSuppliers && (
              <div className="rounded-lg border border-line bg-white p-4 text-xs text-ink-soft">
                Your account does not have read permission for any searchable modules.
              </div>
            )}
        </div>
      )}
    </div>
  );
}