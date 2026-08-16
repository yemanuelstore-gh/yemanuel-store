import {
  createServiceClient,
  isServiceConfigured,
} from "@/lib/supabase/service";

/**
 * Store details shown to customers for manual payments (bank transfer and
 * mobile money). Stored in the `settings` table by store staff.
 *
 * Keys:
 * - payments.bank_number / payments.bank_name — bank transfer instructions.
 * - payments.momo_number / payments.momo_name — mobile money instructions.
 */
export type ManualPaymentConfig = {
  momoNumber: string | null;
  momoName: string | null;
};

const SETTING_KEYS = [
  "payments.momo_number",
  "payments.momo_name",
] as const;

export async function getManualPaymentConfig(): Promise<ManualPaymentConfig> {
  if (!isServiceConfigured()) {
    return { momoNumber: null, momoName: null };
  }

  const client = createServiceClient();
  const { data, error } = await client
    .from("settings")
    .select("key, value")
    .in("key", SETTING_KEYS);

  if (error) {
    console.error("getManualPaymentConfig:", error.message);
    return { momoNumber: null, momoName: null };
  }

  const byKey = new Map(
    (data ?? []).map((row: { key: string; value: string }) => [row.key, row.value]),
  );

  return {
    momoNumber: byKey.get("payments.momo_number")?.trim() || null,
    momoName: byKey.get("payments.momo_name")?.trim() || null,
  };
}