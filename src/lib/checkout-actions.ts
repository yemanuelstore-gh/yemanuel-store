"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readCart, writeCart } from "@/lib/cart";
import { createOrder, type CheckoutDelivery } from "@/lib/orders";
import { createPendingPayment, setPaymentProviderReference } from "@/lib/payments/record";
import {
  getPaymentProviderForMethod,
  isPaymentMethodAvailable,
} from "@/lib/payments/registry";
import type { PaymentMethod } from "@/lib/payments/types";
import {
  isNonEmpty,
  isValidEmail,
  isValidFullName,
  isValidGhanaPhone,
} from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

export type PlaceOrderState = {
  ok: boolean;
  message: string;
};

const REQUEST_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fieldError(field: string): PlaceOrderState {
  return { ok: false, message: `Please check the ${field} field.` };
}

export async function placeOrderAction(
  _previousState: PlaceOrderState,
  formData: FormData,
): Promise<PlaceOrderState> {
  const requestId = String(formData.get("requestId") ?? "").trim();
  if (!REQUEST_ID_RE.test(requestId)) {
    return { ok: false, message: "This checkout session is invalid. Please reload the page." };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const recipientName = String(formData.get("recipientName") ?? "").trim();
  const recipientPhone = String(formData.get("recipientPhone") ?? "").trim();
  const addressLine1 = String(formData.get("addressLine1") ?? "").trim();
  const addressLine2 = String(formData.get("addressLine2") ?? "").trim();
  const cityId = String(formData.get("cityId") ?? "").trim();
  const regionId = String(formData.get("regionId") ?? "").trim();
  const methodId = String(formData.get("deliveryMethodId") ?? "").trim();
  const pickupLocationId = String(formData.get("pickupLocationId") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethodId") ?? "").trim();

  if (!isNonEmpty(paymentMethod)) {
    return { ok: false, message: "Please choose a payment method." };
  }
  if (!isPaymentMethodAvailable(paymentMethod as PaymentMethod)) {
    return { ok: false, message: "That payment method is not available right now." };
  }

  if (!isValidFullName(fullName)) return fieldError("full name");
  if (!isValidGhanaPhone(phone)) {
    return { ok: false, message: "Please enter a valid Ghana phone number (e.g. 024 412 3456)." };
  }
  if (!isValidEmail(email)) return fieldError("email address");
  if (!isValidFullName(recipientName)) return fieldError("recipient name");
  if (!isValidGhanaPhone(recipientPhone)) {
    return { ok: false, message: "Please enter a valid recipient phone number." };
  }
  if (!isNonEmpty(methodId)) {
    return { ok: false, message: "Please choose a delivery method." };
  }

  let deliveryMethodKind: "delivery" | "pickup" = "delivery";
  try {
    const client = await createClient();
    const { data: method } = await client
      .from("delivery_methods")
      .select("kind")
      .eq("id", methodId)
      .eq("is_active", true)
      .maybeSingle();
    if (!method) {
      return { ok: false, message: "Please choose a valid delivery method." };
    }
    deliveryMethodKind = method.kind === "pickup" ? "pickup" : "delivery";
  } catch {
    return { ok: false, message: "Please choose a valid delivery method." };
  }

  if (deliveryMethodKind === "pickup") {
    if (!isNonEmpty(pickupLocationId)) {
      return { ok: false, message: "Please choose a pickup location." };
    }
  } else {
    if (!isNonEmpty(addressLine1)) return fieldError("address");
    if (!isNonEmpty(cityId) || !isNonEmpty(regionId)) {
      return { ok: false, message: "Please choose a region and city." };
    }
  }

  let customerId: string | null = null;
  let createdBy: string | null = null;
  try {
    const client = await createClient();
    const { data } = await client.auth.getUser();
    if (data.user) {
      createdBy = data.user.id;
      const customer = await client
        .from("customers")
        .select("id")
        .eq("profile_id", data.user.id)
        .maybeSingle();
      if (!customer.error && customer.data) {
        customerId = customer.data.id as string;
      }
    }
  } catch {
    // Supabase not configured or session unavailable: proceed as guest.
  }

  let cart;
  try {
    cart = await readCart();
  } catch {
    return { ok: false, message: "Your cart could not be read. Please try again." };
  }

  const delivery: CheckoutDelivery = {
    methodId,
    recipientName,
    recipientPhone,
    addressLine1,
    addressLine2: addressLine2 === "" ? null : addressLine2,
    cityId,
    regionId,
    pickupLocationId: deliveryMethodKind === "pickup" ? pickupLocationId : null,
  };

  const result = await createOrder({
    requestId,
    cart,
    contact: { fullName, phone, email },
    delivery,
    customerId,
    createdBy,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  const pendingPayment = await createPendingPayment({
    orderId: requestId,
    amount: result.totalAmount,
    method: paymentMethod as PaymentMethod,
  });

  const provider = getPaymentProviderForMethod(paymentMethod as PaymentMethod);
  if (provider && pendingPayment) {
    const baseUrl =
      (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "") ||
      (await safeOrigin()) ||
      "";
    const init = await provider.initializePayment({
      paymentId: pendingPayment.paymentId,
      orderId: requestId,
      orderNumber: result.orderNumber,
      amount: result.totalAmount,
      reference: pendingPayment.reference,
      phone,
      customerName: fullName,
      email,
      returnUrl: `${baseUrl}/api/payments/return?reference=${pendingPayment.reference}`,
      notifyUrl: `${baseUrl}/api/payments/webhook/${provider.id}`,
    });

    if (!init.ok) {
      return {
        ok: false,
        message:
          "We could not start your payment. Nothing was charged — please try again or choose another payment method.",
      };
    }

    await setPaymentProviderReference({
      paymentId: pendingPayment.paymentId,
      provider: provider.id,
      providerReference: init.providerReference,
    });

    try {
      const store = await cookies();
      store.set(
        "ys_order_receipt",
        JSON.stringify({ orderNumber: result.orderNumber, placedAt: Date.now() }),
        {
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 30,
        },
      );
      await writeCart([]);
    } catch {
      // Cookie writes are allowed in server actions; a failure here is unexpected.
    }

    if ("requiresAwaiting" in init) {
      redirect(`/checkout/payment/${result.orderNumber}?status=pending`);
    }
    redirect(init.redirectUrl);
  }

  try {
    const store = await cookies();
    store.set(
      "ys_order_receipt",
      JSON.stringify({ orderNumber: result.orderNumber, placedAt: Date.now() }),
      {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 30,
      },
    );
    await writeCart([]);
  } catch {
    // Cookie writes are allowed in server actions; a failure here is unexpected.
  }

  revalidatePath("/");
  revalidatePath("/cart");
  redirect(`/checkout/success/${result.orderNumber}`);
}

async function safeOrigin(): Promise<string | null> {
  try {
    const headerStore = await headers();
    const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
    if (!host) return null;
    const proto = headerStore.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  } catch {
    return null;
  }
}