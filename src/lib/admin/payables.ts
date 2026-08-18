import { createClient } from "@/lib/supabase/server";
import {
  agingBucketFor,
  ageInDays,
  fetchAllPaged,
  reportRpc,
  take,
  type AgingBucket,
} from "@/lib/admin/reporting";

/**
 * Payables data layer.
 *
 * Mirrors app.dashboard_payables() exactly: an invoice is payable when its
 * status is pending or partially paid; the paid amount is the sum of its
 * purchase payments; outstanding = amount - paid. Aging is measured from the
 * invoice due date, falling back to the invoice date when no due date is set.
 */

export type PayableInvoiceRow = {
  invoiceId: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  invoiceDate: string;
  dueDate: string | null;
  amount: number;
  paidAmount: number;
  outstanding: number;
  overdueDays: number;
  agingBucket: AgingBucket;
};

const OUTSTANDING_STATUSES = ["pending", "partially_paid"] as const;

function referenceDate(row: { invoice_date: string; due_date: string | null }): string {
  return row.due_date ?? row.invoice_date;
}

export async function getPayablesPage({
  q,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: PayableInvoiceRow[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("supplier_invoices")
    .select("id, invoice_number, invoice_date, due_date, amount, status, suppliers(id, name)", {
      count: "exact",
    })
    .in("status", OUTSTANDING_STATUSES);

  if (q && q.trim() !== "") {
    query = query.ilike("invoice_number", `%${q.trim()}%`);
  }

  const { data, count } = await query
    .order("invoice_date", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string | null;
    amount: number;
    suppliers: { id: string; name: string } | null;
  }[];

  const paidByInvoice = new Map<string, number>();
  const invoiceIds = rows.map((row) => row.id);
  if (invoiceIds.length > 0) {
    const { data: payments } = await client
      .from("purchase_payments")
      .select("invoice_id, amount")
      .in("invoice_id", invoiceIds);
    for (const payment of payments ?? []) {
      if (!payment.invoice_id) continue;
      paidByInvoice.set(
        payment.invoice_id,
        (paidByInvoice.get(payment.invoice_id) ?? 0) + Number(payment.amount),
      );
    }
  }

  const now = new Date();
  const mapped: PayableInvoiceRow[] = rows.map((row) => {
    const amount = Number(row.amount);
    const paid = paidByInvoice.get(row.id) ?? 0;
    const overdueDays = ageInDays(referenceDate(row), now);
    return {
      invoiceId: row.id,
      invoiceNumber: row.invoice_number,
      supplierId: row.suppliers?.id ?? "",
      supplierName: row.suppliers?.name ?? "—",
      invoiceDate: row.invoice_date,
      dueDate: row.due_date,
      amount,
      paidAmount: paid,
      outstanding: Math.max(0, amount - paid),
      overdueDays,
      agingBucket: agingBucketFor(overdueDays),
    };
  });

  return { rows: mapped, total: count ?? 0 };
}

export type PayablesSummary = {
  totalOutstanding: number;
  openInvoiceCount: number;
  supplierCount: number;
  largestBalance: number;
  overdueOutstanding: number;
  aging: { bucket: AgingBucket; count: number; outstanding: number }[];
};

export async function getPayablesSummary(): Promise<PayablesSummary | null> {
  const client = await createClient();
  const [rpcResult, countResult] = await Promise.all([
    reportRpc<{ supplier_name: string; invoice_count: number; outstanding: number }[]>(
      "dashboard_payables",
      {},
    ),
    client
      .from("supplier_invoices")
      .select("id", { count: "exact", head: true })
      .in("status", OUTSTANDING_STATUSES),
  ]);

  const suppliers = take(rpcResult);
  if (!suppliers) return null;

  const now = new Date();
  const [invoices, payments] = await Promise.all([
    fetchAllPaged<{ id: string; invoice_date: string; due_date: string | null; amount: number }>(
      (from, to) =>
        client
          .from("supplier_invoices")
          .select("id, invoice_date, due_date, amount")
          .in("status", OUTSTANDING_STATUSES)
          .range(from, to),
    ),
    fetchAllPaged<{
      invoice_id: string | null;
      amount: number;
      supplier_invoices: { id: string; invoice_date: string; due_date: string | null }[] | null;
    }>((from, to) =>
      client
        .from("purchase_payments")
        .select("invoice_id, amount, supplier_invoices!inner(id, invoice_date, due_date)")
        .in("supplier_invoices.status", OUTSTANDING_STATUSES)
        .range(from, to),
    ),
  ]);

  const byInvoice = new Map<
    string,
    { reference: string; amount: number; paid: number }
  >();
  for (const invoice of invoices) {
    byInvoice.set(invoice.id, {
      reference: invoice.due_date ?? invoice.invoice_date,
      amount: Number(invoice.amount),
      paid: 0,
    });
  }
  for (const payment of payments) {
    if (!payment.invoice_id) continue;
    const current = byInvoice.get(payment.invoice_id);
    if (!current) continue;
    current.paid += Number(payment.amount);
  }

  const aging = new Map<AgingBucket, { count: number; outstanding: number }>();
  for (const invoice of byInvoice.values()) {
    const bucket = agingBucketFor(ageInDays(invoice.reference, now));
    const current = aging.get(bucket) ?? { count: 0, outstanding: 0 };
    current.count += 1;
    current.outstanding += Math.max(0, invoice.amount - invoice.paid);
    aging.set(bucket, current);
  }

  const buckets = (["current", "days_31_60", "days_61_90", "over_90"] as AgingBucket[]).map(
    (bucket) => ({
      bucket,
      count: aging.get(bucket)?.count ?? 0,
      outstanding: aging.get(bucket)?.outstanding ?? 0,
    }),
  );

  return {
    totalOutstanding: suppliers.reduce((sum, row) => sum + Number(row.outstanding), 0),
    openInvoiceCount: countResult.count ?? 0,
    supplierCount: suppliers.length,
    largestBalance: suppliers.reduce((max, row) => Math.max(max, Number(row.outstanding)), 0),
    overdueOutstanding: buckets
      .filter((bucket) => bucket.bucket !== "current")
      .reduce((sum, bucket) => sum + bucket.outstanding, 0),
    aging: buckets,
  };
}

export type SupplierPayables = {
  supplier: {
    id: string;
    supplierCode: string;
    name: string;
    contactPerson: string | null;
    phone: string;
    email: string | null;
    paymentTermsDays: number | null;
    status: string;
  } | null;
  rows: PayableInvoiceRow[];
};

export async function getSupplierPayables(supplierId: string): Promise<SupplierPayables | null> {
  const client = await createClient();
  const [supplierResult, invoicesResult] = await Promise.all([
    client
      .from("suppliers")
      .select(
        "id, supplier_code, name, contact_person, phone, email, payment_terms_days, status",
      )
      .eq("id", supplierId)
      .maybeSingle(),
    client
      .from("supplier_invoices")
      .select("id, invoice_number, invoice_date, due_date, amount, status")
      .eq("supplier_id", supplierId)
      .in("status", OUTSTANDING_STATUSES)
      .order("invoice_date", { ascending: false }),
  ]);

  if (supplierResult.error) return null;

  const rawSupplier = (supplierResult.data ?? null) as {
    id: string;
    supplier_code: string;
    name: string;
    contact_person: string | null;
    phone: string;
    email: string | null;
    payment_terms_days: number | null;
    status: string;
  } | null;

  const supplier = rawSupplier
    ? {
        id: rawSupplier.id,
        supplierCode: rawSupplier.supplier_code,
        name: rawSupplier.name,
        contactPerson: rawSupplier.contact_person,
        phone: rawSupplier.phone,
        email: rawSupplier.email,
        paymentTermsDays:
          rawSupplier.payment_terms_days === null
            ? null
            : Number(rawSupplier.payment_terms_days),
        status: rawSupplier.status,
      }
    : null;

  const invoices = (invoicesResult.data ?? []) as unknown as {
    id: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string | null;
    amount: number;
  }[];

  const paidByInvoice = new Map<string, number>();
  if (invoices.length > 0) {
    const { data: payments } = await client
      .from("purchase_payments")
      .select("invoice_id, amount")
      .in("invoice_id", invoices.map((invoice) => invoice.id));
    for (const payment of payments ?? []) {
      if (!payment.invoice_id) continue;
      paidByInvoice.set(
        payment.invoice_id,
        (paidByInvoice.get(payment.invoice_id) ?? 0) + Number(payment.amount),
      );
    }
  }

  const now = new Date();
  const rows: PayableInvoiceRow[] = invoices.map((invoice) => {
    const amount = Number(invoice.amount);
    const paid = paidByInvoice.get(invoice.id) ?? 0;
    const overdueDays = ageInDays(referenceDate(invoice), now);
    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      supplierId,
      supplierName: supplier?.name ?? "—",
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      amount,
      paidAmount: paid,
      outstanding: Math.max(0, amount - paid),
      overdueDays,
      agingBucket: agingBucketFor(overdueDays),
    };
  });

  return { supplier, rows };
}