import { randomBytes } from "node:crypto";
import {
  createServiceClient,
  isServiceConfigured,
} from "@/lib/supabase/service";
import {
  effectivePricing,
  pricingFor,
  roundMoney,
  type PriceRow,
} from "@/lib/pricing";
import { clampQuantity, type CartItem } from "@/lib/cart";

export type CheckoutContact = {
  fullName: string;
  phone: string;
  email: string;
};

export type CheckoutDelivery = {
  methodId: string;
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  cityId: string;
  regionId: string;
  pickupLocationId: string | null;
};

export type CreateOrderParams = {
  requestId: string;
  cart: CartItem[];
  contact: CheckoutContact;
  delivery: CheckoutDelivery;
  customerId: string | null;
  createdBy: string | null;
};

export type CreateOrderResult =
  | { ok: true; orderNumber: string; totalAmount: number }
  | { ok: false; message: string };

type VariantLookupRow = {
  id: string;
  name: string;
  sku: string;
  options: Record<string, string> | null;
  status: string;
  product: { id: string; name: string; status: string } | null;
  prices: (PriceRow & { valid_from: string; valid_to: string | null })[];
};

type ResolvedLine = {
  variantId: string;
  quantity: number;
  productName: string;
  variantName: string;
  sku: string;
  options: Record<string, string> | null;
  unitPrice: number;
  lineTotal: number;
};

function currentPrices(row: VariantLookupRow): PriceRow[] {
  const now = Date.now();
  return row.prices.filter((price) => {
    const from = price.valid_from ? new Date(price.valid_from).getTime() : 0;
    const to = price.valid_to ? new Date(price.valid_to).getTime() : null;
    return from <= now && (to === null || to >= now);
  });
}

function makeOrderNumber(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `YS-${yyyy}${mm}${dd}-${suffix}`;
}

