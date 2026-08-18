"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/admin/ui";
import { writeAuditLog } from "@/lib/admin/audit";
import { nextDocumentNumber, parseAmount } from "@/lib/admin/doc-numbers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import {
  ACCOUNT_CURRENCIES,
  ACCOUNT_KINDS,
  ACCOUNT_STATUSES,
  ACCOUNT_TRANSACTION_TYPES,
  BANK_ACCOUNT_TYPES,
  MOBILE_MONEY_ACCOUNT_TYPES,
  MOBILE_MONEY_PROVIDERS,
} from "@/lib/admin/account-constants";
import { createClient } from "@/lib/supabase/server";
import { formatGHS, normalizeGhanaPhone } from "@/lib/format";

function message(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const text = String((error as { message: string }).message);
    if (text.includes("duplicate key")) {
      return "An account with the same code, number or mobile number already exists.";
    }
    if (text.includes("violates foreign key")) return "A selected reference does not exist.";
    return text;
  }
  return fallback;
}

function trimmed(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function optionalTrimmed(value: FormDataEntryValue | null): string | null {
  const text = trimmed(value);
  return text === "" ? null : text;
}

function parseOpeningBalance(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return 0;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount;
}

function isValidOption(value: FormDataEntryValue | null, allowed: readonly string[]): value is string {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function parseGhanaMobileNumber(value: FormDataEntryValue | null): string | null {
  const text = trimmed(value);
  if (text === "") return null;
  const normalized = normalizeGhanaPhone(text);
  return /^0\d{9}$/.test(normalized) ? normalized : null;
}

function parseDate(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
  const parsed = new Date(`${value.trim()}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return value.trim();
}

// ---------------------------------------------------------------------------
// Bank accounts
// ---------------------------------------------------------------------------

export async function createBankAccountAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.expenses.create)) {
    return { ok: false, message: "You do not have permission to create bank accounts." };
  }

  const accountName = trimmed(formData.get("accountName"));
  const bankName = trimmed(formData.get("bankName"));
  const accountNumber = trimmed(formData.get("accountNumber"));
  const branchName = optionalTrimmed(formData.get("branchName"));
  const notes = optionalTrimmed(formData.get("notes"));

  if (accountName.length < 2) {
    return { ok: false, message: "Enter an account name of at least 2 characters." };
  }
  if (bankName.length < 2) {
    return { ok: false, message: "Enter a bank name of at least 2 characters." };
  }
  if (accountNumber.length < 4) {
    return { ok: false, message: "Enter a valid account number." };
  }
  if (!isValidOption(formData.get("accountType"), BANK_ACCOUNT_TYPES)) {
    return { ok: false, message: "Choose a valid account type." };
  }
  if (!isValidOption(formData.get("currency"), ACCOUNT_CURRENCIES)) {
    return { ok: false, message: "Choose a valid currency." };
  }
  const openingBalance = parseOpeningBalance(formData.get("openingBalance"));
  if (openingBalance === null) {
    return { ok: false, message: "Opening balance must be zero or more." };
  }
  if (!isValidOption(formData.get("status"), ACCOUNT_STATUSES)) {
    return { ok: false, message: "Choose a valid status." };
  }
  const status = formData.get("status") as string;
  const openingDate = parseDate(formData.get("openingDate"));
  if (openingDate === null) {
    return { ok: false, message: "Enter a valid opening date." };
  }

  const client = await createClient();
  const { data: existing } = await client
    .from("bank_accounts")
    .select("id")
    .eq("account_number", accountNumber)
    .eq("status", "active")
    .maybeSingle();
  if (existing) {
    return { ok: false, message: "An active account with this account number already exists." };
  }

  const accountCode = await nextDocumentNumber("BA");
  const { data, error } = await client
    .from("bank_accounts")
    .insert({
      account_code: accountCode,
      account_name: accountName,
      bank_name: bankName,
      account_number: accountNumber,
      account_type: formData.get("accountType"),
      branch_name: branchName,
      currency: formData.get("currency"),
      opening_balance: openingBalance,
      opening_date: openingDate,
      status,
      notes,
      created_by: session.userId,
      updated_by: session.userId,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not create the bank account.") };
  }

  await writeAuditLog(session.userId, "create", "bank_account", data.id, {
    accountCode,
    accountType: formData.get("accountType"),
    status,
  });

  redirect(`/admin/bank-accounts/${data.id}`);
}

export async function updateBankAccountAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.expenses.update)) {
    return { ok: false, message: "You do not have permission to edit bank accounts." };
  }

  const accountId = formData.get("accountId");
  if (typeof accountId !== "string" || accountId === "") {
    return { ok: false, message: "Missing account." };
  }

  const accountName = trimmed(formData.get("accountName"));
  const bankName = trimmed(formData.get("bankName"));
  const accountNumber = trimmed(formData.get("accountNumber"));
  const branchName = optionalTrimmed(formData.get("branchName"));
  const notes = optionalTrimmed(formData.get("notes"));

  if (accountName.length < 2) {
    return { ok: false, message: "Enter an account name of at least 2 characters." };
  }
  if (bankName.length < 2) {
    return { ok: false, message: "Enter a bank name of at least 2 characters." };
  }
  if (accountNumber.length < 4) {
    return { ok: false, message: "Enter a valid account number." };
  }
  if (!isValidOption(formData.get("accountType"), BANK_ACCOUNT_TYPES)) {
    return { ok: false, message: "Choose a valid account type." };
  }
  if (!isValidOption(formData.get("currency"), ACCOUNT_CURRENCIES)) {
    return { ok: false, message: "Choose a valid currency." };
  }
  const openingBalance = parseOpeningBalance(formData.get("openingBalance"));
  if (openingBalance === null) {
    return { ok: false, message: "Opening balance must be zero or more." };
  }
  if (!isValidOption(formData.get("status"), ACCOUNT_STATUSES)) {
    return { ok: false, message: "Choose a valid status." };
  }
  const status = formData.get("status") as string;
  const openingDate = parseDate(formData.get("openingDate"));
  if (openingDate === null) {
    return { ok: false, message: "Enter a valid opening date." };
  }

  const client = await createClient();
  const { data: existing } = await client
    .from("bank_accounts")
    .select("id")
    .eq("account_number", accountNumber)
    .eq("status", "active")
    .neq("id", accountId)
    .maybeSingle();
  if (existing) {
    return { ok: false, message: "An active account with this account number already exists." };
  }

  const { error } = await client
    .from("bank_accounts")
    .update({
      account_name: accountName,
      bank_name: bankName,
      account_number: accountNumber,
      account_type: formData.get("accountType"),
      branch_name: branchName,
      currency: formData.get("currency"),
      opening_balance: openingBalance,
      opening_date: openingDate,
      status,
      notes,
      updated_by: session.userId,
    })
    .eq("id", accountId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the bank account.") };
  }

  await writeAuditLog(session.userId, "update", "bank_account", accountId, {
    accountType: formData.get("accountType"),
    status,
  });

  redirect(`/admin/bank-accounts/${accountId}`);
}

export async function setBankAccountStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.expenses.update)) {
    return { ok: false, message: "You do not have permission to change bank account status." };
  }

  const accountId = formData.get("accountId");
  const target = formData.get("status");
  if (typeof accountId !== "string" || accountId === "") {
    return { ok: false, message: "Missing account." };
  }
  if (target !== "active" && target !== "inactive") {
    return { ok: false, message: "Invalid status." };
  }

  const client = await createClient();
  const { data: current, error: fetchError } = await client
    .from("bank_accounts")
    .select("id, account_code, status")
    .eq("id", accountId)
    .maybeSingle();
  if (fetchError || !current) {
    return { ok: false, message: "Account not found." };
  }
  if (current.status === target) {
    return { ok: false, message: `The account is already ${target}.` };
  }

  const { error } = await client
    .from("bank_accounts")
    .update({ status: target, updated_by: session.userId })
    .eq("id", accountId);
  if (error) {
    return { ok: false, message: message(error, "Could not update the account status.") };
  }

  await writeAuditLog(
    session.userId,
    target === "active" ? "activate" : "deactivate",
    "bank_account",
    accountId,
    {
      accountCode: current.account_code,
      from: current.status,
      to: target,
    },
  );
  revalidatePath("/admin/bank-accounts");
  revalidatePath(`/admin/bank-accounts/${accountId}`);
  return { ok: true, message: target === "active" ? "Account activated." : "Account deactivated." };
}

// ---------------------------------------------------------------------------
// Mobile money accounts
// ---------------------------------------------------------------------------

export async function createMobileMoneyAccountAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.expenses.create)) {
    return { ok: false, message: "You do not have permission to create mobile money accounts." };
  }

  const accountName = trimmed(formData.get("accountName"));
  const mobileNumber = parseGhanaMobileNumber(formData.get("mobileNumber"));
  const notes = optionalTrimmed(formData.get("notes"));

  if (accountName.length < 2) {
    return { ok: false, message: "Enter an account name of at least 2 characters." };
  }
  if (!isValidOption(formData.get("provider"), MOBILE_MONEY_PROVIDERS)) {
    return { ok: false, message: "Choose a valid provider." };
  }
  if (mobileNumber === null) {
    return { ok: false, message: "Enter a valid Ghana mobile number (e.g. 0244 123 456)." };
  }
  if (!isValidOption(formData.get("accountType"), MOBILE_MONEY_ACCOUNT_TYPES)) {
    return { ok: false, message: "Choose a valid account type." };
  }
  if (!isValidOption(formData.get("currency"), ACCOUNT_CURRENCIES)) {
    return { ok: false, message: "Choose a valid currency." };
  }
  const openingBalance = parseOpeningBalance(formData.get("openingBalance"));
  if (openingBalance === null) {
    return { ok: false, message: "Opening balance must be zero or more." };
  }
  if (!isValidOption(formData.get("status"), ACCOUNT_STATUSES)) {
    return { ok: false, message: "Choose a valid status." };
  }
  const status = formData.get("status") as string;
  const openingDate = parseDate(formData.get("openingDate"));
  if (openingDate === null) {
    return { ok: false, message: "Enter a valid opening date." };
  }

  const client = await createClient();
  const { data: existing } = await client
    .from("mobile_money_accounts")
    .select("id")
    .eq("mobile_number", mobileNumber)
    .eq("status", "active")
    .maybeSingle();
  if (existing) {
    return { ok: false, message: "An active account with this mobile number already exists." };
  }

  const accountCode = await nextDocumentNumber("MM");
  const { data, error } = await client
    .from("mobile_money_accounts")
    .insert({
      account_code: accountCode,
      account_name: accountName,
      provider: formData.get("provider"),
      mobile_number: mobileNumber,
      account_type: formData.get("accountType"),
      currency: formData.get("currency"),
      opening_balance: openingBalance,
      opening_date: openingDate,
      status,
      notes,
      created_by: session.userId,
      updated_by: session.userId,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not create the mobile money account.") };
  }

  await writeAuditLog(session.userId, "create", "mobile_money_account", data.id, {
    accountCode,
    provider: formData.get("provider"),
    accountType: formData.get("accountType"),
    status,
  });

  redirect(`/admin/mobile-money/${data.id}`);
}

export async function updateMobileMoneyAccountAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.expenses.update)) {
    return { ok: false, message: "You do not have permission to edit mobile money accounts." };
  }

  const accountId = formData.get("accountId");
  if (typeof accountId !== "string" || accountId === "") {
    return { ok: false, message: "Missing account." };
  }

  const accountName = trimmed(formData.get("accountName"));
  const mobileNumber = parseGhanaMobileNumber(formData.get("mobileNumber"));
  const notes = optionalTrimmed(formData.get("notes"));

  if (accountName.length < 2) {
    return { ok: false, message: "Enter an account name of at least 2 characters." };
  }
  if (!isValidOption(formData.get("provider"), MOBILE_MONEY_PROVIDERS)) {
    return { ok: false, message: "Choose a valid provider." };
  }
  if (mobileNumber === null) {
    return { ok: false, message: "Enter a valid Ghana mobile number (e.g. 0244 123 456)." };
  }
  if (!isValidOption(formData.get("accountType"), MOBILE_MONEY_ACCOUNT_TYPES)) {
    return { ok: false, message: "Choose a valid account type." };
  }
  if (!isValidOption(formData.get("currency"), ACCOUNT_CURRENCIES)) {
    return { ok: false, message: "Choose a valid currency." };
  }
  const openingBalance = parseOpeningBalance(formData.get("openingBalance"));
  if (openingBalance === null) {
    return { ok: false, message: "Opening balance must be zero or more." };
  }
  if (!isValidOption(formData.get("status"), ACCOUNT_STATUSES)) {
    return { ok: false, message: "Choose a valid status." };
  }
  const status = formData.get("status") as string;
  const openingDate = parseDate(formData.get("openingDate"));
  if (openingDate === null) {
    return { ok: false, message: "Enter a valid opening date." };
  }

  const client = await createClient();
  const { data: existing } = await client
    .from("mobile_money_accounts")
    .select("id")
    .eq("mobile_number", mobileNumber)
    .eq("status", "active")
    .neq("id", accountId)
    .maybeSingle();
  if (existing) {
    return { ok: false, message: "An active account with this mobile number already exists." };
  }

  const { error } = await client
    .from("mobile_money_accounts")
    .update({
      account_name: accountName,
      provider: formData.get("provider"),
      mobile_number: mobileNumber,
      account_type: formData.get("accountType"),
      currency: formData.get("currency"),
      opening_balance: openingBalance,
      opening_date: openingDate,
      status,
      notes,
      updated_by: session.userId,
    })
    .eq("id", accountId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the mobile money account.") };
  }

  await writeAuditLog(session.userId, "update", "mobile_money_account", accountId, {
    provider: formData.get("provider"),
    accountType: formData.get("accountType"),
    status,
  });

  redirect(`/admin/mobile-money/${accountId}`);
}

export async function setMobileMoneyAccountStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.expenses.update)) {
    return { ok: false, message: "You do not have permission to change mobile money account status." };
  }

  const accountId = formData.get("accountId");
  const target = formData.get("status");
  if (typeof accountId !== "string" || accountId === "") {
    return { ok: false, message: "Missing account." };
  }
  if (target !== "active" && target !== "inactive") {
    return { ok: false, message: "Invalid status." };
  }

  const client = await createClient();
  const { data: current, error: fetchError } = await client
    .from("mobile_money_accounts")
    .select("id, account_code, provider, status")
    .eq("id", accountId)
    .maybeSingle();
  if (fetchError || !current) {
    return { ok: false, message: "Account not found." };
  }
  if (current.status === target) {
    return { ok: false, message: `The account is already ${target}.` };
  }

  const { error } = await client
    .from("mobile_money_accounts")
    .update({ status: target, updated_by: session.userId })
    .eq("id", accountId);
  if (error) {
    return { ok: false, message: message(error, "Could not update the account status.") };
  }

  await writeAuditLog(
    session.userId,
    target === "active" ? "activate" : "deactivate",
    "mobile_money_account",
    accountId,
    {
      accountCode: current.account_code,
      provider: current.provider,
      from: current.status,
      to: target,
    },
  );
  revalidatePath("/admin/mobile-money");
  revalidatePath(`/admin/mobile-money/${accountId}`);
  return { ok: true, message: target === "active" ? "Account activated." : "Account deactivated." };
}

// ---------------------------------------------------------------------------
// Account transactions
// ---------------------------------------------------------------------------

type AccountSide = {
  kind: "bank" | "mobile_money";
  id: string;
};

const ACCOUNT_TABLES: Record<"bank" | "mobile_money", "bank_accounts" | "mobile_money_accounts"> = {
  bank: "bank_accounts",
  mobile_money: "mobile_money_accounts",
};

async function findActiveAccount(
  side: AccountSide,
): Promise<{ id: string; accountName: string; accountCode: string } | null> {
  const client = await createClient();
  const { data } = await client
    .from(ACCOUNT_TABLES[side.kind])
    .select("id, account_name, account_code, status")
    .eq("id", side.id)
    .maybeSingle();
  if (!data || (data as { status: string }).status !== "active") return null;
  const row = data as unknown as { id: string; account_name: string; account_code: string };
  return { id: row.id, accountName: row.account_name, accountCode: row.account_code };
}

/**
 * Post a deposit, withdrawal or transfer on a bank or mobile money account.
 * The ledger row is inserted under the caller's session so RLS (expenses.*)
 * applies. Transfers debit the source account and credit the target in a
 * single row; balances are always derived from the ledger.
 */
export async function postAccountTransactionAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.expenses.create)) {
    return { ok: false, message: "You do not have permission to post transactions." };
  }

  const accountKind = formData.get("accountKind");
  const accountId = formData.get("accountId");
  const transactionType = formData.get("transactionType");
  const amount = parseAmount(formData.get("amount"));
  const reference = optionalTrimmed(formData.get("reference"));
  const note = optionalTrimmed(formData.get("note"));

  if (!isValidOption(accountKind, ACCOUNT_KINDS)) {
    return { ok: false, message: "Choose a valid account kind." };
  }
  if (typeof accountId !== "string" || accountId === "") {
    return { ok: false, message: "Missing account." };
  }
  if (!isValidOption(transactionType, ACCOUNT_TRANSACTION_TYPES)) {
    return { ok: false, message: "Choose a valid transaction type." };
  }
  if (amount === null || amount <= 0) {
    return { ok: false, message: "Enter a valid amount." };
  }
  if (reference !== null && reference.length > 120) {
    return { ok: false, message: "The reference must be 120 characters or fewer." };
  }
  if (note !== null && note.length > 500) {
    return { ok: false, message: "The note must be 500 characters or fewer." };
  }

  const kind = accountKind as "bank" | "mobile_money";
  const type = transactionType as (typeof ACCOUNT_TRANSACTION_TYPES)[number];

  let fromAccount: { id: string; accountName: string; accountCode: string } | null = null;
  let toAccount: { id: string; accountName: string; accountCode: string } | null = null;
  let targetKind: "bank" | "mobile_money" | null = null;

  if (type === "transfer") {
    const targetKindValue = formData.get("targetKind");
    const targetId = formData.get("targetId");
    if (!isValidOption(targetKindValue, ACCOUNT_KINDS)) {
      return { ok: false, message: "Choose a valid target account kind." };
    }
    if (typeof targetId !== "string" || targetId === "") {
      return { ok: false, message: "Choose the target account." };
    }
    if (targetId === accountId) {
      return { ok: false, message: "The target account must be different from the source." };
    }
    targetKind = targetKindValue as "bank" | "mobile_money";
    fromAccount = await findActiveAccount({ kind, id: accountId });
    toAccount = await findActiveAccount({ kind: targetKind, id: targetId });
    if (!fromAccount) {
      return { ok: false, message: "The source account does not exist or is inactive." };
    }
    if (!toAccount) {
      return { ok: false, message: "The target account does not exist or is inactive." };
    }
  } else {
    const account = await findActiveAccount({ kind, id: accountId });
    if (!account) {
      return { ok: false, message: "The account does not exist or is inactive." };
    }
    if (type === "deposit") toAccount = account;
    else fromAccount = account;
  }

  const client = await createClient();
  const transactionCode = await nextDocumentNumber("AT");
  const isTransfer = type === "transfer";
  const primaryAccount = isTransfer || type === "withdrawal" ? fromAccount : toAccount;
  const { data, error } = await client
    .from("account_transactions")
    .insert({
      transaction_number: transactionCode,
      transaction_type: type,
      amount,
      bank_account_id:
        primaryAccount && kind === "bank" ? primaryAccount.id : null,
      mobile_money_account_id:
        primaryAccount && kind === "mobile_money" ? primaryAccount.id : null,
      transfer_bank_account_id:
        isTransfer && targetKind === "bank" ? toAccount?.id ?? null : null,
      transfer_mobile_money_account_id:
        isTransfer && targetKind === "mobile_money" ? toAccount?.id ?? null : null,
      reference,
      description: note,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not post the transaction.") };
  }

  await writeAuditLog(session.userId, "create", "account_transaction", data.id, {
    transactionCode,
    transactionType: type,
    amount,
    accountKind: kind,
    fromAccountId: fromAccount?.id ?? null,
    toAccountId: toAccount?.id ?? null,
  });

  const modulePath = kind === "bank" ? "/admin/bank-accounts" : "/admin/mobile-money";
  revalidatePath(modulePath);
  revalidatePath(`${modulePath}/${accountId}`);
  if (toAccount && targetKind) {
    const targetModulePath =
      targetKind === "bank" ? "/admin/bank-accounts" : "/admin/mobile-money";
    revalidatePath(`${targetModulePath}/${toAccount.id}`);
  }

  return {
    ok: true,
    message: `${type === "deposit" ? "Deposit" : type === "withdrawal" ? "Withdrawal" : "Transfer"} of ${formatGHS(amount)} posted.`,
  };
}