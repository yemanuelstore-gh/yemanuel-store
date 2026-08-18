import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Bank accounts
// ---------------------------------------------------------------------------

export type BankAccountRow = {
  id: string;
  accountCode: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  openingBalance: number;
  openingDate: string | null;
  balance: number;
  status: string;
};

export async function getBankAccounts({
  q,
  status,
  accountType,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  status?: string;
  accountType?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ accounts: BankAccountRow[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("bank_accounts")
    .select(
      "id, account_code, account_name, bank_name, account_number, account_type, currency, opening_balance, opening_date, status",
      { count: "exact" },
    );

  if (q) {
    query = query.or(
      `account_name.ilike.%${q}%,account_code.ilike.%${q}%,bank_name.ilike.%${q}%,account_number.ilike.%${q}%`,
    );
  }
  if (status) query = query.eq("status", status);
  if (accountType) query = query.eq("account_type", accountType);

  const { data, count } = await query
    .order("account_name", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    account_code: string;
    account_name: string;
    bank_name: string;
    account_number: string;
    account_type: string;
    currency: string;
    opening_balance: number;
    opening_date: string | null;
    status: string;
  }[];

  const balances = await fetchAccountBalances("bank");

  return {
    accounts: rows.map((row) => ({
      id: row.id,
      accountCode: row.account_code,
      accountName: row.account_name,
      bankName: row.bank_name,
      accountNumber: row.account_number,
      accountType: row.account_type,
      currency: row.currency,
      openingBalance: Number(row.opening_balance),
      openingDate: row.opening_date,
      balance: balances.get(row.id)?.balance ?? Number(row.opening_balance),
      status: row.status,
    })),
    total: count ?? 0,
  };
}

export type AccountSummary = {
  total: number;
  active: number;
  inactive: number;
  totalOpeningBalance: number;
  totalBalance: number;
};

async function getAccountSummary(
  table: "bank_accounts" | "mobile_money_accounts",
): Promise<AccountSummary> {
  const client = await createClient();
  const { data } = await client.from(table).select("id, status, opening_balance");
  const rows = (data ?? []) as unknown as {
    id: string;
    status: string;
    opening_balance: number;
  }[];
  const balances = await fetchAccountBalances(
    table === "bank_accounts" ? "bank" : "mobile_money",
  );
  return {
    total: rows.length,
    active: rows.filter((row) => row.status === "active").length,
    inactive: rows.filter((row) => row.status === "inactive").length,
    totalOpeningBalance: rows.reduce(
      (sum, row) =>
        sum + (Number.isFinite(Number(row.opening_balance)) ? Number(row.opening_balance) : 0),
      0,
    ),
    totalBalance: rows.reduce(
      (sum, row) => sum + (balances.get(row.id)?.balance ?? Number(row.opening_balance)),
      0,
    ),
  };
}

export async function getBankAccountSummary(): Promise<AccountSummary> {
  return getAccountSummary("bank_accounts");
}

export type BankAccountDetail = {
  id: string;
  accountCode: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  branchName: string | null;
  currency: string;
  openingBalance: number;
  openingDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
  updatedByName: string | null;
};

export async function getBankAccountById(id: string): Promise<BankAccountDetail | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("bank_accounts")
    .select(
      "id, account_code, account_name, bank_name, account_number, account_type, branch_name, currency, opening_balance, opening_date, status, notes, created_at, updated_at, created_by, updated_by",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    account_code: string;
    account_name: string;
    bank_name: string;
    account_number: string;
    account_type: string;
    branch_name: string | null;
    currency: string;
    opening_balance: number;
    opening_date: string | null;
    status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    updated_by: string | null;
  };

  const names = await resolveUserNames(
    [row.created_by, row.updated_by].filter((id): id is string => id !== null),
  );

  return {
    id: row.id,
    accountCode: row.account_code,
    accountName: row.account_name,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountType: row.account_type,
    branchName: row.branch_name,
    currency: row.currency,
    openingBalance: Number(row.opening_balance),
    openingDate: row.opening_date,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByName: row.created_by ? (names.get(row.created_by) ?? null) : null,
    updatedByName: row.updated_by ? (names.get(row.updated_by) ?? null) : null,
  };
}

// ---------------------------------------------------------------------------
// Mobile money accounts
// ---------------------------------------------------------------------------

export type MobileMoneyAccountRow = {
  id: string;
  accountCode: string;
  accountName: string;
  provider: string;
  mobileNumber: string;
  accountType: string;
  currency: string;
  openingBalance: number;
  openingDate: string | null;
  balance: number;
  status: string;
};

export async function getMobileMoneyAccounts({
  q,
  status,
  provider,
  accountType,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  status?: string;
  provider?: string;
  accountType?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ accounts: MobileMoneyAccountRow[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("mobile_money_accounts")
    .select(
      "id, account_code, account_name, provider, mobile_number, account_type, currency, opening_balance, opening_date, status",
      { count: "exact" },
    );

  if (q) {
    query = query.or(
      `account_name.ilike.%${q}%,account_code.ilike.%${q}%,provider.ilike.%${q}%,mobile_number.ilike.%${q}%`,
    );
  }
  if (status) query = query.eq("status", status);
  if (provider) query = query.eq("provider", provider);
  if (accountType) query = query.eq("account_type", accountType);

  const { data, count } = await query
    .order("account_name", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    account_code: string;
    account_name: string;
    provider: string;
    mobile_number: string;
    account_type: string;
    currency: string;
    opening_balance: number;
    opening_date: string | null;
    status: string;
  }[];

  const balances = await fetchAccountBalances("mobile_money");

  return {
    accounts: rows.map((row) => ({
      id: row.id,
      accountCode: row.account_code,
      accountName: row.account_name,
      provider: row.provider,
      mobileNumber: row.mobile_number,
      accountType: row.account_type,
      currency: row.currency,
      openingBalance: Number(row.opening_balance),
      openingDate: row.opening_date,
      balance: balances.get(row.id)?.balance ?? Number(row.opening_balance),
      status: row.status,
    })),
    total: count ?? 0,
  };
}

export type MobileMoneyAccountSummary = AccountSummary & { providers: number };

export async function getMobileMoneyAccountSummary(): Promise<MobileMoneyAccountSummary> {
  const summary = await getAccountSummary("mobile_money_accounts");
  const client = await createClient();
  const { data } = await client.from("mobile_money_accounts").select("provider");
  const providers = new Set((data ?? []).map((row) => (row as { provider: string }).provider));
  return { ...summary, providers: providers.size };
}

export type MobileMoneyAccountDetail = {
  id: string;
  accountCode: string;
  accountName: string;
  provider: string;
  mobileNumber: string;
  accountType: string;
  currency: string;
  openingBalance: number;
  openingDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
  updatedByName: string | null;
};

export async function getMobileMoneyAccountById(id: string): Promise<MobileMoneyAccountDetail | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("mobile_money_accounts")
    .select(
      "id, account_code, account_name, provider, mobile_number, account_type, currency, opening_balance, opening_date, status, notes, created_at, updated_at, created_by, updated_by",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    account_code: string;
    account_name: string;
    provider: string;
    mobile_number: string;
    account_type: string;
    currency: string;
    opening_balance: number;
    opening_date: string | null;
    status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    updated_by: string | null;
  };

  const names = await resolveUserNames(
    [row.created_by, row.updated_by].filter((id): id is string => id !== null),
  );

  return {
    id: row.id,
    accountCode: row.account_code,
    accountName: row.account_name,
    provider: row.provider,
    mobileNumber: row.mobile_number,
    accountType: row.account_type,
    currency: row.currency,
    openingBalance: Number(row.opening_balance),
    openingDate: row.opening_date,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByName: row.created_by ? (names.get(row.created_by) ?? null) : null,
    updatedByName: row.updated_by ? (names.get(row.updated_by) ?? null) : null,
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export type AccountBalance = {
  balance: number;
  totalCredits: number;
  totalDebits: number;
  transactionCount: number;
};

/**
 * Current balances for every account of the given kind, computed from the
 * account transaction ledger (opening balance plus net posted transactions).
 */
async function fetchAccountBalances(
  kind: "bank" | "mobile_money",
): Promise<Map<string, AccountBalance>> {
  const client = await createClient();
  const { data } = await client.schema("app").rpc("finance_account_balances", { p_kind: kind });
  const rows = (data ?? []) as unknown as {
    account_id: string;
    balance: number | string;
    total_credits: number | string;
    total_debits: number | string;
    transaction_count: number | string;
  }[];
  return new Map(
    rows.map((row) => [
      row.account_id,
      {
        balance: Number(row.balance),
        totalCredits: Number(row.total_credits),
        totalDebits: Number(row.total_debits),
        transactionCount: Number(row.transaction_count),
      },
    ]),
  );
}

export type AccountTransactionRow = {
  id: string;
  transactionCode: string;
  transactionType: string;
  amount: number;
  direction: "in" | "out";
  counterpartyName: string | null;
  counterpartyCode: string | null;
  counterpartyKind: string | null;
  reference: string | null;
  note: string | null;
  createdAt: string;
};

export type AccountTransactionResult = {
  balance: number;
  totalCredits: number;
  totalDebits: number;
  total: number;
  rows: AccountTransactionRow[];
};

export async function getAccountTransactions({
  kind,
  accountId,
  q,
  page = 1,
  pageSize = 20,
}: {
  kind: "bank" | "mobile_money";
  accountId: string;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<AccountTransactionResult> {
  const client = await createClient();
  const { data } = await client.schema("app").rpc("finance_account_transactions", {
    p_kind: kind,
    p_account_id: accountId,
    p_q: q?.trim() || null,
    p_page: page,
    p_page_size: pageSize,
  });
  const payload = (data ?? {}) as {
    balance?: number | string;
    total_credits?: number | string;
    total_debits?: number | string;
    total?: number | string;
    rows?: {
      id: string;
      transaction_number: string | null;
      transaction_type: string;
      amount: number | string;
      direction: "in" | "out";
      reference: string | null;
      description: string | null;
      status: string | null;
      transaction_date: string | null;
      created_at: string;
    }[];
  };

  return {
    balance: Number(payload.balance ?? 0),
    totalCredits: Number(payload.total_credits ?? 0),
    totalDebits: Number(payload.total_debits ?? 0),
    total: Number(payload.total ?? 0),
    rows: (payload.rows ?? []).map((row) => ({
      id: row.id,
      transactionCode: row.transaction_number ?? "",
      transactionType: row.transaction_type,
      amount: Number(row.amount),
      direction: row.direction,
      counterpartyName: null,
      counterpartyCode: null,
      counterpartyKind: null,
      reference: row.reference,
      note: row.description,
      createdAt: row.created_at,
    })),
  };
}

export type AccountTarget = {
  id: string;
  kind: "bank" | "mobile_money";
  name: string;
  code: string;
};

/**
 * Active accounts that can receive a transfer from the given account.
 * Both bank and mobile money accounts are offered so cross-type transfers
 * (e.g. bank -> MTN MoMo) are supported.
 */
export async function getAccountTransactionTargets(
  kind: "bank" | "mobile_money",
  excludeId: string,
): Promise<AccountTarget[]> {
  const client = await createClient();
  const [bank, mobileMoney] = await Promise.all([
    client
      .from("bank_accounts")
      .select("id, account_name, account_code")
      .eq("status", "active")
      .neq("id", excludeId)
      .order("account_name", { ascending: true }),
    client
      .from("mobile_money_accounts")
      .select("id, account_name, account_code")
      .eq("status", "active")
      .neq("id", excludeId)
      .order("account_name", { ascending: true }),
  ]);
  const bankRows = (bank.data ?? []) as unknown as {
    id: string;
    account_name: string;
    account_code: string;
  }[];
  const mobileMoneyRows = (mobileMoney.data ?? []) as unknown as {
    id: string;
    account_name: string;
    account_code: string;
  }[];
  return [
    ...bankRows.map((row) => ({
      id: row.id,
      kind: "bank" as const,
      name: row.account_name,
      code: row.account_code,
    })),
    ...mobileMoneyRows.map((row) => ({
      id: row.id,
      kind: "mobile_money" as const,
      name: row.account_name,
      code: row.account_code,
    })),
  ];
}

async function resolveUserNames(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  if (!isServiceConfigured()) return new Map();
  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);
  return new Map(
    ((data ?? []) as { id: string; full_name: string | null }[]).map((row) => [
      row.id,
      row.full_name ?? "",
    ]),
  );
}