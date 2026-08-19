import type { DashboardClient } from "@/lib/admin/dashboard";
import { fetchAllPaged } from "@/lib/admin/dashboard";
import type { ListQuery, ListResult } from "@/lib/admin/query";
import { listQuery } from "@/lib/admin/query";

export { PAGE_SIZE } from "@/lib/admin/query";

export type SupplierListRow = {
  id: string;
  supplier_code: string | null;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: string;
  payment_terms_days: number | null;
  created_at: string;
};

export function listSuppliers(
  client: DashboardClient,
  params: ListQuery & { status?: string },
): Promise<ListResult<SupplierListRow>> {
  return listQuery(
    client,
    "suppliers",
    params,
    (q) => {
      let query = q.order("name", { ascending: true });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.or(
            `name.ilike.%${term}%,supplier_code.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
          );
        }
      }
      if (params.status) query = query.eq("status", params.status);
      return query;
    },
    "id, supplier_code, name, contact_person, phone, email, website, status, payment_terms_days, created_at",
  );
}

export type PurchaseOrderListRow = {
  id: string;
  po_number: string;
  status: string | null;
  expected_date: string | null;
  notes: string | null;
  created_at: string;
  suppliers: { name: string } | null;
};

export function listPurchaseOrders(
  client: DashboardClient,
  params: ListQuery & { status?: string },
): Promise<ListResult<PurchaseOrderListRow>> {
  return listQuery(
    client,
    "purchase_orders",
    params,
    (q) => {
      let query = q.order("created_at", { ascending: false });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.ilike("po_number", `%${term}%`);
        }
      }
      if (params.status) query = query.eq("status", params.status);
      return query;
    },
    "id, po_number, status, expected_date, notes, created_at, suppliers(name)",
  );
}

export type GoodsReceiptListRow = {
  id: string;
  receipt_number: string;
  status: string | null;
  received_date: string | null;
  notes: string | null;
  created_at: string;
  purchase_orders: { po_number: string } | null;
  locations: { name: string } | null;
};

export function listGoodsReceipts(
  client: DashboardClient,
  params: ListQuery & { status?: string },
): Promise<ListResult<GoodsReceiptListRow>> {
  return listQuery(
    client,
    "goods_receipts",
    params,
    (q) => {
      let query = q.order("created_at", { ascending: false });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.ilike("receipt_number", `%${term}%`);
        }
      }
      if (params.status) query = query.eq("status", params.status);
      return query;
    },
    "id, receipt_number, status, received_date, notes, created_at, purchase_orders(po_number), locations(name)",
  );
}

export type SupplierInvoiceListRow = {
  id: string;
  invoice_number: string;
  status: string | null;
  invoice_date: string | null;
  due_date: string | null;
  amount: number | null;
  notes: string | null;
  created_at: string;
  suppliers: { name: string } | null;
  purchase_orders: { po_number: string } | null;
};

export function listSupplierInvoices(
  client: DashboardClient,
  params: ListQuery & { status?: string },
): Promise<ListResult<SupplierInvoiceListRow>> {
  return listQuery(
    client,
    "supplier_invoices",
    params,
    (q) => {
      let query = q.order("invoice_date", { ascending: false, nullsFirst: false });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.or(
            `invoice_number.ilike.%${term}%,suppliers.name.ilike.%${term}%`,
          );
        }
      }
      if (params.status) query = query.eq("status", params.status);
      return query;
    },
    "id, invoice_number, status, invoice_date, due_date, amount, notes, created_at, suppliers(name), purchase_orders(po_number)",
  );
}

export type PurchasePaymentListRow = {
  id: string;
  amount: number | null;
  method: string | null;
  payment_date: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
  suppliers: { name: string } | null;
  supplier_invoices: { invoice_number: string } | null;
};

export function listPurchasePayments(
  client: DashboardClient,
  params: ListQuery & { method?: string },
): Promise<ListResult<PurchasePaymentListRow>> {
  return listQuery(
    client,
    "purchase_payments",
    params,
    (q) => {
      let query = q.order("payment_date", { ascending: false, nullsFirst: false });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.or(
            `reference.ilike.%${term}%,suppliers.name.ilike.%${term}%`,
          );
        }
      }
      if (params.method) query = query.eq("method", params.method);
      return query;
    },
    "id, amount, method, payment_date, reference, notes, created_at, suppliers(name), supplier_invoices(invoice_number)",
  );
}
// ---------------------------------------------------------------------------
// Report aggregations
// ---------------------------------------------------------------------------

export type PoStatusCount = {
  status: string | null;
  count: number;
};

export async function getPurchaseOrderStatusCounts(
  client: DashboardClient,
): Promise<PoStatusCount[]> {
  const rows = await fetchAllPaged<{ status: string | null }>((from, to) =>
    client.from("purchase_orders").select("status").range(from, to),
  );
  const byStatus = new Map<string | null, number>();
  for (const row of rows) {
    byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
  }
  return [...byStatus.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

export type SupplierSpendRow = {
  supplier_id: string | null;
  supplier_name: string;
  total: number;
  payment_count: number;
};

export async function getSupplierSpend(
  client: DashboardClient,
  limit = 10,
): Promise<SupplierSpendRow[]> {
  const rows = await fetchAllPaged<{ supplier_id: string | null; amount: number }>((from, to) =>
    client.from("purchase_payments").select("supplier_id, amount").range(from, to),
  );

  const bySupplier = new Map<string | null, SupplierSpendRow>();
  for (const row of rows) {
    const key = row.supplier_id;
    const entry = bySupplier.get(key) ?? {
      supplier_id: key,
      supplier_name: "",
      total: 0,
      payment_count: 0,
    };
    entry.total += Number(row.amount || 0);
    entry.payment_count += 1;
    bySupplier.set(key, entry);
  }

  const supplierIds = [...bySupplier.keys()].filter((id): id is string => Boolean(id));
  const nameById = new Map<string, string>();
  for (let i = 0; i < supplierIds.length; i += 900) {
    const batch = supplierIds.slice(i, i + 900);
    const { data } = await client.from("suppliers").select("id, name").in("id", batch);
    for (const supplier of data ?? []) {
      nameById.set(supplier.id, supplier.name);
    }
  }

  return [...bySupplier.values()]
    .map((row) => ({
      ...row,
      supplier_name: row.supplier_id ? nameById.get(row.supplier_id) ?? "Unknown supplier" : "Unassigned",
      total: Number(row.total.toFixed(2)),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export async function getPurchaseTotals(
  client: DashboardClient,
): Promise<{ po_count: number; invoice_total: number; payment_total: number; receipt_count: number }> {
  const [poCount, invoiceRows, paymentRows, receiptCount] = await Promise.all([
    client.from("purchase_orders").select("id", { count: "exact", head: true }),
    fetchAllPaged<{ amount: number }>((from, to) =>
      client.from("supplier_invoices").select("amount").range(from, to),
    ),
    fetchAllPaged<{ amount: number }>((from, to) =>
      client.from("purchase_payments").select("amount").range(from, to),
    ),
    client.from("goods_receipts").select("id", { count: "exact", head: true }),
  ]);

  return {
    po_count: poCount.count ?? 0,
    invoice_total: Number(
      invoiceRows.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2),
    ),
    payment_total: Number(
      paymentRows.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2),
    ),
    receipt_count: receiptCount.count ?? 0,
  };
}
