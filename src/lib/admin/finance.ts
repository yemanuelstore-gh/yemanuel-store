import { createClient } from "@/lib/supabase/server";
import { formatGHS } from "@/lib/format";

/**
 * Finance data layer.
 *
 * Financial Account = where money is held (bank, mobile money, cash).
 * Transaction = movement of money in or out of an account.
 *
 * Balances are derived on the server from `opening_balance` plus the signed
 * ledger transactions — they are never stored as a running balance. Reads go
 * through the authenticated client so RLS applies per query.
 */

export type FinancialAccountType = "bank" | "mobile_money" | "cash";

export type FinancialAccount = {
  id: string;
  account_name: string;
  account_type: FinancialAccountType;
  institution: string | null;
  account_number: string | null;
  currency: string;
  status: "active" | "inactive";
  opening_balance: number;
  balance: number;
  notes: string | null;
  created_at: string;
};

export type FinancialTransaction = {
  id: string;
  account_id: string;
  transaction_type: string;
  amount: number;
  reference: string | null;
  description: string | null;
  occurred_at: string;
};

export type FinancialAccountSummary = {
  total_accounts: number;
  active_accounts: number;
  by_type: Record<FinancialAccountType, { count: number; balance: number }>;
  total_balance: number;
};

export type FinanceClient = Awaited<ReturnType<typeof createClient>>;

export const ACCOUNT_TYPES: FinancialAccountType[] = [
  "bank",
  "mobile_money",
  "cash",
];

/**
 * Direction implied by a ledger transaction type. Amounts are stored positive
 * in the ledger; the sign is applied here.
 */
export const TRANSACTION_DIRECTION: Record<string, "in" | "out"> = {
  customer_payment: "in",
  refund: "out",
  supplier_payment: "out",
  expense: "out",
  transfer_in: "in",
  transfer_out: "out",
  opening_balance: "in",
};

/**
 * Mask a sensitive account or wallet identifier for display, e.g.
 * "0123456789" -> "****6789". Short values never leak their length or content.
 */
export function maskAccountIdentifier(
  identifier: string | null | undefined,
): string | null {
  if (!identifier) return null;
  const value = identifier.trim();
  if (value.length === 0) return null;
  if (value.length <= 4) return "****";
  return `****${value.slice(-4)}`;
}

const round = (value: number): number =>
  Number.isFinite(value) ? Number(value.toFixed(2)) : 0;

/**
 * Format an account balance. The ERP is GHS-first; non-GHS currencies render
 * as `CODE amount` so the stored currency is always explicit.
 */
export function formatAccountAmount(currency: string, amount: number): string {
  if (currency === "GHS") return formatGHS(amount);
  return `${currency} ${Number.isFinite(amount) ? amount.toFixed(2) : "—"}`;
}

function signedAmount(transaction: { transaction_type: string; amount: number }): number {
  const direction = TRANSACTION_DIRECTION[transaction.transaction_type];
  return direction === "out" ? -Number(transaction.amount || 0) : Number(transaction.amount || 0);
}

type AccountRow = {
  id: string;
  account_name: string;
  account_type: FinancialAccountType;
  institution: string | null;
  account_number: string | null;
  currency: string;
  status: "active" | "inactive";
  opening_balance: number;
  notes: string | null;
  created_at: string;
};

type TransactionRow = {
  id: string;
  account_id: string;
  transaction_type: string;
  amount: number;
  reference: string | null;
  description: string | null;
  occurred_at: string;
};

export function toFinancialAccount(
  row: AccountRow,
  transactions: TransactionRow[],
): FinancialAccount {
  const delta = transactions
    .filter((transaction) => transaction.account_id === row.id)
    .reduce((sum, transaction) => sum + signedAmount(transaction), 0);
  return {
    ...row,
    opening_balance: round(Number(row.opening_balance || 0)),
    balance: round(Number(row.opening_balance || 0) + delta),
  };
}

/**
 * Every financial account with its derived current balance.
 */
export async function listFinancialAccounts(
  client: FinanceClient,
): Promise<FinancialAccount[]> {
  const { data: accountRows, error: accountError } = await client
    .from("financial_accounts")
    .select(
      "id, account_name, account_type, institution, account_number, currency, status, opening_balance, notes, created_at",
    )
    .order("account_name", { ascending: true });
  if (accountError) throw accountError;

  const rows = (accountRows ?? []) as unknown as AccountRow[];
  if (rows.length === 0) return [];

  const { data: transactionRows, error: transactionError } = await client
    .from("financial_account_transactions")
    .select("id, account_id, transaction_type, amount, reference, description, occurred_at");
  if (transactionError) throw transactionError;

  const transactions = (transactionRows ?? []) as unknown as TransactionRow[];
  return rows.map((row) => toFinancialAccount(row, transactions));
}

/**
 * KPI summary over a set of accounts: totals per account type plus the
 * aggregate available balance. All balances are derived from real data.
 */
export function summarizeAccounts(accounts: FinancialAccount[]): FinancialAccountSummary {
  const byType: FinancialAccountSummary["by_type"] = {
    bank: { count: 0, balance: 0 },
    mobile_money: { count: 0, balance: 0 },
    cash: { count: 0, balance: 0 },
  };

  for (const account of accounts) {
    const bucket = byType[account.account_type];
    bucket.count += 1;
    bucket.balance = round(bucket.balance + account.balance);
  }

  return {
    total_accounts: accounts.length,
    active_accounts: accounts.filter((account) => account.status === "active").length,
    by_type: byType,
    total_balance: round(
      byType.bank.balance + byType.mobile_money.balance + byType.cash.balance,
    ),
  };
}

/**
 * A single account with its derived balance and recent ledger transactions.
 */
export async function getFinancialAccount(
  client: FinanceClient,
  id: string,
): Promise<{ account: FinancialAccount; transactions: FinancialTransaction[] } | null> {
  const { data: accountRow, error: accountError } = await client
    .from("financial_accounts")
    .select(
      "id, account_name, account_type, institution, account_number, currency, status, opening_balance, notes, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (accountError) throw accountError;
  if (!accountRow) return null;

  const row = accountRow as unknown as AccountRow;

  const { data: transactionRows, error: transactionError } = await client
    .from("financial_account_transactions")
    .select("id, account_id, transaction_type, amount, reference, description, occurred_at")
    .eq("account_id", id)
    .order("occurred_at", { ascending: false })
    .limit(20);
  if (transactionError) throw transactionError;

  const transactions = (transactionRows ?? []) as unknown as TransactionRow[];
  return {
    account: toFinancialAccount(row, transactions),
    transactions: transactions.map((transaction) => ({ ...transaction })),
  };
}