export async function createOrder(
  params: CreateOrderParams,
): Promise<CreateOrderResult> {
  if (!isServiceConfigured()) {
    return { ok: false, message: "Online orders are not available yet." };
  }
  const client = createServiceClient();

  const existingOrder = await client
    .from("orders")
    .select("order_number, total_amount")
    .eq("id", params.requestId)
    .maybeSingle();
  if (existingOrder.data?.order_number) {
    return {
      ok: true,
      orderNumber: existingOrder.data.order_number,
      totalAmount: Number(existingOrder.data.total_amount),
    };
  }

  const cart = params.cart.slice(0, 30);
  if (cart.length === 0) {
    return { ok: false, message: "Your cart is empty." };
  }

  const variantIds = cart.map((item) => item.variantId);
  const variantsResult = await client
    .from("product_variants")
    .select(
      `
      id, name, sku, options, status,
      product:products(id, name, status),
      prices(price_type, amount, variant_id, valid_from, valid_to)
    `,
    )
    .in("id", variantIds);
  if (variantsResult.error) {
    return { ok: false, message: "We could not verify your cart. Please try again." };
  }

  const variantsById = new Map<string, VariantLookupRow>();
  for (const row of variantsResult.data ?? []) {
    variantsById.set(
      row.id,
      row as unknown as VariantLookupRow,
    );
  }

  const unavailable: string[] = [];
  const lines: ResolvedLine[] = [];

  for (const item of cart) {
    const row = variantsById.get(item.variantId);
    const quantity = clampQuantity(item.quantity);

    if (!row) {
      unavailable.push("an item in your cart");
      continue;
    }
    if (row.status !== "active" || row.product?.status !== "active") {
      unavailable.push(row.product?.name ?? row.name);
      continue;
    }
    const effective = effectivePricing(
      pricingFor(currentPrices(row), row.id),
    );
    if (effective.price === null) {
      unavailable.push(row.product?.name ?? row.name);
      continue;
    }

    const unitPrice = roundMoney(effective.price);
    lines.push({
      variantId: row.id,
      quantity,
      productName: row.product?.name ?? row.name,
      variantName: row.name,
      sku: row.sku,
      options: row.options,
      unitPrice,
      lineTotal: roundMoney(unitPrice * quantity),
    });
  }

  if (unavailable.length > 0) {
    const names = [...new Set(unavailable)].slice(0, 3).join(", ");
    return {
      ok: false,
      message: `Some items in your cart are no longer available (${names}). Please review your cart and try again.`,
    };
  }

  const methodResult = await client
    .from("delivery_methods")
    .select("id, name, kind")
    .eq("id", params.delivery.methodId)
    .eq("is_active", true)
    .maybeSingle();
  if (methodResult.error || !methodResult.data) {
    return { ok: false, message: "Please choose a valid delivery method." };
  }
  const method = methodResult.data as unknown as {
    id: string;
    name: string;
    kind: string;
  };
  const isPickup = method.kind === "pickup";

  let deliveryFee: number;
  let regionName: string;
  let cityName: string;
  let pickupLocationId: string | null = null;
  let pickupLocationName: string | null = null;
  let deliveryAddressLine1: string;
  let deliveryAddressLine2: string | null;

  if (isPickup) {
    if (!params.delivery.pickupLocationId) {
      return { ok: false, message: "Please choose a pickup location." };
    }
    const locationResult = await client
      .from("locations")
      .select("id, name, city, address_line_1, address_line_2, region_id, regions(name)")
      .eq("id", params.delivery.pickupLocationId)
      .eq("status", "active")
      .maybeSingle();
    if (locationResult.error || !locationResult.data) {
      return { ok: false, message: "Please choose a valid pickup location." };
    }
    const location = locationResult.data as unknown as {
      id: string;
      name: string;
      city: string;
      address_line_1: string;
      address_line_2: string | null;
      region_id: string;
      regions: { name: string } | null;
    };

    const rateResult = await client
      .from("delivery_rates")
      .select("fee")
      .eq("delivery_method_id", method.id)
      .eq("region_id", location.region_id)
      .eq("is_active", true)
      .maybeSingle();
    if (rateResult.error || !rateResult.data) {
      return { ok: false, message: "Pickup is not available right now." };
    }
    deliveryFee = roundMoney(Number(rateResult.data.fee));
    regionName = location.regions?.name ?? "";
    cityName = location.city;
    pickupLocationId = location.id;
    pickupLocationName = location.name;
    deliveryAddressLine1 = location.address_line_1;
    deliveryAddressLine2 = location.address_line_2;
  } else {
    const [regionResult, cityResult] = await Promise.all([
      client
        .from("regions")
        .select("name")
        .eq("id", params.delivery.regionId)
        .maybeSingle(),
      client
        .from("cities")
        .select("name")
        .eq("id", params.delivery.cityId)
        .maybeSingle(),
    ]);
    if (regionResult.error || !regionResult.data || cityResult.error || !cityResult.data) {
      return { ok: false, message: "Please choose a valid region and city." };
    }
    regionName = regionResult.data.name as string;
    cityName = cityResult.data.name as string;

    const rateResult = await client
      .from("delivery_rates")
      .select("fee, eta_min_days, eta_max_days")
      .eq("delivery_method_id", method.id)
      .eq("region_id", params.delivery.regionId)
      .eq("is_active", true)
      .maybeSingle();
    if (rateResult.error || !rateResult.data) {
      return {
        ok: false,
        message: `${method.name} is not available to ${regionName} right now. Please choose another delivery method.`,
      };
    }
    deliveryFee = roundMoney(Number(rateResult.data.fee));
    deliveryAddressLine1 = params.delivery.addressLine1;
    deliveryAddressLine2 = params.delivery.addressLine2;
  }

  const fulfilmentLocationResult = await client
    .from("locations")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (fulfilmentLocationResult.error || !fulfilmentLocationResult.data) {
    return {
      ok: false,
      message: "We are not accepting orders yet. Please check back soon.",
    };
  }

  const subtotal = roundMoney(
    lines.reduce((total, line) => total + line.lineTotal, 0),
  );
  const totalAmount = roundMoney(subtotal + deliveryFee);

  const orderInsert = {
    id: params.requestId,
    order_number: makeOrderNumber(new Date()),
    customer_id: params.customerId,
    channel: "online",
    status: "pending",
    payment_status: "unpaid",
    fulfilment_status: "unfulfilled",
    location_id: fulfilmentLocationResult.data.id,
    guest_name: params.contact.fullName,
    guest_phone: params.contact.phone,
    guest_email: params.contact.email,
    bill_to_recipient: params.contact.fullName,
    bill_to_phone: params.contact.phone,
    bill_to_address_line_1: params.delivery.addressLine1,
    bill_to_address_line_2: params.delivery.addressLine2,
    bill_to_city: cityName,
    bill_to_region: regionName,
    delivery_method_name: method.name,
    delivery_fee: deliveryFee,
    delivery_recipient: params.delivery.recipientName,
    delivery_phone: params.delivery.recipientPhone,
    delivery_address_line_1: deliveryAddressLine1,
    delivery_address_line_2: deliveryAddressLine2,
    delivery_city: cityName,
    delivery_region: regionName,
    pickup_location_id: pickupLocationId,
    pickup_location_name: pickupLocationName,
    subtotal,
    discount_total: 0,
    taxable_amount: 0,
    tax_amount: 0,
    tax_rate: null,
    total_amount: totalAmount,
    notes: null,
    created_by: params.createdBy,
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const orderNumber = attempt === 0 ? orderInsert.order_number : makeOrderNumber(new Date());
    const result = await client
      .from("orders")
      .insert({ ...orderInsert, order_number: orderNumber });
    if (!result.error) {
      orderInsert.order_number = orderNumber;
      break;
    }
    if (result.error.code === "23505") {
      const retry = await client
        .from("orders")
        .select("order_number, total_amount")
        .eq("id", params.requestId)
        .maybeSingle();
      if (retry.data?.order_number) {
        return {
          ok: true,
          orderNumber: retry.data.order_number,
          totalAmount: Number(retry.data.total_amount),
        };
      }
      if (attempt === 1) {
        return { ok: false, message: "We could not place your order. Please try again." };
      }
    } else {
      return { ok: false, message: "We could not place your order. Please try again." };
    }
  }

  const itemsInsert = lines.map((line) => ({
    order_id: params.requestId,
    variant_id: line.variantId,
    quantity: line.quantity,
    product_name: line.productName,
    variant_name: line.variantName,
    sku: line.sku,
    options: line.options,
    unit_price: line.unitPrice,
    unit_cost: null,
    discount_amount: 0,
    line_total: line.lineTotal,
    taxable_amount: 0,
    tax_rate: null,
    tax_amount: 0,
  }));

  const itemsResult = await client.from("order_items").insert(itemsInsert);
  if (itemsResult.error) {
    await client.from("orders").delete().eq("id", params.requestId);
    return { ok: false, message: "We could not place your order. Please try again." };
  }

  return { ok: true, orderNumber: orderInsert.order_number, totalAmount };
}

