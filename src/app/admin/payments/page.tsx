import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import {
  VerifyManualPaymentForm,
  VoidPendingPaymentForm,
} from "@/components/admin/payment-forms";
import {
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Pagination,
  SearchForm,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getAdminPayments } from "@/lib/admin/payments";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { paymentStatusTone, statusLabel } from "@/lib/admin/labels";
import { formatGHS } from "@/lib/format";

export const metadata: Metadata = {
  title: "Payments — Yemanuel Store Admin",
};

const MANUAL_METHODS = ["bank_transfer", "cash", "mobile_money"];

type SearchParams = Promise<{
  q?: string;
  method?: string;
  status?: string;
  page?: string;
}>;

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return <UnauthorizedPage message="Your account does not have the sales.read permission." />;
  }
  const canVerify = hasPermission(session, PERMISSIONS.sales.update);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await getAdminPayments({
    q: params.q,
    method: params.method,
    status: params.status,
    page,
  });

  const pendingManual = result.payments.filter(
    (payment) => payment.status === "pending" && MANUAL_METHODS.includes(payment.method),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        description={`${result.total} payment${result.total === 1 ? "" : "s"} on record. Payments are only marked paid once confirmed — never automatically.`}
      />

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <SearchForm
            placeholder="Search reference or order…"
            initialValue={params.q ?? ""}
            extraFields={
              <>
                <select
                  name="method"
                  defaultValue={params.method ?? ""}
                  aria-label="Filter by method"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                >
                  <option value="">All methods</option>
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile money</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="other">Other</option>
                </select>
                <select
                  name="status"
                  defaultValue={params.status ?? ""}
                  aria-label="Filter by status"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="authorized">Authorized</option>
                  <option value="paid">Paid</option>
                  <option value="void">Void</option>
                  <option value="refunded">Refunded</option>
                </select>
              </>
            }
          />
        </div>

        {result.payments.length === 0 ? (
          <AdminEmptyState
            title="No payments yet"
            message="Payments appear here as soon as orders are placed at checkout."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Reference</Th>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Method</Th>
                <Th className="text-right">Amount</Th>
                <Th>Status</Th>
                <Th>Provider ref.</Th>
                <Th>Received by</Th>
                <Th>Date</Th>
                {canVerify && <Th>Action</Th>}
              </>
            }
          >
            {result.payments.map((payment) => (
              <tr key={payment.id} className="align-top transition-colors hover:bg-navy-soft/40">
                <Td className="font-mono text-xs text-ink">{payment.reference ?? "—"}</Td>
                <Td>
                  <Link
                    href={`/admin/orders/${payment.orderNumber}`}
                    className="font-mono text-xs font-semibold text-navy hover:underline"
                  >
                    {payment.orderNumber}
                  </Link>
                </Td>
                <Td className="text-ink-soft">{payment.customerName ?? "Guest"}</Td>
                <Td className="text-ink-soft">{payment.method.replaceAll("_", " ")}</Td>
                <Td className="whitespace-nowrap text-right font-medium">
                  {formatGHS(payment.amount)}
                </Td>
                <Td>
                  <AdminBadge tone={paymentStatusTone(payment.status)}>
                    {statusLabel(payment.status)}
                  </AdminBadge>
                </Td>
                <Td className="max-w-40 truncate font-mono text-xs text-ink-soft">
                  {payment.providerReference ?? "—"}
                </Td>
                <Td className="text-ink-soft">{payment.receivedByName ?? "—"}</Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(payment.paymentDate).toLocaleDateString("en-GB")}
                </Td>
                {canVerify && (
                  <Td>
                    {payment.status === "pending" && MANUAL_METHODS.includes(payment.method) ? (
                      <div className="flex flex-col items-start gap-2">
                        <VoidPendingPaymentForm paymentId={payment.id} />
                      </div>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </Td>
                )}
              </tr>
            ))}
          </AdminTable>
        )}
        <Pagination page={page} pageSize={25} total={result.total} basePath="/admin/payments" />
      </div>

      {canVerify && pendingManual.length > 0 && (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Verify pending bank transfer / mobile money / cash payments
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {pendingManual.map((payment) => (
              <div
                key={payment.id}
                className="rounded-md border border-line bg-paper p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-xs font-semibold text-ink">
                    {payment.reference ?? "—"}
                  </p>
                  <p className="text-xs font-semibold text-navy">
                    {formatGHS(payment.amount)} · {payment.method.replaceAll("_", " ")}
                  </p>
                </div>
                <p className="mb-3 text-[11px] leading-4 text-ink-soft">
                  Order {payment.orderNumber} · {payment.customerName ?? "Guest"}
                </p>
                <VerifyManualPaymentForm payment={payment} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}