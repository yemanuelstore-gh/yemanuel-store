const ghsFormatter = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a number as Ghanaian Cedi, e.g. 1250.5 -> "GH₵1,250.50".
 * Non-finite values render as an em dash for dashboard/empty states.
 */
export function formatGHS(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "—";
  }
  return ghsFormatter.format(amount);
}

const NON_DIGITS = /\D/g;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whether an ISO timestamp falls within the given number of days — used
 * for "New" badges on product cards.
 */
export function isNewArrival(
  createdAt: string,
  withinDays = 21,
): boolean {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return Date.now() - created <= withinDays * DAY_MS;
}

/**
 * Format a Ghanaian phone number for display.
 *
 * Accepted inputs:
 * - Local:   "0244123456" or "0244 123 456" -> "024 412 3456"
 * - International: "+233244123456" or "233244123456" -> "+233 24 412 3456"
 *
 * Unrecognised input is returned trimmed, unchanged.
 */
export function formatGhanaPhone(phone: string): string {
  const digits = phone.replace(NON_DIGITS, "");

  if (/^0\d{9}$/.test(digits)) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  if (/^233\d{9}$/.test(digits)) {
    const local = digits.slice(3);
    return `+233 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }

  return phone.trim();
}

/**
 * Normalize a Ghanaian phone number to the local "0244123456" form so values
 * entered as "0244 123 456", "+233244123456" or "233244123456" compare equal.
 * Returns only digits; unrecognised input is stripped of non-digits.
 */
export function normalizeGhanaPhone(phone: string): string {
  const digits = phone.replace(NON_DIGITS, "");
  if (/^233\d{9}$/.test(digits)) {
    return `0${digits.slice(3)}`;
  }
  if (/^0\d{9}$/.test(digits)) {
    return digits;
  }
  return digits;
}