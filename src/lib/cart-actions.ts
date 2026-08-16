"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  addItem,
  clampQuantity,
  readCart,
  removeItem,
  updateItem,
  writeCart,
} from "@/lib/cart";

export type CartActionResult = {
  ok: boolean;
  added: boolean;
  message: string;
};

async function validateVariant(
  variantId: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "The store catalogue is not connected yet." };
  }
  const client = await createClient();
  const { data } = await client
    .from("product_variants")
    .select("id, product:products(status)")
    .eq("id", variantId)
    .maybeSingle();
  if (!data) return { ok: false, message: "This product is no longer available." };
  const embedded = data as unknown as {
    product: { status: string } | { status: string }[] | null;
  };
  const productStatus = Array.isArray(embedded.product)
    ? embedded.product[0]?.status
    : embedded.product?.status;
  if (productStatus !== "active") {
    return { ok: false, message: "This product is no longer available." };
  }
  return { ok: true };
}

export async function addToCartAction(
  _previousState: CartActionResult,
  formData: FormData,
): Promise<CartActionResult> {
  const variantId = String(formData.get("variantId") ?? "").trim();
  const quantity = clampQuantity(Number(formData.get("quantity")));

  if (!variantId) {
    return { ok: false, added: false, message: "Please choose a variant." };
  }

  const validation = await validateVariant(variantId);
  if (!validation.ok) {
    return {
      ok: false,
      added: false,
      message: validation.message ?? "This product is no longer available.",
    };
  }

  const items = addItem(await readCart(), variantId, quantity);
  await writeCart(items);
  revalidatePath("/", "layout");
  return { ok: true, added: true, message: "" };
}

export async function updateCartItemAction(
  formData: FormData,
): Promise<void> {
  const variantId = String(formData.get("variantId") ?? "").trim();
  if (!variantId) return;

  const quantity = clampQuantity(Number(formData.get("quantity")));
  const items = updateItem(await readCart(), variantId, quantity);
  await writeCart(items);
  revalidatePath("/");
  revalidatePath("/cart");
}

export async function removeCartItemAction(
  formData: FormData,
): Promise<void> {
  const variantId = String(formData.get("variantId") ?? "").trim();
  if (!variantId) return;

  const items = removeItem(await readCart(), variantId);
  await writeCart(items);
  revalidatePath("/");
  revalidatePath("/cart");
}

export async function clearCartAction(): Promise<void> {
  await writeCart([]);
  revalidatePath("/");
  revalidatePath("/cart");
}