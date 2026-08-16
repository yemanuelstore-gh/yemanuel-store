import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";

/**
 * Generate a document number from the app document sequences
 * (e.g. "PO-2026-00001"). Sequences are service-role only by design.
 */
export async function nextDocumentNumber(prefix: string): Promise<string> {
  if (!isServiceConfigured()) {
    return `${prefix.toUpperCase()}-${Date.now()}`;
  }
  const service = createServiceClient();
  const { data } = await service.rpc("next_document_number", { p_prefix: prefix });
  return typeof data === "string" && data.length > 0
    ? data
    : `${prefix.toUpperCase()}-${Date.now()}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function parseAmount(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return amount;
}

export function parseQuantity(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  return quantity;
}

export function parseOptionalAmount(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}