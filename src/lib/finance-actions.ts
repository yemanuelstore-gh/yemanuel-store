"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidGhanaPhone } from "@/lib/validation";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import {
  ACCOUNT_TYPES,
  type FinancialAccountType,
} from "@/lib/admin/finance";

export type FinancialAccountActionResult = {
  ok: boolean;
  message: string;
};

const MAX_BALANCE = 999_999_999_999.99;

function parseCurrency(value: FormDataEntryValue | null): string {
  const currency = String(value ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : "GHS";
}

function parseBalance(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (raw === "") return 0;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_BALANCE) {
    return null;
  }
  return Math.round(amount * 100) / 100;
}

/**
 * Create a bank, mobile-money or cash account.
 *
 * The authenticated client performs the insert so RLS applies; the user must
 * hold `finance.create` (checked server-side, then enforced by the database).
 */
export async function createFinancialAccountAction(
  _previousState: FinancialAccountActionResult,
  formData: FormData,
): Promise<FinancialAccountActionResult> {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.finance.create)) {
    return {
      ok: false,
      message: "You do not have permission to add financial accounts.",
    };
  }

  const accountName = String(formData.get("accountName") ?? "").trim();
  const rawType = String(formData.get("accountType") ?? "").trim();
  const institution = String(formData.get("institution") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!ACCOUNT_TYPES.includes(rawType as FinancialAccountType)) {
    return {
      ok: false,
      message: "Please choose a valid account type.",
    };
  }
  const accountType = rawType as FinancialAccountType;

  if (accountName.length < 2 || accountName.length > 80) {
    return {
      ok: false,
      message: "Please enter the account name (2–80 characters).",
    };
  }

  if (accountType !== "cash") {
    if (institution.length < 2 || institution.length > 80) {
      return {
        ok: false,
        message:
          accountType === "bank"
            ? "Please enter the bank name."
            : "Please enter the mobile-money network or provider.",
      };
    }
    if (accountType === "mobile_money") {
      if (!isValidGhanaPhone(accountNumber)) {
        return {
          ok: false,
          message:
            "Please enter a valid Ghana phone number for the wallet (e.g. 024 412 3456).",
        };
      }
    } else if (accountNumber.length < 4 || accountNumber.length > 34) {
      return {
        ok: false,
        message: "Please enter a valid bank account number.",
      };
    }
  }

  if (notes.length > 500) {
    return {
      ok: false,
      message: "Notes must be 500 characters or fewer.",
    };
  }

  const openingBalance = parseBalance(formData.get("openingBalance"));
  if (openingBalance === null) {
    return {
      ok: false,
      message: "Opening balance must be GH₵ 0 or a positive amount.",
    };
  }

  let client;
  try {
    client = await createClient();
  } catch {
    return {
      ok: false,
      message: "You need to be signed in to add an account.",
    };
  }

  const { error } = await client.from("financial_accounts").insert({
    account_name: accountName,
    account_type: accountType,
    institution: institution.length > 0 ? institution : null,
    account_number: accountNumber.length > 0 ? accountNumber : null,
    currency: parseCurrency(formData.get("currency")),
    opening_balance: openingBalance,
    notes: notes.length > 0 ? notes : null,
    status: "active",
  });

  if (error) {
    if (error.code === "42501") {
      return {
        ok: false,
        message: "You do not have permission to add financial accounts.",
      };
    }
    return {
      ok: false,
      message: "We could not add the account. Please try again.",
    };
  }

  revalidatePath("/admin/financial-accounts");
  return {
    ok: true,
    message: "Account added.",
  };
}