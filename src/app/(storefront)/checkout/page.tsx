import type { Metadata } from "next";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import {
  CheckoutForm,
  type CheckoutLineItem,
  type CheckoutSavedAddress,
} from "@/components/storefront/checkout-form";
import { RetryPanel } from "@/components/storefront/retry-panel";
import { readCart } from "@/lib/cart";
import {
  getCartProductLines,
  getActiveLocations,
  getCities,
  getDeliveryMethods,
  getDeliveryRates,
  getRegions,
} from "@/lib/catalogue";
import { getAvailablePaymentMethods } from "@/lib/payments/registry";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Complete your Yemanuel Store order — contact and delivery details in GHS.",
};

export default async function CheckoutPage() {
  const cart = await readCart();
  if (cart.length === 0) {
    redirect("/cart");
  }

  const [linesResult, methodsResult, ratesResult, locationsResult, regionsResult, citiesResult] =
    await Promise.allSettled([
      getCartProductLines(cart.map((item) => item.variantId)),
      getDeliveryMethods(),
      getDeliveryRates(),
      getActiveLocations(),
      getRegions(),
      getCities(),
    ]);

  if (
    linesResult.status === "rejected" ||
    methodsResult.status === "rejected" ||
    ratesResult.status === "rejected" ||
    locationsResult.status === "rejected" ||
    regionsResult.status === "rejected" ||
    citiesResult.status === "rejected"
  ) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
        <CheckoutHeading />
        <RetryPanel
          className="mt-8"
          retryHref="/checkout"
          message="We could not load the checkout details. Please try again."
        />
      </div>
    );
  }

  const lines = linesResult.value;
  const deliveryMethods = methodsResult.value;
  const deliveryRates = ratesResult.value;
  const storeLocations = locationsResult.value;
  const regions = regionsResult.value;
  const cities = citiesResult.value;
  const paymentMethods = getAvailablePaymentMethods();

  let prefill:
    | {
        fullName: string;
        phone: string;
        email: string;
        recipientName: string;
        recipientPhone: string;
        addressLine1: string;
        addressLine2: string | null;
        cityId: string;
        regionId: string;
      }
    | undefined;
  let savedAddresses: CheckoutSavedAddress[] = [];

  try {
    const client = await createClient();
    const { data } = await client.auth.getUser();
    if (data.user) {
      const customer = await client
        .from("customers")
        .select("id, first_name, last_name, phone, email")
        .eq("profile_id", data.user.id)
        .maybeSingle();
      if (!customer.error && customer.data) {
        const customerData = customer.data as unknown as {
          id: string;
          first_name: string;
          last_name: string;
          phone: string;
          email: string | null;
        };
        prefill = {
          fullName: `${customerData.first_name} ${customerData.last_name}`.trim(),
          phone: customerData.phone,
          email: customerData.email ?? "",
          recipientName: "",
          recipientPhone: "",
          addressLine1: "",
          addressLine2: null,
          cityId: "",
          regionId: "",
        };
        const addresses = await client
          .from("customer_addresses")
          .select(
            "id, label, recipient_name, recipient_phone, address_line_1, address_line_2, city_id, region_id, is_default_delivery",
          )
          .eq("customer_id", customerData.id);
        if (!addresses.error) {
          const addressRows = addresses.data as unknown as {
            id: string;
            label: string;
            recipient_name: string;
            recipient_phone: string;
            address_line_1: string;
            address_line_2: string | null;
            city_id: string | null;
            region_id: string | null;
            is_default_delivery: boolean | null;
          }[];
          savedAddresses = addressRows
            .filter((address) => address.city_id && address.region_id)
            .map((address) => ({
              id: address.id,
              label: address.label,
              recipientName: address.recipient_name,
              recipientPhone: address.recipient_phone,
              addressLine1: address.address_line_1,
              addressLine2: address.address_line_2,
              cityId: address.city_id ?? "",
              regionId: address.region_id ?? "",
            }));
          const preferred =
            savedAddresses.find((address) => address.id === addressRows.find(
              (row) => row.is_default_delivery,
            )?.id) ?? savedAddresses[0];
          if (preferred && prefill) {
            prefill = {
              ...prefill,
              recipientName: preferred.recipientName,
              recipientPhone: preferred.recipientPhone,
              addressLine1: preferred.addressLine1,
              addressLine2: preferred.addressLine2,
              cityId: preferred.cityId,
              regionId: preferred.regionId,
            };
          }
        }
      }
    }
  } catch {
    // Supabase not configured or session unavailable: proceed as guest.
  }

  const checkoutLines: CheckoutLineItem[] = [];
  const unavailableNames: string[] = [];

  for (const item of cart) {
    const line = lines.find(
      (candidate) => candidate.variantId === item.variantId,
    );
    const unitPrice =
      line && line.hasSale && line.salePrice !== null
        ? line.salePrice
        : line?.price ?? null;
    if (!line || !line.available || unitPrice === null) {
      if (line) unavailableNames.push(line.productName);
      continue;
    }
    checkoutLines.push({
      variantId: item.variantId,
      sku: line.sku,
      variantName: line.variantName,
      optionLabels: line.optionLabels,
      productName: line.productName,
      productSlug: line.productSlug,
      imageUrl: line.imageUrl,
      imageAlt: line.imageAlt,
      quantity: item.quantity,
      unitPrice,
      lineTotal: Math.round(unitPrice * item.quantity * 100) / 100,
    });
  }

  const subtotal = checkoutLines.reduce(
    (total, line) => total + line.lineTotal,
    0,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
      <CheckoutHeading />
      <div className="mt-8">
        <CheckoutForm
          requestId={randomUUID()}
          lines={checkoutLines}
          subtotal={subtotal}
          deliveryMethods={deliveryMethods}
          deliveryRates={deliveryRates}
          storeLocations={storeLocations}
          regions={regions}
          cities={cities}
          paymentMethods={paymentMethods}
          unavailableNames={unavailableNames}
          prefill={prefill}
          savedAddresses={savedAddresses}
        />
      </div>
    </div>
  );
}

function CheckoutHeading() {
  return (
    <>
      <Link
        href="/cart"
        className="text-sm text-ink-soft transition-colors hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy"
      >
        ← Back to cart
      </Link>
      <h1 className="mt-4 font-display text-3xl font-medium tracking-tight text-ink lg:text-4xl">
        Checkout
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-ink-soft">
        Secure checkout with delivery across Ghana. No payment is taken at this
        stage.
      </p>
    </>
  );
}