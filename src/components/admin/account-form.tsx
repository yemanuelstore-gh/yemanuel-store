"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Icon, type IconName } from "@/components/ui/icons";
import {
  createFinancialAccountAction,
  type FinancialAccountActionResult,
} from "@/lib/finance-actions";
import { cn } from "@/lib/cn";

type AccountTypeOption = {
  id: "bank" | "mobile_money" | "cash";
  label: string;
  icon: IconName;
  blurb: string;
};

const TYPE_OPTIONS: AccountTypeOption[] = [
  { id: "bank", label: "Bank", icon: "bank", blurb: "Current or savings account" },
  {
    id: "mobile_money",
    label: "Mobile Money",
    icon: "mobile",
    blurb: "MoMo wallet number",
  },
  { id: "cash", label: "Cash", icon: "cash", blurb: "Till or petty cash" },
];

const INITIAL_STATE: FinancialAccountActionResult = { ok: true, message: "" };

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-3.5 animate-spin rounded-full border-2 border-erp-navy-deep/30 border-t-erp-navy-deep"
    />
  );
}

function AccountForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(
    createFinancialAccountAction,
    INITIAL_STATE,
  );
  const [type, setType] = useState<AccountTypeOption["id"]>("bank");

  useEffect(() => {
    if (state.ok && state.message !== "") onDone();
  }, [state, onDone]);

  const isBank = type === "bank";
  const isMomo = type === "mobile_money";

  return (
    <form action={formAction}>
      <input type="hidden" name="accountType" value={type} />

      <Label htmlFor="account-type">Account type</Label>
      <div
        id="account-type"
        role="radiogroup"
        aria-label="Account type"
        className="grid grid-cols-3 gap-2"
      >
        {TYPE_OPTIONS.map((option) => {
          const active = option.id === type;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setType(option.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md border px-2 py-2.5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy",
                active
                  ? "border-erp-navy bg-erp-navy/[0.04] text-erp-navy"
                  : "border-erp-border bg-white text-erp-text-secondary hover:border-erp-text-muted",
              )}
            >
              <Icon
                name={option.icon}
                size={16}
                className={cn(active && "text-erp-gold-hover")}
              />
              <span className="text-xs font-medium">{option.label}</span>
              <span className="text-[10px] leading-3 text-erp-text-muted">
                {option.blurb}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <Label htmlFor="account-name">Account name</Label>
        <Input
          id="account-name"
          name="accountName"
          required
          maxLength={80}
          placeholder={
            isBank
              ? "e.g. GCB Current Account"
              : isMomo
                ? "e.g. MTN MoMo Business Wallet"
                : "e.g. Main Till"
          }
          autoComplete="off"
        />
      </div>

      <div className="mt-3">
        <Label htmlFor="institution">
          {isBank ? "Bank name" : isMomo ? "Network / provider" : "Cash location / custodian"}
          {!isBank && !isMomo && <span className="font-normal text-erp-text-muted"> (optional)</span>}
        </Label>
        <Input
          id="institution"
          name="institution"
          maxLength={80}
          required={type !== "cash"}
          placeholder={
            isBank
              ? "e.g. GCB Bank"
              : isMomo
                ? "e.g. MTN Mobile Money"
                : "e.g. Front till"
          }
          autoComplete="off"
        />
      </div>

      {type !== "cash" && (
        <div className="mt-3">
          <Label htmlFor="account-number">
            {isBank ? "Account number" : "Wallet number (phone)"}
          </Label>
          <Input
            id="account-number"
            name="accountNumber"
            required
            maxLength={34}
            inputMode={isMomo ? "tel" : "text"}
            placeholder={
              isMomo ? "e.g. 024 412 3456" : "e.g. 0123 4567 8901"
            }
            autoComplete="off"
          />
          {isMomo && (
            <p className="mt-1 text-[11px] leading-4 text-erp-text-muted">
              The phone number registered on the wallet.
            </p>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select id="currency" name="currency" defaultValue="GHS">
            <option value="GHS">GHS — Ghana Cedi</option>
            <option value="USD">USD — US Dollar</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="EUR">EUR — Euro</option>
            <option value="NGN">NGN — Nigerian Naira</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="opening-balance">Opening balance</Label>
          <Input
            id="opening-balance"
            name="openingBalance"
            type="number"
            min={0}
            max={999999999999.99}
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
          />
          <p className="mt-1 text-[11px] leading-4 text-erp-text-muted">
            Money already in the account.
          </p>
        </div>
      </div>

      <div className="mt-3">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={500}
          placeholder="Anything worth remembering about this account."
        />
      </div>

      {!state.ok && state.message !== "" && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-erp-cancelled/30 bg-erp-cancelled/[0.06] px-3 py-2 text-xs leading-5 text-erp-cancelled"
        >
          {state.message}
        </div>
      )}

      <Button
        type="submit"
        variant="gold"
        size="md"
        disabled={pending}
        className="mt-5 w-full"
      >
        {pending && <Spinner />}
        {pending ? "Adding account…" : "Add account"}
      </Button>
    </form>
  );
}

export function AddAccount({
  canCreate,
  compact,
}: {
  canCreate: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!canCreate) return null;

  return (
    <>
      <Button
        variant={compact ? "secondary" : "primary"}
        size="md"
        onClick={() => setOpen(true)}
      >
        <Icon name="plus" size={16} />
        Add account
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add financial account"
        description="Bank, mobile-money or cash account used by Yemanuel."
        width="sm"
      >
        <AccountForm onDone={() => setOpen(false)} />
      </Dialog>
    </>
  );
}