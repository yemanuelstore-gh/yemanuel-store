"use client";

import {
  ActionForm,
  Field,
  InlineSubmitForm,
  Select,
  TextArea,
  TextInput,
} from "@/components/admin/ui";
import {
  createBankAccountAction,
  createMobileMoneyAccountAction,
  setBankAccountStatusAction,
  setMobileMoneyAccountStatusAction,
  updateBankAccountAction,
  updateMobileMoneyAccountAction,
} from "@/lib/admin/account-actions";
import {
  ACCOUNT_CURRENCIES,
  BANK_ACCOUNT_TYPES,
  MOBILE_MONEY_ACCOUNT_TYPES,
  MOBILE_MONEY_PROVIDERS,
  bankAccountTypeLabel,
  mobileMoneyAccountTypeLabel,
  mobileMoneyProviderLabel,
} from "@/lib/admin/account-constants";

export type BankAccountFormInitial = {
  id: string;
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
};

export function BankAccountForm({
  initial,
  action,
}: {
  initial?: BankAccountFormInitial;
  action: "create" | "update";
}) {
  return (
    <ActionForm
      action={action === "create" ? createBankAccountAction : updateBankAccountAction}
      submitLabel={action === "create" ? "Create account" : "Save changes"}
      pendingLabel={action === "create" ? "Creating…" : "Saving…"}
      cancelHref={action === "create" ? "/admin/bank-accounts" : `/admin/bank-accounts/${initial?.id}`}
      className="max-w-2xl space-y-4"
    >
      {initial && <input type="hidden" name="accountId" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Account name" htmlFor="ba-name" required>
          <TextInput
            id="ba-name"
            name="accountName"
            required
            minLength={2}
            defaultValue={initial?.accountName}
          />
        </Field>
        <Field label="Bank name" htmlFor="ba-bank" required>
          <TextInput
            id="ba-bank"
            name="bankName"
            required
            minLength={2}
            defaultValue={initial?.bankName}
          />
        </Field>
        <Field label="Account number" htmlFor="ba-number" required>
          <TextInput
            id="ba-number"
            name="accountNumber"
            required
            minLength={4}
            defaultValue={initial?.accountNumber}
          />
        </Field>
        <Field label="Account type" htmlFor="ba-type">
          <Select id="ba-type" name="accountType" defaultValue={initial?.accountType ?? "current"}>
            {BANK_ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {bankAccountTypeLabel(type)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Branch" htmlFor="ba-branch">
          <TextInput id="ba-branch" name="branchName" defaultValue={initial?.branchName ?? ""} />
        </Field>
        <Field label="Currency" htmlFor="ba-currency">
          <Select id="ba-currency" name="currency" defaultValue={initial?.currency ?? "GHS"}>
            {ACCOUNT_CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Opening balance"
          htmlFor="ba-opening"
          hint="The account balance when balance tracking begins. Must be zero or more."
        >
          <TextInput
            id="ba-opening"
            name="openingBalance"
            type="number"
            min="0"
            step="0.01"
            defaultValue={initial !== undefined ? String(initial.openingBalance) : "0"}
          />
        </Field>
        <Field
          label="Opening Date"
          htmlFor="ba-opening-date"
          required
          hint="Actual date the account was opened."
        >
          <TextInput
            id="ba-opening-date"
            name="openingDate"
            type="date"
            required
            defaultValue={initial?.openingDate ?? ""}
          />
        </Field>
        <Field label="Status" htmlFor="ba-status" required>
          <Select id="ba-status" name="status" required defaultValue={initial?.status ?? "active"}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
      </div>
      <Field label="Notes" htmlFor="ba-notes">
        <TextArea id="ba-notes" name="notes" rows={3} defaultValue={initial?.notes ?? ""} />
      </Field>
    </ActionForm>
  );
}

export type MobileMoneyFormInitial = {
  id: string;
  accountName: string;
  provider: string;
  mobileNumber: string;
  accountType: string;
  currency: string;
  openingBalance: number;
  openingDate: string | null;
  status: string;
  notes: string | null;
};

export function MobileMoneyForm({
  initial,
  action,
}: {
  initial?: MobileMoneyFormInitial;
  action: "create" | "update";
}) {
  return (
    <ActionForm
      action={action === "create" ? createMobileMoneyAccountAction : updateMobileMoneyAccountAction}
      submitLabel={action === "create" ? "Create account" : "Save changes"}
      pendingLabel={action === "create" ? "Creating…" : "Saving…"}
      cancelHref={
        action === "create" ? "/admin/mobile-money" : `/admin/mobile-money/${initial?.id}`
      }
      className="max-w-2xl space-y-4"
    >
      {initial && <input type="hidden" name="accountId" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Account name" htmlFor="mm-name" required>
          <TextInput
            id="mm-name"
            name="accountName"
            required
            minLength={2}
            defaultValue={initial?.accountName}
          />
        </Field>
        <Field label="Provider" htmlFor="mm-provider" required>
          <Select
            id="mm-provider"
            name="provider"
            required
            defaultValue={initial?.provider ?? "mtn_momo"}
          >
            {MOBILE_MONEY_PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {mobileMoneyProviderLabel(provider)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Mobile number"
          htmlFor="mm-number"
          required
          hint="Ghana number, e.g. 0244 123 456 or +233 24 412 3456."
        >
          <TextInput
            id="mm-number"
            name="mobileNumber"
            required
            defaultValue={initial?.mobileNumber}
            placeholder="0244 123 456"
          />
        </Field>
        <Field label="Account type" htmlFor="mm-type">
          <Select
            id="mm-type"
            name="accountType"
            defaultValue={initial?.accountType ?? "business"}
          >
            {MOBILE_MONEY_ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {mobileMoneyAccountTypeLabel(type)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Currency" htmlFor="mm-currency">
          <Select id="mm-currency" name="currency" defaultValue={initial?.currency ?? "GHS"}>
            {ACCOUNT_CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Opening balance"
          htmlFor="mm-opening"
          hint="The account balance when balance tracking begins. Must be zero or more."
        >
          <TextInput
            id="mm-opening"
            name="openingBalance"
            type="number"
            min="0"
            step="0.01"
            defaultValue={initial !== undefined ? String(initial.openingBalance) : "0"}
          />
        </Field>
        <Field
          label="Opening Date"
          htmlFor="mm-opening-date"
          required
          hint="Actual date the account was opened."
        >
          <TextInput
            id="mm-opening-date"
            name="openingDate"
            type="date"
            required
            defaultValue={initial?.openingDate ?? ""}
          />
        </Field>
        <Field label="Status" htmlFor="mm-status" required>
          <Select id="mm-status" name="status" required defaultValue={initial?.status ?? "active"}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
      </div>
      <Field label="Notes" htmlFor="mm-notes">
        <TextArea id="mm-notes" name="notes" rows={3} defaultValue={initial?.notes ?? ""} />
      </Field>
    </ActionForm>
  );
}

export function BankAccountStatusForm({
  accountId,
  status,
}: {
  accountId: string;
  status: string;
}) {
  const activating = status !== "active";
  return (
    <InlineSubmitForm
      action={setBankAccountStatusAction}
      label={activating ? "Activate" : "Deactivate"}
      pendingLabel={activating ? "Activating…" : "Deactivating…"}
      variant={activating ? "primary" : "danger"}
    >
      <input type="hidden" name="accountId" value={accountId} />
      <input type="hidden" name="status" value={activating ? "active" : "inactive"} />
    </InlineSubmitForm>
  );
}

export function MobileMoneyAccountStatusForm({
  accountId,
  status,
}: {
  accountId: string;
  status: string;
}) {
  const activating = status !== "active";
  return (
    <InlineSubmitForm
      action={setMobileMoneyAccountStatusAction}
      label={activating ? "Activate" : "Deactivate"}
      pendingLabel={activating ? "Activating…" : "Deactivating…"}
      variant={activating ? "primary" : "danger"}
    >
      <input type="hidden" name="accountId" value={accountId} />
      <input type="hidden" name="status" value={activating ? "active" : "inactive"} />
    </InlineSubmitForm>
  );
}