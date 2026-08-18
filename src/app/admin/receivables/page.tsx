import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import {
  AdminCardSection,
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Pagination,
  SearchForm,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { KpiCard } from "@/components/admin/dashboard/kpi";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { getReceivablesPage, getReceivablesSummary } from "@/lib/admin/receivables";
import {
  agingBucketLabel,
  agingBucketTone,
  formatDateLabel,
} from "@/lib/admin/reporting";
import { formatGHS, formatGhanaPhone } from "@/lib/format";

export const metadata: Metadata = {
  title: "Receivables — Yemanuel Store Admin",
};

export default async function AdminReceivablesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return <UnauthorizedPage message="Your account does not have the sales.read permission." />;
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 25;

  const [summary, list] = await Promise.all([
    getReceivablesSummary(),
    getReceivablesPage({ q: params.q, page, pageSize }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Receivables"
        description="Outstanding customer balances on unpaid orders. Aging is measured from the order date — orders do not carry due dates."
      />

      {summary ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total outstanding"
              value={formatGHS(summary.totalOutstanding)}
              note={`${summary.customerCount} customer${summary.customerCount === 1 ? "" : "s"} with balances`}
              tone={summary.totalOutstanding > 0 ? "danger" : "default"}
            />
            <KpiCard
              label="Open orders"
              value={String(summary.openOrderCount)}
              note="Unpaid or partially paid orders"
            />
            <KpiCard
              label="Largest balance"
              value={formatGHS(summary.largestBalance)}
              note="Single customer with the most owed"
            />
            <KpiCard
              label="Overdue"
              value={formatGHS(
                summary.aging
                  .filter((bucket) => bucket.bucket !== "current")
                  .reduce((sum, bucket) => sum + bucket.outstanding, 0),
              )}
              note="Orders older than 30 days"
              tone="danger"
            />
          </div>

          <AdminCardSection title="Aging summary">
            <AdminTable
              head={
                <>
                  <Th>Bucket</Th>
                  <Th className="text-right">Orders</Th>
                  <Th className="text-right">Outstanding</Th>
                </>
              }
            >
              {summary.aging.map((bucket) => (
                <tr key={bucket.bucket} className="transition-colors hover:bg-navy-soft/40">
                  <Td>
                    <AdminBadge tone={agingBucketTone(bucket.bucket)}>
                      {agingBucketLabel(bucket.bucket)}
                    </AdminBadge>
                  </Td>
                  <Td className="text-right text-ink-soft">{bucket.count}</Td>
                  <Td className="whitespace-nowrap text-right font-medium">
                    {formatGHS(bucket.outstanding)}
                  </Td>
                </tr>
              ))}
            </AdminTable>
          </AdminCardSection>
        </>
      ) : (
        <div className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-2.5 text-xs leading-5 text-danger">
          <strong>Aggregations are not available yet.</strong> Receivables
          summary figures are read from SQL functions in the{" "}
          <code className="mx-1 rounded bg-white/60 px-1">app</code> schema
          (migration{" "}
          <code className="mx-1 rounded bg-white/60 px-1">
            20260817040000_dashboard_aggregations.sql
          </code>
          ). Apply the migration to unlock the summary and aging panels. The
          outstanding orders table below still works.
        </div>
      )}

      <AdminCardSection title="Outstanding orders" headerExtra={<SearchForm placeholder="Search order number or guest…" initialValue={params.q ?? ""} />}>
        {list.rows.length === 0 ? (
          <AdminEmptyState
            title="No outstanding orders"
            message="Orders with an unpaid balance will appear here."
          />
        ) : (
          <>
            <AdminTable
              head={
                <>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th>Date</Th>
                  <Th className="text-right">Total</Th>
                  <Th className="text-right">Paid</Th>
                  <Th className="text-right">Outstanding</Th>
                  <Th>Age</Th>
                </>
              }
            >
              {list.rows.map((row) => (
                <tr key={row.orderId} className="transition-colors hover:bg-navy-soft/40">
                  <Td>
                    <Link
                      href={`/admin/orders/${row.orderNumber}`}
                      className="font-medium text-navy hover:underline"
                    >
                      {row.orderNumber}
                    </Link>
                  </Td>
                  <Td>
                    {row.customerId ? (
                      <Link
                        href={`/admin/receivables/${row.customerId}`}
                        className="text-ink hover:text-navy hover:underline"
                      >
                        {row.customerName}
                      </Link>
                    ) : (
                      <span className="text-ink-soft">{row.customerName}</span>
                    )}
                    {row.customerPhone && (
                      <span className="block text-[11px] text-ink-faint">
                        {formatGhanaPhone(row.customerPhone)}
                      </span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-ink-soft">
                    {formatDateLabel(row.createdAt)}
                  </Td>
                  <Td className="whitespace-nowrap text-right text-ink-soft">
                    {formatGHS(row.totalAmount)}
                  </Td>
                  <Td className="whitespace-nowrap text-right text-ink-soft">
                    {formatGHS(row.paidAmount)}
                  </Td>
                  <Td className="whitespace-nowrap text-right font-semibold text-danger">
                    {formatGHS(row.outstanding)}
                  </Td>
                  <Td>
                    <AdminBadge tone={agingBucketTone(row.agingBucket)}>
                      {row.ageDays}d
                    </AdminBadge>
                  </Td>
                </tr>
              ))}
            </AdminTable>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={list.total}
              basePath="/admin/receivables"
              searchParams={new URLSearchParams(
                params.q ? { q: params.q } : undefined,
              )}
            />
          </>
        )}
      </AdminCardSection>
    </div>
  );
}