export type OrderReceiptItem = {
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string | null;
};

function primaryImageUrl(
  images: { url: string; is_primary: boolean }[] | null | undefined,
): string | null {
  if (!images || images.length === 0) return null;
  const primary = images.find((image) => image.is_primary) ?? images[0];
  return primary.url ?? null;
}

export type OrderReceipt = {
  orderNumber: string;
  placedAt: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  deliveryMethodName: string;
  deliveryRecipient: string;
  deliveryPhone: string;
  deliveryAddressLine1: string;
  deliveryAddressLine2: string | null;
  deliveryCity: string;
  deliveryRegion: string;
  guestName: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
  paymentReference: string | null;
  items: OrderReceiptItem[];
};

export async function getOrderReceipt(
  orderNumber: string,
): Promise<OrderReceipt | null> {
  if (!isServiceConfigured()) return null;
  const client = createServiceClient();
  const { data, error } = await client
    .from("orders")
    .select(
      `
      order_number, created_at, subtotal, delivery_fee, total_amount,
      delivery_method_name, delivery_recipient, delivery_phone,
      delivery_address_line_1, delivery_address_line_2,
      delivery_city, delivery_region, guest_name,
      order_items(
        product_name, variant_name, sku, quantity, unit_price, line_total,
        variant_id:product_variants(product_images(url, is_primary))
      ),
      payments(method, status, reference, created_at)
    `,
    )
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    order_number: string;
    created_at: string;
    subtotal: string;
    delivery_fee: string;
    total_amount: string;
    delivery_method_name: string | null;
    delivery_recipient: string | null;
    delivery_phone: string | null;
    delivery_address_line_1: string | null;
    delivery_address_line_2: string | null;
    delivery_city: string | null;
    delivery_region: string | null;
    guest_name: string | null;
    order_items: {
      product_name: string;
      variant_name: string;
      sku: string;
      quantity: number;
      unit_price: string;
      line_total: string;
      product_variants: {
        product_images: { url: string; is_primary: boolean }[] | null;
      } | null;
    }[];
    payments: {
      method: string;
      status: string;
      reference: string | null;
      created_at: string;
    }[];
  };

  const payment = (row.payments ?? [])
    .filter((candidate) => candidate.status !== "void")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0] ?? null;

  return {
    orderNumber: row.order_number,
    placedAt: row.created_at,
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    totalAmount: Number(row.total_amount),
    deliveryMethodName: row.delivery_method_name ?? "",
    deliveryRecipient: row.delivery_recipient ?? "",
    deliveryPhone: row.delivery_phone ?? "",
    deliveryAddressLine1: row.delivery_address_line_1 ?? "",
    deliveryAddressLine2: row.delivery_address_line_2 ?? null,
    deliveryCity: row.delivery_city ?? "",
    deliveryRegion: row.delivery_region ?? "",
    guestName: row.guest_name ?? "",
    items: (row.order_items ?? []).map((item) => ({
      productName: item.product_name,
      variantName: item.variant_name,
      sku: item.sku,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      lineTotal: Number(item.line_total),
      imageUrl: primaryImageUrl(item.product_variants?.product_images),
    })),
    paymentMethod: payment?.method ?? null,
    paymentStatus: payment?.status ?? null,
    paymentReference: payment?.reference ?? null,
  };
}