import type { DashboardClient, DashboardRange } from "@/lib/admin/dashboard";
import { fetchAllPaged } from "@/lib/admin/dashboard";
import type { ListQuery, ListResult } from "@/lib/admin/query";
import { listQuery } from "@/lib/admin/query";

export { PAGE_SIZE } from "@/lib/admin/query";

export type ExpenseCategoryBreakdown = {
  category: string;
  total: number;
  count: number;
};

export async function expenseBreakdownByCategory(
  client: DashboardClient,
  range: DashboardRange,
): Promise<ExpenseCategoryBreakdown[]> {
  const expenses = await fetchAllPaged<{
    amount: number | null;
    expense_date: string;
    expense_categories: { name: string } | null;
  }>((from, to) =>
    client
      .from("expenses")
      .select("amount, expense_date, expense_categories(name)")
      .gte("expense_date", range.start.toISOString().slice(0, 10))
      .lte("expense_date", range.end.toISOString().slice(0, 10))
      .range(from, to),
  );

  const byCategory = new Map<string, ExpenseCategoryBreakdown>();
  for (const expense of expenses) {
    const name = expense.expense_categories?.name ?? "Uncategorised";
    const row = byCategory.get(name) ?? { category: name, total: 0, count: 0 };
    row.total += Number(expense.amount || 0);
    row.count += 1;
    byCategory.set(name, row);
  }

  return [...byCategory.values()]
    .sort((a, b) => b.total - a.total)
    .map((row) => ({ ...row, total: Number(row.total.toFixed(2)) }));
}

export type PaymentMethodBreakdown = {
  method: string;
  total: number;
  count: number;
};

export async function paymentBreakdownByMethod(
  client: DashboardClient,
  range: DashboardRange,
): Promise<PaymentMethodBreakdown[]> {
  const payments = await fetchAllPaged<{ amount: number | null; method: string | null }>(
    (from, to) =>
      client
        .from("payments")
        .select("amount, method")
        .in("status", ["paid", "authorized"])
        .gte("payment_date", range.start.toISOString())
        .lte("payment_date", range.end.toISOString())
        .range(from, to),
  );

  const byMethod = new Map<string, PaymentMethodBreakdown>();
  for (const payment of payments) {
    const name = payment.method ?? "other";
    const row = byMethod.get(name) ?? { method: name, total: 0, count: 0 };
    row.total += Number(payment.amount || 0);
    row.count += 1;
    byMethod.set(name, row);
  }

  return [...byMethod.values()]
    .sort((a, b) => b.total - a.total)
    .map((row) => ({ ...row, total: Number(row.total.toFixed(2)) }));
}

export type PaymentListRow = {
  id: string;
  amount: number | null;
  method: string | null;
  status: string | null;
  payment_date: string | null;
  reference: string | null;
  provider: string | null;
  provider_reference: string | null;
  notes: string | null;
  orders: { order_number: string; payment_status: string | null } | null;
};

export function listPayments(
  client: DashboardClient,
  params: ListQuery & { method?: string; status?: string },
): Promise<ListResult<PaymentListRow>> {
  return listQuery(
    client,
    "payments",
    params,
    (q) => {
      let query = q.order("payment_date", { ascending: false, nullsFirst: false });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.or(
            `reference.ilike.%${term}%,orders.order_number.ilike.%${term}%`,
          );
        }
      }
      if (params.method) query = query.eq("method", params.method);
      if (params.status) query = query.eq("status", params.status);
      return query;
    },
    "id, amount, method, status, payment_date, reference, provider, provider_reference, notes, orders(order_number, payment_status)",
  );
}

export type ExpenseListRow = {
  id: string;
  expense_number: string;
  description: string | null;
  amount: number | null;
  expense_date: string | null;
  method: string | null;
  reference_number: string | null;
  notes: string | null;
  expense_categories: { name: string } | null;
  suppliers: { name: string } | null;
  locations: { name: string } | null;
};

export function listExpenses(
  client: DashboardClient,
  params: ListQuery & { category?: string },
): Promise<ListResult<ExpenseListRow>> {
  return listQuery(
    client,
    "expenses",
    params,
    (q) => {
      let query = q.order("expense_date", { ascending: false, nullsFirst: false });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.or(
            `expense_number.ilike.%${term}%,description.ilike.%${term}%,reference_number.ilike.%${term}%`,
          );
        }
      }
      if (params.category) query = query.eq("category_id", params.category);
      return query;
    },
    "id, expense_number, description, amount, expense_date, method, reference_number, notes, expense_categories(name), suppliers(name), locations(name)",
  );
}

export type ExpenseCategoryOption = {
  id: string;
  name: string;
};

export async function listExpenseCategories(client: DashboardClient): Promise<ExpenseCategoryOption[]> {
  const { data, error } = await client
    .from("expense_categories")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((category) => ({ id: category.id, name: category.name }));
}

export type ReceivableRow = {
  customer_name: string;
  order_count: number;
  outstanding: number;
  latest_order_date: string | null;
};

export type ReceivableResult = ListResult<ReceivableRow> & { totalOutstanding: number };

