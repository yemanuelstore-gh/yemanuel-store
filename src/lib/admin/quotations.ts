import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";

/**
 * Quotation read layer. Quotations are sales proposals: every read and
 * mutation leaves inventory, stock movements, payments and balances
 * untouched until an order is created through the conversion workflow.
 *
 * Reads go through the authenticated client so RLS applies; creator names
 * are resolved via the service-role client (profiles are only readable by
 * their owner, mirroring lib/admin/session.ts).
 */

export const QUOTATION_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
] as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

/** Allowed forward transitions. Anything else is an invalid transition. */
export const QUOTATION_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  draft: ["sent", "rejected"],
  sent: ["accepted", "rejected"],
  accepted: [],
  rejected: [],
  expired: [],
};

export function isTerminalStatus(status: QuotationStatus): boolean {
  return status === "accepted" || status === "rejected" || status === "expired";
}

export function quotationStatusLabel(status: string): string {
  return status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export type QuotationListRow = {
  id: string;
  quotationNumber: string;
  customerName: string | null;
  customerId: string | null;
  quotationDate: string;
  validUntil: string;
  totalAmount: number;
  status: QuotationStatus;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
};

type QuotationRow = {
  id: string;
  quotation_number: string;
  customer_id: string | null;
  guest_name: string | null;
  status: QuotationStatus;
  quotation_date: string;
  valid_until: string;
  subtotal: number;
  discount_total: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  customers: { first_name: string; last_name: string } | null;
};

/**
 * Auto-expire draft/sent quotations whose validity has passed. Runs
 * opportunistically on list/detail reads so filters and badges always agree
 * with the effective state. Accepted/rejected quotations are never touched.
 */
async function expireOverdueQuotations(): Promise<void> {
  const client = await createClient();
  await client
    .from("quotations")
    .update({ status: "expired", status_changed_at: new Date().toISOString() })
    .in("status", ["draft", "sent"])
    .lt("valid_until", new Date().toISOString().slice(0, 10));
}

export async function getQuotations({
  q,
  status,
  from,
  to,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ quotations: QuotationListRow[]; total: number }> {
  const client = await createClient();
  await expireOverdueQuotations();

  const SELECT =
    "id, quotation_number, customer_id, guest_name, status, quotation_date, valid_until, subtotal, discount_total, total_amount, created_at, updated_at, created_by, customers(first_name, last_name)";

  const rows: QuotationRow[] = [];
  const term = q?.trim() ?? "";

  if (term === "") {
    let query = client.from("quotations").select(SELECT, { count: "exact" });
    if (status && QUOTATION_STATUSES.includes(status as QuotationStatus)) {
      query = query.eq("status", status);
    }
    if (from) query = query.gte("quotation_date", from);
    if (to) query = query.lte("quotation_date", to);
    const { data, count } = await query
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    rows.push(...((data ?? []) as unknown as QuotationRow[]));
    return {
      quotations: await attachCreatorNames(rows),
      total: count ?? rows.length,
    };
  }

  const seen = new Set<string>();
  const merge = (candidates: QuotationRow[]) => {
    for (const row of candidates) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
  };

  let directQuery = client
    .from("quotations")
    .select(SELECT)
    .or(
      `quotation_number.ilike.%${term}%,guest_name.ilike.%${term}%,guest_phone.ilike.%${term}%`,
    );
  if (status && QUOTATION_STATUSES.includes(status as QuotationStatus)) {
    directQuery = directQuery.eq("status", status);
  }
  if (from) directQuery = directQuery.gte("quotation_date", from);
  if (to) directQuery = directQuery.lte("quotation_date", to);
  const direct = await directQuery.order("created_at", { ascending: false }).range(0, 399);
  merge((direct.data ?? []) as unknown as QuotationRow[]);

  // Customer-name matches resolve through a separate customers query
  // (PostgREST here does not support embedded-resource or() filters).
  const like = `%${term}%`;
  const customersResult = await client
    .from("customers")
    .select("id")
    .ilike("first_name", like)
    .or(`last_name.ilike.${like},business_name.ilike.${like},phone.ilike.${like}`)
    .limit(50);
  const customerIds = ((customersResult.data ?? []) as { id: string }[]).map(
    (row) => row.id,
  );
  if (customerIds.length > 0) {
    let byCustomerQuery = client
      .from("quotations")
      .select(SELECT)
      .in("customer_id", customerIds);
    if (status && QUOTATION_STATUSES.includes(status as QuotationStatus)) {
      byCustomerQuery = byCustomerQuery.eq("status", status);
    }
    if (from) byCustomerQuery = byCustomerQuery.gte("quotation_date", from);
    if (to) byCustomerQuery = byCustomerQuery.lte("quotation_date", to);
    const byCustomer = await byCustomerQuery
      .order("created_at", { ascending: false })
      .range(0, 399);
    merge((byCustomer.data ?? []) as unknown as QuotationRow[]);
  }

  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const pageRows = rows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  return {
    quotations: await attachCreatorNames(pageRows),
    total: rows.length,
  };
}

async function attachCreatorNames(rows: QuotationRow[]): Promise<QuotationListRow[]> {
  const createdByIds = [
    ...new Set(rows.map((row) => row.created_by).filter((id): id is string => id !== null)),
  ];
  const names = await resolveUserNames(createdByIds);

  return rows.map((row) => ({
    id: row.id,
    quotationNumber: row.quotation_number,
    customerName: row.customers
      ? `${row.customers.first_name} ${row.customers.last_name}`.trim()
      : row.guest_name,
    customerId: row.customer_id,
    quotationDate: row.quotation_date,
    validUntil: row.valid_until,
    totalAmount: Number(row.total_amount),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByName: row.created_by ? (names.get(row.created_by) ?? null) : null,
  }));
}

async function resolveUserNames(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  if (!isServiceConfigured()) return new Map();
  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);
  return new Map(
    ((data ?? []) as { id: string; full_name: string | null }[]).map((row) => [
      row.id,
      row.full_name ?? "",
    ]),
  );
}

export type QuotationItemRow = {
  id: string;
  variantId: string | null;
  quantity: number;
  productName: string;
  variantName: string;
  sku: string;
  options: Record<string, string> | null;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  taxableAmount: number;
  taxRate: number | null;
  taxAmount: number;
};

export type QuotationDetail = {
  id: string;
  quotationNumber: string;
  status: QuotationStatus;
  quotationDate: string;
  validUntil: string;
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  taxAmount: number;
  taxRate: number | null;
  totalAmount: number;
  customerNotes: string | null;
  internalNotes: string | null;
  terms: string | null;
  paymentTerms: string | null;
  deliveryNotes: string | null;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string | null;
  createdByName: string | null;
  updatedByName: string | null;
  customer: {
    id: string;
    name: string;
    businessName: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
  items: QuotationItemRow[];
  convertedOrderNumber: string | null;
};

type QuotationItemDbRow = {
  id: string;
  variant_id: string | null;
  quantity: number;
  product_name: string;
  variant_name: string;
  sku: string;
  options: Record<string, string> | null;
  unit_price: number;
  discount_amount: number;
  line_total: number;
  taxable_amount: number;
  tax_rate: number | null;
  tax_amount: number;
};

function toQuotationItem(row: QuotationItemDbRow): QuotationItemRow {
  return {
    id: row.id,
    variantId: row.variant_id,
    quantity: Number(row.quantity),
    productName: row.product_name,
    variantName: row.variant_name,
    sku: row.sku,
    options: row.options,
    unitPrice: Number(row.unit_price),
    discountAmount: Number(row.discount_amount),
    lineTotal: Number(row.line_total),
    taxableAmount: Number(row.taxable_amount),
    taxRate: row.tax_rate === null ? null : Number(row.tax_rate),
    taxAmount: Number(row.tax_amount),
  };
}

export async function getQuotation(id: string): Promise<QuotationDetail | null> {
  const client = await createClient();
  await expireOverdueQuotations();

  const { data } = await client
    .from("quotations")
    .select(
      "id, quotation_number, customer_id, guest_name, guest_phone, status, quotation_date, valid_until, subtotal, discount_total, taxable_amount, tax_amount, tax_rate, total_amount, customer_notes, internal_notes, terms, payment_terms, delivery_notes, created_at, updated_at, status_changed_at, created_by, updated_by, converted_order_id, customers(id, first_name, last_name, business_name, phone, email)",
    )
    .eq("id", id)
    .maybeSingle();

  const row = data as unknown as {
    id: string;
    quotation_number: string;
    customer_id: string | null;
    guest_name: string | null;
    guest_phone: string | null;
    status: QuotationStatus;
    quotation_date: string;
    valid_until: string;
    subtotal: number;
    discount_total: number;
    taxable_amount: number;
    tax_amount: number;
    tax_rate: number | null;
    total_amount: number;
    customer_notes: string | null;
    internal_notes: string | null;
    terms: string | null;
    payment_terms: string | null;
    delivery_notes: string | null;
    created_at: string;
    updated_at: string;
    status_changed_at: string | null;
    created_by: string | null;
    updated_by: string | null;
    converted_order_id: string | null;
    customers: {
      id: string;
      first_name: string;
      last_name: string;
      business_name: string | null;
      phone: string;
      email: string | null;
    } | null;
  } | null;

  if (!data || !row) return null;

  const [itemsResult, names] = await Promise.all([
    client
      .from("quotation_items")
      .select(
        "id, variant_id, quantity, product_name, variant_name, sku, options, unit_price, discount_amount, line_total, taxable_amount, tax_rate, tax_amount",
      )
      .eq("quotation_id", id)
      .order("sort_order", { ascending: true }),
    resolveUserNames(
      [row.created_by, row.updated_by].filter((value): value is string => value !== null),
    ),
  ]);

  let address: string | null = null;
  if (row.customers) {
    const addressResult = await client
      .from("customer_addresses")
      .select("address_line_1, address_line_2, city:city_id(name), region:region_id(name)")
      .eq("customer_id", row.customers.id)
      .eq("is_default_billing", true)
      .maybeSingle();
    const addressRow = addressResult.data as unknown as {
      address_line_1: string;
      address_line_2: string | null;
      city: { name: string } | null;
      region: { name: string } | null;
    } | null;
    if (addressRow) {
      address = [
        addressRow.address_line_1,
        addressRow.address_line_2,
        addressRow.city?.name,
        addressRow.region?.name,
      ]
        .filter((part): part is string => Boolean(part))
        .join(", ");
    }
  }

  let convertedOrderNumber: string | null = null;
  if (row.converted_order_id) {
    const orderResult = await client
      .from("orders")
      .select("order_number")
      .eq("id", row.converted_order_id)
      .maybeSingle();
    convertedOrderNumber =
      (orderResult.data as { order_number: string } | null)?.order_number ?? null;
  }

  const customerName = row.customers
    ? `${row.customers.first_name} ${row.customers.last_name}`.trim()
    : row.guest_name;

  return {
    id: row.id,
    quotationNumber: row.quotation_number,
    status: row.status,
    quotationDate: row.quotation_date,
    validUntil: row.valid_until,
    subtotal: Number(row.subtotal),
    discountTotal: Number(row.discount_total),
    taxableAmount: Number(row.taxable_amount),
    taxAmount: Number(row.tax_amount),
    taxRate: row.tax_rate === null ? null : Number(row.tax_rate),
    totalAmount: Number(row.total_amount),
    customerNotes: row.customer_notes,
    internalNotes: row.internal_notes,
    terms: row.terms,
    paymentTerms: row.payment_terms,
    deliveryNotes: row.delivery_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    statusChangedAt: row.status_changed_at,
    createdByName: row.created_by ? (names.get(row.created_by) ?? null) : null,
    updatedByName: row.updated_by ? (names.get(row.updated_by) ?? null) : null,
    customer: row.customers
      ? {
          id: row.customers.id,
          name: customerName ?? row.guest_name ?? "",
          businessName: row.customers.business_name,
          phone: row.customers.phone,
          email: row.customers.email,
          address,
        }
      : row.guest_name
        ? {
            id: "",
            name: row.guest_name,
            businessName: null,
            phone: row.guest_phone,
            email: null,
            address: null,
          }
        : null,
    items: ((itemsResult.data ?? []) as unknown as QuotationItemDbRow[]).map(toQuotationItem),
    convertedOrderNumber,
  };
}