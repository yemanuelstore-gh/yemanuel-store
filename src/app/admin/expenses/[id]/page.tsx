import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataRow, PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getExpenseById } from "@/lib/admin/expenses";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";

export const metadata: Metadata = {
  title: "Expense — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminExpenseDetailPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.expenses.read)) {
    return <UnauthorizedPage message="Your account does not have the expenses.read permission." />;
  }

  const { id } = await params;
  const expense = await getExpenseById(id);
  if (!expense) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={expense.expenseNumber}
        description={expense.description}
        actions={
          <span className="text-lg font-bold text-navy">{formatGHS(expense.amount)}</span>
        }
      />

      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">Overview</h2>
        <dl>
          <DataRow label="Category" value={expense.categoryName} />
          <DataRow
            label="Date"
            value={new Date(expense.expenseDate).toLocaleDateString("en-GB")}
          />
          <DataRow label="Method" value={expense.method.replaceAll("_", " ")} />
          <DataRow label="Reference number" value={expense.referenceNumber ?? "—"} />
          <DataRow
            label="Supplier"
            value={
              expense.supplier ? (
                <Link
                  href={`/admin/suppliers/${expense.supplier.id}`}
                  className="text-navy hover:underline"
                >
                  {expense.supplier.name}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <DataRow label="Location" value={expense.location?.name ?? "—"} />
          <DataRow label="Notes" value={expense.notes ?? "—"} />
          <DataRow
            label="Recorded"
            value={new Date(expense.createdAt).toLocaleDateString("en-GB")}
          />
        </dl>
      </div>

      <Link href="/admin/expenses" className="text-[11px] font-semibold text-navy hover:underline">
        ← All expenses
      </Link>
    </div>
  );
}