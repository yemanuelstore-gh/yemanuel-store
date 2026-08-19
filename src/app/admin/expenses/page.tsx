import type { Metadata } from "next";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/status-badge";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Pagination } from "@/components/admin/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/admin/no-access";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { listExpenses, listExpenseCategories, PAGE_SIZE } from "@/lib/admin/treasury";
import { PAYMENT_METHOD_LABELS, labelFor } from "@/lib/admin/labels";
import { formatDate, formatGHS } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Expenses — Yemanuel Store ERP",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.expenses.read)) {
    return (
      <PageContainer>
        <PageHeader title="Expenses" breadcrumb={[{ label: "Finance" }, { label: "Expenses" }]} />
        <NoAccess module="expenses" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const category = firstParam(params.category);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const categories = await listExpenseCategories(client);
  const categoriesById = new Map(categories.map((c) => [c.name, c.id]));
  const categoryId = category ? categoriesById.get(category) : undefined;

  const { rows, total } = await listExpenses(client, {
    page,
    pageSize: PAGE_SIZE,
    q,
    category: categoryId,
  });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (category) urlParams.set("category", category);

  return (
    <PageContainer>
      <PageHeader
        title="Expenses"
        description="Operating expenses across all categories."
        breadcrumb={[{ label: "Finance" }, { label: "Expenses" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/expenses"
          q={q}
          searchPlaceholder="Search number, description or reference…"
          count={`${total.toLocaleString()} expense${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "category",
              label: "category",
              value: category,
              options: categories.map((c) => ({ value: c.name, label: c.name })),
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="expenses"
            title="No expenses found"
            description={
              q || category
                ? "Try adjusting your search or filters."
                : "Operating expenses will appear here."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Expense</TH>
                  <TH>Category</TH>
                  <TH>Description</TH>
                  <TH>Date</TH>
                  <TH>Method</TH>
                  <TH className="text-right">Amount</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((expense) => (
                  <TR key={expense.id}>
                    <TD className="font-medium text-erp-navy">{expense.expense_number}</TD>
                    <TD className="max-w-44">
                      <span className="block truncate text-erp-text-secondary">
                        {expense.expense_categories?.name ?? "—"}
                      </span>
                    </TD>
                    <TD className="max-w-56">
                      <span className="block truncate text-erp-text-secondary">
                        {expense.description ?? "—"}
                      </span>
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(expense.expense_date)}
                    </TD>
                    <TD>
                      <StatusBadge status={labelFor(expense.method, PAYMENT_METHOD_LABELS)} />
                    </TD>
                    <TD className="text-right font-semibold tabular-nums text-erp-text">
                      {formatGHS(expense.amount ?? 0)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination params={urlParams} page={page} total={total} />
          </>
        )}
      </Card>
    </PageContainer>
  );
}