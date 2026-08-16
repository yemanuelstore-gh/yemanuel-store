import { createClient } from "@/lib/supabase/server";

export type PurchaseOrderRow = {
  id: string;
  poNumber: string;
  supplierName: string;
  status: string;
  expectedDate: string | null;
  createdAt: string;
  itemCount: number;
  totalUnits: number;
};

export async function getPurchaseOrders({
  page = 1,
  pageSize = 25,
}: {
  page?: number;
  pageSize?: number;
}): Promise<{ orders: PurchaseOrderRow[]; total: number }> {
  const client = await createClient();
  const { data, count } = await client
    .from("purchase_orders")
    .select(
      "id, po_number, status, expected_date, created_at, suppliers(name), purchase_order_items(quantity_ordered)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    po_number: string;
    status: string;
    expected_date: string | null;
    created_at: string;
    suppliers: { name: string } | null;
    purchase_order_items: { quantity_ordered: number }[];
  }[];

  return {
    orders: rows.map((row) => ({
      id: row.id,
      poNumber: row.po_number,
      supplierName: row.suppliers?.name ?? "—",
      status: row.status,
      expectedDate: row.expected_date,
      createdAt: row.created_at,
      itemCount: (row.purchase_order_items ?? []).length,
      totalUnits: (row.purchase_order_items ?? []).reduce(
        (sum, item) => sum + Number(item.quantity_ordered),
        0,
      ),
    })),
    total: count ?? 0,
  };
}

export type PurchaseOrderDetail = {
  id: string;
  poNumber: string;
  status: string;
  expectedDate: string | null;
  notes: string | null;
  createdAt: string;
  supplier: { id: string; name: string; supplierCode: string } | null;
  location: { id: string; name: string } | null;
  items: {
    id: string;
    variantId: string;
    variantName: string;
    sku: string;
    quantityOrdered: number;
    unitCostExpected: number;
    quantityReceived: number;
    lineExpected: number;
  }[];
  receipts: { id: string; receiptNumber: string; status: string; receivedDate: string }[];
  invoices: { id: string; invoiceNumber: string; amount: number; status: string }[];
  payments: { id: string; amount: number; paymentDate: string; method: string; reference: string | null }[];
};

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrderDetail | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("purchase_orders")
    .select(
      "id, po_number, status, expected_date, notes, created_at, suppliers(id, name, supplier_code), locations(id, name), purchase_order_items(id, variant_id, quantity_ordered, unit_cost_expected, quantity_received, product_variants(name, sku)), goods_receipts(id, receipt_number, status, received_date), supplier_invoices(id, invoice_number, amount, status), purchase_payments(id, amount, payment_date, method, reference)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    po_number: string;
    status: string;
    expected_date: string | null;
    notes: string | null;
    created_at: string;
    suppliers: { id: string; name: string; supplier_code: string } | null;
    locations: { id: string; name: string } | null;
    purchase_order_items: {
      id: string;
      variant_id: string;
      quantity_ordered: number;
      unit_cost_expected: number;
      quantity_received: number;
      product_variants: { name: string; sku: string } | null;
    }[];
    goods_receipts: { id: string; receipt_number: string; status: string; received_date: string }[];
    supplier_invoices: { id: string; invoice_number: string; amount: number; status: string }[];
    purchase_payments: {
      id: string;
      amount: number;
      payment_date: string;
      method: string;
      reference: string | null;
    }[];
  };

  return {
    id: row.id,
    poNumber: row.po_number,
    status: row.status,
    expectedDate: row.expected_date,
    notes: row.notes,
    createdAt: row.created_at,
    supplier: row.suppliers
      ? {
          id: row.suppliers.id,
          name: row.suppliers.name,
          supplierCode: row.suppliers.supplier_code,
        }
      : null,
    location: row.locations
      ? { id: row.locations.id, name: row.locations.name }
      : null,
    items: (row.purchase_order_items ?? []).map((item) => ({
      id: item.id,
      variantId: item.variant_id,
      variantName: item.product_variants?.name ?? "—",
      sku: item.product_variants?.sku ?? "—",
      quantityOrdered: Number(item.quantity_ordered),
      unitCostExpected: Number(item.unit_cost_expected),
      quantityReceived: Number(item.quantity_received),
      lineExpected: Number(item.quantity_ordered) * Number(item.unit_cost_expected),
    })),
    receipts: (row.goods_receipts ?? []).map((receipt) => ({
      id: receipt.id,
      receiptNumber: receipt.receipt_number,
      status: receipt.status,
      receivedDate: receipt.received_date,
    })),
    invoices: (row.supplier_invoices ?? []).map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      amount: Number(invoice.amount),
      status: invoice.status,
    })),
    payments: (row.purchase_payments ?? []).map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      paymentDate: payment.payment_date,
      method: payment.method,
      reference: payment.reference,
    })),
  };
}

export type GoodsReceiptRow = {
  id: string;
  receiptNumber: string;
  poNumber: string | null;
  locationName: string;
  status: string;
  receivedDate: string;
  itemCount: number;
};

export async function getGoodsReceipts({
  page = 1,
  pageSize = 25,
}: {
  page?: number;
  pageSize?: number;
}): Promise<{ receipts: GoodsReceiptRow[]; total: number }> {
  const client = await createClient();
  const { data, count } = await client
    .from("goods_receipts")
    .select(
      "id, receipt_number, status, received_date, po_number, purchase_orders(po_number), locations(name), goods_receipt_items(quantity_received)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    receipt_number: string;
    status: string;
    received_date: string;
    purchase_orders: { po_number: string } | null;
    locations: { name: string } | null;
    goods_receipt_items: { quantity_received: number }[];
  }[];

  return {
    receipts: rows.map((row) => ({
      id: row.id,
      receiptNumber: row.receipt_number,
      poNumber: row.purchase_orders?.po_number ?? null,
      locationName: row.locations?.name ?? "—",
      status: row.status,
      receivedDate: row.received_date,
      itemCount: (row.goods_receipt_items ?? []).reduce(
        (sum, item) => sum + Number(item.quantity_received),
        0,
      ),
    })),
    total: count ?? 0,
  };
}