export async function listReceivables(
  client: DashboardClient,
  params: ListQuery & { q?: string },
): Promise<ReceivableResult> {
  const orders = await fetchAllPaged<{
    id: string;
    customer_id: string | null;
    guest_name: string | null;
    total_amount: number;
    created_at: string;
  }>((from, to) =>
    client
      .from("orders")
      .select("id, customer_id, guest_name, total_amount, created_at, payment_status")
      .neq("status", "cancelled")
      .in("payment_status", ["unpaid", "partially_paid"])
      .range(from, to),
  );

  if (orders.length === 0) return { rows: [], total: 0, totalOutstanding: 0 };

  const payments = await fetchAllPaged<{ order_id: string; amount: number; status: string }>(
    (from, to) =>
      client
        .from("payments")
        .select("order_id, amount, status")
        .in("status", ["paid", "authorized"])
        .range(from, to),
  );

  const paidByOrder = new Map<string, number>();
  for (const payment of payments) {
    paidByOrder.set(
      payment.order_id,
      (paidByOrder.get(payment.order_id) ?? 0) + Number(payment.amount || 0),
    );
  }

  const customerIds = orders
    .map((order) => order.customer_id)
    .filter((id): id is string => Boolean(id));
  const customers = new Map<string, string>();
  for (let i = 0; i < customerIds.length; i += 900) {
    const batch = customerIds.slice(i, i + 900);
    const { data } = await client
      .from("customers")
      .select("id, first_name, last_name")
      .in("id", batch);
    for (const customer of data ?? []) {
      customers.set(
        customer.id,
        [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer",
      );
    }
  }

  const byCustomer = new Map<string, ReceivableRow>();
  for (const order of orders) {
    const paid = paidByOrder.get(order.id) ?? 0;
    const outstanding = Number(order.total_amount || 0) - paid;
    if (outstanding <= 0) continue;
    const name =
      (order.customer_id ? customers.get(order.customer_id) : null) ??
      order.guest_name ??
      "Guest";
    const row = byCustomer.get(name) ?? {
      customer_name: name,
      order_count: 0,
      outstanding: 0,
      latest_order_date: null,
    };
    row.order_count += 1;
    row.outstanding += outstanding;
    if (!row.latest_order_date || order.created_at > row.latest_order_date) {
      row.latest_order_date = order.created_at;
    }
    byCustomer.set(name, row);
  }

  let rows = [...byCustomer.values()].sort((a, b) => b.outstanding - a.outstanding);
  if (params.q) {
    const term = params.q.trim().toLowerCase();
    rows = rows.filter((row) => row.customer_name.toLowerCase().includes(term));
  }

  const total = rows.reduce((sum, row) => sum + row.outstanding, 0);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 25;
  const start = (page - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize).map((row) => ({
    ...row,
    outstanding: Number(row.outstanding.toFixed(2)),
  }));

  return { rows: paged, total: rows.length, totalOutstanding: Number(total.toFixed(2)) };
}

export type PayableRow = {
  supplier_name: string;
  invoice_count: number;
  outstanding: number;
  oldest_due_date: string | null;
};

export type PayableResult = ListResult<PayableRow> & { totalOutstanding: number };

export async function listPayables(
  client: DashboardClient,
  params: ListQuery & { q?: string },
): Promise<PayableResult> {
  const invoices = await fetchAllPaged<{
    id: string;
    supplier_id: string | null;
    amount: number;
    due_date: string | null;
  }>((from, to) =>
    client
      .from("supplier_invoices")
      .select("id, supplier_id, amount, due_date, status")
      .in("status", ["pending", "partially_paid"])
      .range(from, to),
  );

  if (invoices.length === 0) return { rows: [], total: 0, totalOutstanding: 0 };

  const payments = await fetchAllPaged<{ invoice_id: string; amount: number }>((from, to) =>
    client.from("purchase_payments").select("invoice_id, amount").range(from, to),
  );

  const paidByInvoice = new Map<string, number>();
  for (const payment of payments) {
    paidByInvoice.set(
      payment.invoice_id,
      (paidByInvoice.get(payment.invoice_id) ?? 0) + Number(payment.amount || 0),
    );
  }

  const supplierIds = invoices
    .map((invoice) => invoice.supplier_id)
    .filter((id): id is string => Boolean(id));
  const suppliers = new Map<string, string>();
  for (let i = 0; i < supplierIds.length; i += 900) {
    const batch = supplierIds.slice(i, i + 900);
    const { data } = await client.from("suppliers").select("id, name").in("id", batch);
    for (const supplier of data ?? []) {
      suppliers.set(supplier.id, supplier.name);
    }
  }

  const bySupplier = new Map<string, PayableRow>();
  for (const invoice of invoices) {
    const paid = paidByInvoice.get(invoice.id) ?? 0;
    const outstanding = Number(invoice.amount || 0) - paid;
    if (outstanding <= 0) continue;
    const name = invoice.supplier_id ? suppliers.get(invoice.supplier_id) ?? "Supplier" : "Supplier";
    const row = bySupplier.get(name) ?? {
      supplier_name: name,
      invoice_count: 0,
      outstanding: 0,
      oldest_due_date: null,
    };
    row.invoice_count += 1;
    row.outstanding += outstanding;
    if (!row.oldest_due_date || (invoice.due_date && invoice.due_date < row.oldest_due_date)) {
      row.oldest_due_date = invoice.due_date;
    }
    bySupplier.set(name, row);
  }

  let rows = [...bySupplier.values()].sort((a, b) => b.outstanding - a.outstanding);
  if (params.q) {
    const term = params.q.trim().toLowerCase();
    rows = rows.filter((row) => row.supplier_name.toLowerCase().includes(term));
  }

  const total = rows.reduce((sum, row) => sum + row.outstanding, 0);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 25;
  const start = (page - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize).map((row) => ({
    ...row,
    outstanding: Number(row.outstanding.toFixed(2)),
  }));

  return { rows: paged, total: rows.length, totalOutstanding: Number(total.toFixed(2)) };
}