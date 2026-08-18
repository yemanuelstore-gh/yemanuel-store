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
import { getPayablesPage, getPayablesSummary } from "@/lib/admin/payables";
import {
  agingBucketLabel,
  agingBucketTone,
  formatDateLabel,
} from "@/lib/admin/reporting";
import { formatGHS } from "@/lib/format";

export const metadata: Metadata = {
  title: "Payables — Yemanuel Store Admin",
};

export default async function AdminPayablesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.purchases.read)) {
    return (
      <UnauthorizedPage message="Your account does not have the purchases.read permission." />
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 25;

  const [summary, list] = await Promise.all([
    getPayablesSummary(),
    getPayablesPage({ q: params.q, page, pageSize }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payables"
        description="Outstanding supplier invoices. Aging is measured from the invoice due date (falling back to the invoice date)."
      />

      {summary ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total outstanding"
              value={formatGHS(summary.totalOutstanding)}
              note={`${summary.supplierCount} supplier${summary.supplierCount === 1 ? "" : "s"} with balances`}
              tone={summary.totalOutstanding > 0 ? "danger" : "default"}
            />
            <KpiCard
              label="Open invoices"
              value={String(summary.openInvoiceCount)}
              note="Pending or partially paid"
            />
            <KpiCard
              label="Overdue"
              value={formatGHS(summary.overdueOutstanding)}
              note="Past the due date"
              tone="danger"
            />
            <KpiCard
              label="Largest balance"
              value={formatGHS(summary.largestBalance)}
              note="Single supplier with the most owed"
            />
          </div>

          <AdminCardSection title="Aging summary">
            <AdminTable
              head={
                <>
                  <Th>Bucket</Th>
                  <Th className="text-right">Invoices</Th>
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
          <strong>Aggregations are not available yet.</strong> Payables summary
          figures are read from SQL functions in the{" "}
          <code className="mx-1 rounded bg-white/60 px-1">app</code> schema
          (migration{" "}
          <code className="mx-1 rounded bg-white/60 px-1">
            20260817040000_dashboard_aggregations.sql
          </code>
          ). Apply the migration to unlock the summary and aging panels. The
          outstanding invoices table below still works.
        </div>
      )}

      <AdminCardSection title="Outstanding invoices" headerExtra={<SearchForm placeholder="Search invoice number…" initialValue={params.q ?? ""} />}>
        {list.rows.length === 0 ? (
          <AdminEmptyState
            title="No outstanding invoices"
            message="Supplier invoices with an unpaid balance will appear here."
          />
        ) : (
          <>
            <AdminTable
              head={
                <>
                  <Th>Invoice</Th>
                  <Th>Supplier</Th>
                  <Th>Invoice date</Th>
                  <Th>Due date</Th>
                  <Th className="text-right">Amount</Th>
                  <Th className="text-right">Paid</Th>
                  <Th className="text-right">Outstanding</Th>
                  <Th>Age</Th>
                </>
              }
            >
              {list.rows.map((row) => (
                <tr key={row.invoiceId} className="transition-colors hover:bg-navy-soft/40">
                  <Td>
                    <Link
                      href={`/admin/purchases/invoices/${row.invoiceId}`}
                      className="font-medium text-navy hover:underline"
                    >
                      {row.invoiceNumber}
                    </Link>
                  </Td>
                  <Td>
                    {row.supplierId ? (
                      <Link
                        href={`/admin/payables/${row.supplierId}`}
                        className="text-ink hover:text-navy hover:underline"
                      >
                        {row.supplierName}
                      </Link>
                    ) : (
                      <span className="text-ink-soft">{row.supplierName}</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-ink-soft">
                    {formatDateLabel(row.invoiceDate)}
                  </Td>
                  <Td className="whitespace-nowrap text-ink-soft">
                    {row.dueDate ? formatDateLabel(row.dueDate) : "—"}
                  </Td>
                  <Td className="whitespace-nowrap text-right text-ink-soft">
                    {formatGHS(row.amount)}
                  </Td>
                  <Td className="whitespace-nowrap text-right text-ink-soft">
                    {formatGHS(row.paidAmount)}
                  </Td>
                  <Td className="whitespace-nowrap text-right font-semibold text-danger">
                    {formatGHS(row.outstanding)}
                  </Td>
                  <Td>
                    <AdminBadge tone={agingBucketTone(row.agingBucket)}>
                      {row.overdueDays === 0 ? "Not due" : `${row.overdueDays}d overdue`}
                    </AdminBadge>
                  </Td>
                </tr>
              ))}
            </AdminTable>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={list.total}
              basePath="/admin/payables"
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