export type GoodsReceiptDetail = {
  id: string;
  receiptNumber: string;
  poNumber: string | null;
  purchaseOrderId: string | null;
  locationName: string;
  status: string;
  receivedDate: string;
  notes: string | null;
  items: {
    id: string;
    variantName: string;
    sku: string;
    quantityReceived: number;
    unitCostActual: number;
    lineTotal: number;
  }[];
};

export async function getGoodsReceiptById(id: string): Promise<GoodsReceiptDetail | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("goods_receipts")
    .select(
      "id, receipt_number, status, received_date, notes, purchase_order_id, purchase_orders(po_number), locations(name), goods_receipt_items(id, quantity_received, unit_cost_actual, product_variants(name, sku))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    receipt_number: string;
    status: string;
    received_date: string;
    notes: string | null;
    purchase_order_id: string | null;
    purchase_orders: { po_number: string } | null;
    locations: { name: string } | null;
    goods_receipt_items: {
      id: string;
      quantity_received: number;
      unit_cost_actual: number;
      product_variants: { name: string; sku: string } | null;
    }[];
  };

  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    poNumber: row.purchase_orders?.po_number ?? null,
    purchaseOrderId: row.purchase_order_id,
    locationName: row.locations?.name ?? "—",
    status: row.status,
    receivedDate: row.received_date,
    notes: row.notes,
    items: (row.goods_receipt_items ?? []).map((item) => ({
      id: item.id,
      variantName: item.product_variants?.name ?? "—",
      sku: item.product_variants?.sku ?? "—",
      quantityReceived: Number(item.quantity_received),
      unitCostActual: Number(item.unit_cost_actual),
      lineTotal: Number(item.quantity_received) * Number(item.unit_cost_actual),
    })),
  };
}

export type SupplierInvoiceRow = {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: string;
  dueDate: string | null;
  amount: number;
  status: string;
};

export async function getSupplierInvoices({
  page = 1,
  pageSize = 25,
}: {
  page?: number;
  pageSize?: number;
}): Promise<{ invoices: SupplierInvoiceRow[]; total: number }> {
  const client = await createClient();
  const { data, count } = await client
    .from("supplier_invoices")
    .select("id, invoice_number, invoice_date, due_date, amount, status, suppliers(name)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string | null;
    amount: number;
    status: string;
    suppliers: { name: string } | null;
  }[];

  return {
    invoices: rows.map((row) => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      supplierName: row.suppliers?.name ?? "—",
      invoiceDate: row.invoice_date,
      dueDate: row.due_date,
      amount: Number(row.amount),
      status: row.status,
    })),
    total: count ?? 0,
  };
}

export type SupplierInvoiceDetail = {
  id: string;
  invoiceNumber: string;
  supplier: { id: string; name: string } | null;
  poNumber: string | null;
  invoiceDate: string;
  dueDate: string | null;
  amount: number;
  status: string;
  notes: string | null;
  payments: { id: string; amount: number; paymentDate: string; method: string; reference: string | null }[];
};

export async function getSupplierInvoiceById(id: string): Promise<SupplierInvoiceDetail | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("supplier_invoices")
    .select(
      "id, invoice_number, invoice_date, due_date, amount, status, notes, suppliers(id, name), purchase_orders(po_number), purchase_payments(id, amount, payment_date, method, reference)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string | null;
    amount: number;
    status: string;
    notes: string | null;
    suppliers: { id: string; name: string } | null;
    purchase_orders: { po_number: string } | null;
    purchase_payments: {
      id: string;
      amount: number;
      payment_date: string;
      method: string;
      reference: string | null;
    }[];
  };

  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    supplier: row.suppliers ? { id: row.suppliers.id, name: row.suppliers.name } : null,
    poNumber: row.purchase_orders?.po_number ?? null,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    amount: Number(row.amount),
    status: row.status,
    notes: row.notes,
    payments: (row.purchase_payments ?? []).map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      paymentDate: payment.payment_date,
      method: payment.method,
      reference: payment.reference,
    })),
  };
}

export type PurchasePaymentRow = {
  id: string;
  supplierName: string;
  invoiceNumber: string | null;
  poNumber: string | null;
  amount: number;
  paymentDate: string;
  method: string;
  reference: string | null;
};

export async function getPurchasePayments({
  page = 1,
  pageSize = 25,
}: {
  page?: number;
  pageSize?: number;
}): Promise<{ payments: PurchasePaymentRow[]; total: number }> {
  const client = await createClient();
  const { data, count } = await client
    .from("purchase_payments")
    .select(
      "id, amount, payment_date, method, reference, suppliers(name), supplier_invoices(invoice_number), purchase_orders(po_number)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    amount: number;
    payment_date: string;
    method: string;
    reference: string | null;
    suppliers: { name: string } | null;
    supplier_invoices: { invoice_number: string } | null;
    purchase_orders: { po_number: string } | null;
  }[];

  return {
    payments: rows.map((row) => ({
      id: row.id,
      supplierName: row.suppliers?.name ?? "—",
      invoiceNumber: row.supplier_invoices?.invoice_number ?? null,
      poNumber: row.purchase_orders?.po_number ?? null,
      amount: Number(row.amount),
      paymentDate: row.payment_date,
      method: row.method,
      reference: row.reference,
    })),
    total: count ?? 0,
  };
}