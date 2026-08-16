import { createClient } from "@/lib/supabase/server";

export type ProductSearchRow = {
  id: string;
  name: string;
  status: string;
};

export type VariantSearchRow = {
  id: string;
  name: string;
  sku: string;
  productName: string | null;
};

export type CustomerSearchRow = {
  id: string;
  customerCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
};

export type OrderSearchRow = {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string | null;
};

export type SupplierSearchRow = {
  id: string;
  supplierCode: string;
  name: string;
  phone: string;
};

export type SearchResults = {
  products: ProductSearchRow[];
  variants: VariantSearchRow[];
  customers: CustomerSearchRow[];
  orders: OrderSearchRow[];
  suppliers: SupplierSearchRow[];
};

export async function getSearchResults(q: string): Promise<SearchResults> {
  const client = await createClient();
  const term = `%${q}%`;

  const [productsResult, variantsResult, customersResult, ordersResult, suppliersResult] =
    await Promise.all([
      client
        .from("products")
        .select("id, name, status")
        .ilike("name", term)
        .order("name")
        .limit(10),
      client
        .from("product_variants")
        .select("id, name, sku, products(name)")
        .or(`name.ilike.${term},sku.ilike.${term}`)
        .order("name")
        .limit(10),
      client
        .from("customers")
        .select("id, customer_code, first_name, last_name, phone, email")
        .or(
          `first_name.ilike.${term},last_name.ilike.${term},phone.ilike.${term},customer_code.ilike.${term}`,
        )
        .order("first_name")
        .limit(10),
      client
        .from("orders")
        .select("id, order_number, status, guest_name, customers(first_name, last_name)")
        .ilike("order_number", term)
        .order("created_at", { ascending: false })
        .limit(10),
      client
        .from("suppliers")
        .select("id, supplier_code, name, phone")
        .or(`name.ilike.${term},supplier_code.ilike.${term},phone.ilike.${term}`)
        .order("name")
        .limit(10),
    ]);

  const variants = (variantsResult.data ?? []) as unknown as {
    id: string;
    name: string;
    sku: string;
    products: { name: string } | null;
  }[];
  const orders = (ordersResult.data ?? []) as unknown as {
    id: string;
    order_number: string;
    status: string;
    guest_name: string | null;
    customers: { first_name: string; last_name: string } | null;
  }[];

  return {
    products: (productsResult.data ?? []) as unknown as ProductSearchRow[],
    variants: variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      productName: variant.products?.name ?? null,
    })),
    customers: (customersResult.data ?? []) as unknown as CustomerSearchRow[],
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      customerName: order.customers
        ? `${order.customers.first_name} ${order.customers.last_name}`
        : order.guest_name ?? null,
    })),
    suppliers: (suppliersResult.data ?? []) as unknown as SupplierSearchRow[],
  };
}