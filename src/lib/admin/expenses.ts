import { createClient } from "@/lib/supabase/server";

export type ExpenseCategoryRow = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  expenseCount: number;
};

export async function getExpenseCategories(): Promise<ExpenseCategoryRow[]> {
  const client = await createClient();
  const { data } = await client
    .from("expense_categories")
    .select("id, name, description, is_active, expenses(id)")
    .order("name");

  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    expenses: { id: string }[];
  }[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    expenseCount: (row.expenses ?? []).length,
  }));
}

export type ExpenseRow = {
  id: string;
  expenseNumber: string;
  categoryName: string;
  description: string;
  amount: number;
  expenseDate: string;
  method: string;
  referenceNumber: string | null;
  supplierName: string | null;
  locationName: string | null;
};

export async function getExpenses({
  q,
  categoryId,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ expenses: ExpenseRow[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("expenses")
    .select(
      "id, expense_number, description, amount, expense_date, method, reference_number, expense_categories(name), suppliers(name), locations(name)",
      { count: "exact" },
    );

  if (categoryId) query = query.eq("category_id", categoryId);
  if (q) query = query.ilike("description", `%${q}%`);

  const { data, count } = await query
    .order("expense_date", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    expense_number: string;
    description: string;
    amount: number;
    expense_date: string;
    method: string;
    reference_number: string | null;
    expense_categories: { name: string } | null;
    suppliers: { name: string } | null;
    locations: { name: string } | null;
  }[];

  return {
    expenses: rows.map((row) => ({
      id: row.id,
      expenseNumber: row.expense_number,
      categoryName: row.expense_categories?.name ?? "—",
      description: row.description,
      amount: Number(row.amount),
      expenseDate: row.expense_date,
      method: row.method,
      referenceNumber: row.reference_number,
      supplierName: row.suppliers?.name ?? null,
      locationName: row.locations?.name ?? null,
    })),
    total: count ?? 0,
  };
}

export type ExpenseDetail = {
  id: string;
  expenseNumber: string;
  categoryId: string;
  categoryName: string;
  description: string;
  amount: number;
  expenseDate: string;
  method: string;
  referenceNumber: string | null;
  supplier: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
  notes: string | null;
  createdAt: string;
};

export async function getExpenseById(id: string): Promise<ExpenseDetail | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("expenses")
    .select(
      "id, expense_number, category_id, description, amount, expense_date, method, reference_number, notes, created_at, expense_categories(name), suppliers(id, name), locations(id, name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    expense_number: string;
    category_id: string;
    description: string;
    amount: number;
    expense_date: string;
    method: string;
    reference_number: string | null;
    notes: string | null;
    created_at: string;
    expense_categories: { name: string } | null;
    suppliers: { id: string; name: string } | null;
    locations: { id: string; name: string } | null;
  };

  return {
    id: row.id,
    expenseNumber: row.expense_number,
    categoryId: row.category_id,
    categoryName: row.expense_categories?.name ?? "—",
    description: row.description,
    amount: Number(row.amount),
    expenseDate: row.expense_date,
    method: row.method,
    referenceNumber: row.reference_number,
    supplier: row.suppliers ? { id: row.suppliers.id, name: row.suppliers.name } : null,
    location: row.locations ? { id: row.locations.id, name: row.locations.name } : null,
    notes: row.notes,
    createdAt: row.created_at,
  };
}