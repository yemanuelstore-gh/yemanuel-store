import { createClient } from "@/lib/supabase/server";

export type AdminSupplierRow = {
  id: string;
  supplierCode: string;
  name: string;
  contactPerson: string | null;
  phone: string;
  email: string | null;
  status: string;
  paymentTermsDays: number | null;
};

export async function getSuppliers({
  q,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ suppliers: AdminSupplierRow[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("suppliers")
    .select(
      "id, supplier_code, name, contact_person, phone, email, status, payment_terms_days",
      { count: "exact" },
    );

  if (q && q.trim() !== "") {
    query = query.or(
      `name.ilike.%${q.trim()}%,supplier_code.ilike.%${q.trim()}%,contact_person.ilike.%${q.trim()}%`,
    );
  }

  const { data, count } = await query
    .order("name", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    supplier_code: string;
    name: string;
    contact_person: string | null;
    phone: string;
    email: string | null;
    status: string;
    payment_terms_days: number | null;
  }[];

  return {
    suppliers: rows.map((row) => ({
      id: row.id,
      supplierCode: row.supplier_code,
      name: row.name,
      contactPerson: row.contact_person,
      phone: row.phone,
      email: row.email,
      status: row.status,
      paymentTermsDays: row.payment_terms_days,
    })),
    total: count ?? 0,
  };
}

export type AdminSupplierDetail = {
  id: string;
  supplierCode: string;
  name: string;
  contactPerson: string | null;
  phone: string;
  email: string | null;
  website: string | null;
  status: string;
  paymentTermsDays: number | null;
  notes: string | null;
  createdAt: string;
  contacts: {
    id: string;
    name: string;
    role: string | null;
    phone: string;
    email: string | null;
    isPrimary: boolean;
  }[];
  addresses: {
    id: string;
    label: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    regionName: string | null;
    postalCode: string | null;
  }[];
  suppliedVariants: {
    id: string;
    variantId: string;
    supplierSku: string | null;
    supplierProductName: string | null;
    lastCost: number | null;
    preferredSupplier: boolean;
    leadTimeDays: number | null;
    minimumOrderQuantity: number | null;
    variantName: string;
    variantSku: string;
    productName: string | null;
  }[];
};

export async function getSupplierById(id: string): Promise<AdminSupplierDetail | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("suppliers")
    .select(
      "id, supplier_code, name, contact_person, phone, email, website, status, payment_terms_days, notes, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    supplier_code: string;
    name: string;
    contact_person: string | null;
    phone: string;
    email: string | null;
    website: string | null;
    status: string;
    payment_terms_days: number | null;
    notes: string | null;
    created_at: string;
  };

  const [contactsResult, addressesResult, variantsResult] = await Promise.all([
    client
      .from("supplier_contacts")
      .select("id, name, role, phone, email, is_primary")
      .eq("supplier_id", id)
      .order("created_at", { ascending: true }),
    client
      .from("supplier_addresses")
      .select(
        "id, label, address_line_1, address_line_2, city, postal_code, regions(name)",
      )
      .eq("supplier_id", id)
      .order("created_at", { ascending: true }),
    client
      .from("supplier_products")
      .select(
        "id, variant_id, supplier_sku, supplier_product_name, last_cost, preferred_supplier, lead_time_days, minimum_order_quantity, product_variants(name, sku, products(name))",
      )
      .eq("supplier_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const contacts = ((contactsResult.data ?? []) as unknown as {
    id: string;
    name: string;
    role: string | null;
    phone: string;
    email: string | null;
    is_primary: boolean;
  }[]).map((contact) => ({
    id: contact.id,
    name: contact.name,
    role: contact.role,
    phone: contact.phone,
    email: contact.email,
    isPrimary: Boolean(contact.is_primary),
  }));

  const addresses = ((addressesResult.data ?? []) as unknown as {
    id: string;
    label: string | null;
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    postal_code: string | null;
    regions: { name: string } | null;
  }[]).map((address) => ({
    id: address.id,
    label: address.label,
    addressLine1: address.address_line_1,
    addressLine2: address.address_line_2,
    city: address.city,
    regionName: address.regions?.name ?? null,
    postalCode: address.postal_code,
  }));

  const suppliedVariants = ((variantsResult.data ?? []) as unknown as {
    id: string;
    variant_id: string;
    supplier_sku: string | null;
    supplier_product_name: string | null;
    last_cost: number | null;
    preferred_supplier: boolean;
    lead_time_days: number | null;
    minimum_order_quantity: number | null;
    product_variants: {
      name: string;
      sku: string;
      products: { name: string } | null;
    } | null;
  }[]).map((variant) => ({
    id: variant.id,
    variantId: variant.variant_id,
    supplierSku: variant.supplier_sku,
    supplierProductName: variant.supplier_product_name,
    lastCost: variant.last_cost === null ? null : Number(variant.last_cost),
    preferredSupplier: Boolean(variant.preferred_supplier),
    leadTimeDays: variant.lead_time_days,
    minimumOrderQuantity:
      variant.minimum_order_quantity === null
        ? null
        : Number(variant.minimum_order_quantity),
    variantName: variant.product_variants?.name ?? "—",
    variantSku: variant.product_variants?.sku ?? "—",
    productName: variant.product_variants?.products?.name ?? null,
  }));

  return {
    id: row.id,
    supplierCode: row.supplier_code,
    name: row.name,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    website: row.website,
    status: row.status,
    paymentTermsDays: row.payment_terms_days,
    notes: row.notes,
    createdAt: row.created_at,
    contacts,
    addresses,
    suppliedVariants,
  };
}