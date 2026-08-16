import type { Metadata } from "next";
import { ExpenseCategoryEditForm, ExpenseCategoryForm } from "@/components/admin/expense-forms";
import {
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getExpenseCategories } from "@/lib/admin/expenses";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";

export const metadata: Metadata = {
  title: "Expense Categories — Yemanuel Store Admin",
};

export default async function AdminExpenseCategoriesPage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.expenses.read)) {
    return <UnauthorizedPage message="Your account does not have the expenses.read permission." />;
  }
  const canCreate = hasPermission(session, PERMISSIONS.expenses.create);
  const canUpdate = hasPermission(session, PERMISSIONS.expenses.update);

  const categories = await getExpenseCategories();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Expense Categories"
        description={`${categories.length} categor${categories.length === 1 ? "y" : "ies"} on record.`}
      />

      <div className="rounded-lg border border-line bg-white">
        {categories.length === 0 ? (
          <AdminEmptyState
            title="No expense categories yet"
            message="Create categories to organise expenses (e.g. Utilities, Rent, Logistics)."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Name</Th>
                <Th>Description</Th>
                <Th className="text-right">Expenses</Th>
                <Th>Status</Th>
              </>
            }
          >
            {categories.map((category) => (
              <tr key={category.id} className="transition-colors hover:bg-navy-soft/40">
                <Td className="font-medium">{category.name}</Td>
                <Td className="text-ink-soft">{category.description ?? "—"}</Td>
                <Td className="text-right text-ink-soft">{category.expenseCount}</Td>
                <Td>{category.isActive ? "Active" : "Inactive"}</Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {canCreate && (
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
              New category
            </h2>
            <ExpenseCategoryForm />
          </section>
        )}
        {canUpdate && (
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Edit categories
            </h2>
            <div className="space-y-6">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-lg border border-line p-4"
                >
                  <ExpenseCategoryEditForm
                    category={{
                      id: category.id,
                      name: category.name,
                      description: category.description,
                      isActive: category.isActive,
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}