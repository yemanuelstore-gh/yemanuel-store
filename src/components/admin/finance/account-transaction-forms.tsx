"use client";

import { useState } from "react";
import type { AccountTarget } from "@/lib/admin/accounts";
import { postAccountTransactionAction } from "@/lib/admin/account-actions";
import {
  ACCOUNT_TRANSACTION_TYPES,
  accountKindLabel,
  accountTransactionTypeLabel,
} from "@/lib/admin/account-constants";
import { ActionForm, Field, Select, TextArea, TextInput } from "@/components/admin/ui";

/**
 * Compact form that posts a deposit, withdrawal or transfer on the given
 * account. Transfers may target any other active bank or mobile money
 * account (including cross-type transfers, e.g. bank -> MTN MoMo).
 */
export function AccountTransactionForm({
  accountKind,
  accountId,
  targets,
}: {
  accountKind: "bank" | "mobile_money";
  accountId: string;
  targets: AccountTarget[];
}) {
  const [transactionType, setTransactionType] = useState("deposit");
  const [targetKind, setTargetKind] = useState<"bank" | "mobile_money">(() => {
    const otherKind = accountKind === "bank" ? "mobile_money" : "bank";
    return targets.some((target) => target.kind === otherKind)
      ? otherKind
      : (targets[0]?.kind ?? "bank");
  });

  const isTransfer = transactionType === "transfer";
  const kindTargets = targets.filter((target) => target.kind === targetKind);
  const canTransfer = targets.length > 0;

  return (
    <ActionForm
      action={postAccountTransactionAction}
      submitLabel="Post transaction"
      pendingLabel="Posting…"
      className="max-w-2xl space-y-4"
    >
      <input type="hidden" name="accountKind" value={accountKind} />
      <input type="hidden" name="accountId" value={accountId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="at-type" required>
          <Select
            id="at-type"
            name="transactionType"
            value={transactionType}
            onChange={(event) => setTransactionType(event.target.value)}
          >
            {ACCOUNT_TRANSACTION_TYPES.map((type) => (
              <option key={type} value={type} disabled={type === "transfer" && !canTransfer}>
                {accountTransactionTypeLabel(type)}
                {type === "transfer" && !canTransfer ? " (no other active accounts)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Amount (GH₵)"
          htmlFor="at-amount"
          required
          hint="Must be greater than zero."
        >
          <TextInput
            id="at-amount"
            name="amount"
            type="number"
            required
            min="0.01"
            step="0.01"
            placeholder="0.00"
          />
        </Field>
        {isTransfer && (
          <>
            <Field label="Target account kind" htmlFor="at-target-kind" required>
              <Select
                id="at-target-kind"
                name="targetKind"
                value={targetKind}
                onChange={(event) => setTargetKind(event.target.value as "bank" | "mobile_money")}
              >
                <option value="bank">{accountKindLabel("bank")}</option>
                <option value="mobile_money">{accountKindLabel("mobile_money")}</option>
              </Select>
            </Field>
            <Field label="Target account" htmlFor="at-target-id" required>
              <Select id="at-target-id" name="targetId" required defaultValue="">
                <option value="" disabled>
                  Choose an account…
                </option>
                {kindTargets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.name} ({target.code})
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
        <Field
          label="Reference"
          htmlFor="at-reference"
          hint="Optional customer or external reference, e.g. a receipt number."
        >
          <TextInput id="at-reference" name="reference" maxLength={120} />
        </Field>
        <Field label="Note" htmlFor="at-note">
          <TextArea id="at-note" name="note" rows={3} maxLength={500} />
        </Field>
      </div>
    </ActionForm>
  );
}