export function isValidFullName(value: unknown): boolean {
  return typeof value === "string" && value.trim().length >= 2;
}

export function isValidGhanaPhone(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const digits = value.replace(/\D/g, "");
  return /^(0\d{9}|233\d{9})$/.test(digits);
}

export function isValidEmail(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const email = value.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isNonEmpty(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}