import type { Metadata } from "next";
import Link from "next/link";
import { ExpenseForm } from "@/components/admin/expense-forms";
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
import { getExpenses, getExpenseCategories } from "@/lib/admin/expenses";
import { getLocations } from "@/lib/admin/inventory";
import { getSuppliers } from "@/lib/admin/suppliers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";

export const metadata: Metadata = {
  title: "Expenses — Yemanuel Store Admin",
};

type SearchParams = Promise<{ q?: string; category?: string; page?: string }>;

export default async function AdminExpensesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.expenses.read)) {
    return <UnauthorizedPage message="Your account does not have the expenses.read permission." />;
  }
  const canCreate = hasPermission(session, PERMISSIONS.expenses.create);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await getExpenses({ q: params.q, categoryId: params.category, page });

  const shownTotal = result.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const filterParams = new URLSearchParams();
  if (params.q) filterParams.set("q", params.q);
  if (params.category) filterParams.set("category", params.category);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Expenses"
        description={`${result.total} expense${result.total === 1 ? "" : "s"} on record · ${formatGHS(shownTotal)} shown`}
      />

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <SearchForm placeholder="Search expense descriptions…" initialValue={params.q ?? ""} />
        </div>
        {result.expenses.length === 0 ? (
          <AdminEmptyState
            title="No expenses found"
            message="Try a different search, or record the first expense."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Number</Th>
                <Th>Date</Th>
                <Th>Description</Th>
                <Th>Category</Th>
                <Th>Method</Th>
                <Th>Supplier</Th>
                <Th className="text-right">Amount</Th>
              </>
            }
          >
            {result.expenses.map((expense) => (
              <tr key={expense.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/expenses/${expense.id}`}
                    className="font-mono text-xs font-semibold text-navy hover:underline"
                  >
                    {expense.expenseNumber}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(expense.expenseDate).toLocaleDateString("en-GB")}
                </Td>
                <Td className="max-w-64 truncate font-medium">{expense.description}</Td>
                <Td className="text-ink-soft">{expense.categoryName}</Td>
                <Td className="text-ink-soft">{expense.method.replaceAll("_", " ")}</Td>
                <Td className="text-ink-soft">{expense.supplierName ?? "—"}</Td>
                <Td className="whitespace-nowrap text-right font-medium">
                  {formatGHS(expense.amount)}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
        <Pagination
          page={page}
          pageSize={25}
          total={result.total}
          basePath="/admin/expenses"
          searchParams={filterParams}
        />
      </div>

      {canCreate && (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Record an expense
          </h2>
          <ExpenseForm
            categories={(await getExpenseCategories())
              .filter((category) => category.isActive)
              .map((category) => ({ id: category.id, name: category.name }))}
            suppliers={(await getSuppliers({ pageSize: 500 })).suppliers.map((supplier) => ({
              id: supplier.id,
              name: supplier.name,
            }))}
            locations={await getLocations()}
          />
        </section>
      )}
    </div>
  );
}