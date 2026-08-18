/**
 * Pure constants and display helpers for the Finance account master records.
 * Safe to import from both server code and client components (no Supabase
 * or server-only imports).
 */

export const BANK_ACCOUNT_TYPES = ["current", "savings", "corporate", "other"] as const;
export type BankAccountType = (typeof BANK_ACCOUNT_TYPES)[number];

export const MOBILE_MONEY_ACCOUNT_TYPES = ["business", "merchant", "wallet", "other"] as const;
export type MobileMoneyAccountType = (typeof MOBILE_MONEY_ACCOUNT_TYPES)[number];

export const MOBILE_MONEY_PROVIDERS = [
  "mtn_momo",
  "telecel_cash",
  "airteltigo_money",
  "other",
] as const;
export type MobileMoneyProvider = (typeof MOBILE_MONEY_PROVIDERS)[number];

export const ACCOUNT_CURRENCIES = ["GHS", "USD", "GBP", "EUR"] as const;

export const ACCOUNT_STATUSES = ["active", "inactive"] as const;

export const ACCOUNT_TRANSACTION_TYPES = ["deposit", "withdrawal", "transfer"] as const;
export type AccountTransactionType = (typeof ACCOUNT_TRANSACTION_TYPES)[number];

export const ACCOUNT_KINDS = ["bank", "mobile_money"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

const BANK_ACCOUNT_TYPE_LABELS: Record<string, string> = {
  current: "Current",
  savings: "Savings",
  corporate: "Corporate",
  other: "Other",
};

const MOBILE_MONEY_TYPE_LABELS: Record<string, string> = {
  business: "Business",
  merchant: "Merchant",
  wallet: "Wallet",
  other: "Other",
};

const MOBILE_MONEY_PROVIDER_LABELS: Record<string, string> = {
  mtn_momo: "MTN MoMo",
  telecel_cash: "Telecel Cash",
  airteltigo_money: "AirtelTigo Money",
  other: "Other",
};

const ACCOUNT_TRANSACTION_TYPE_LABELS: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  transfer: "Transfer",
};

const ACCOUNT_KIND_LABELS: Record<string, string> = {
  bank: "Bank account",
  mobile_money: "Mobile money",
};

function fallbackLabel(value: string): string {
  return value.replaceAll("_", " ");
}

export function bankAccountTypeLabel(value: string): string {
  return BANK_ACCOUNT_TYPE_LABELS[value] ?? fallbackLabel(value);
}

export function mobileMoneyAccountTypeLabel(value: string): string {
  return MOBILE_MONEY_TYPE_LABELS[value] ?? fallbackLabel(value);
}

export function mobileMoneyProviderLabel(value: string): string {
  return MOBILE_MONEY_PROVIDER_LABELS[value] ?? fallbackLabel(value);
}

export function accountTransactionTypeLabel(value: string): string {
  return ACCOUNT_TRANSACTION_TYPE_LABELS[value] ?? fallbackLabel(value);
}

export function accountKindLabel(value: string): string {
  return ACCOUNT_KIND_LABELS[value] ?? fallbackLabel(value);
}

/**
 * Mask a bank account number for list views, e.g. "0123456789" -> "XXXX XXXX 6789".
 * Only the last four digits are exposed.
 */
export function maskAccountNumber(accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, "");
  if (digits.length <= 4) return "XXXX";
  return `XXXX XXXX ${digits.slice(-4)}`;
}