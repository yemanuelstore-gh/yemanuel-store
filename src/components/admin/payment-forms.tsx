"use client";

import { ActionForm, Field, InlineSubmitForm, TextInput } from "@/components/admin/ui";
import {
  verifyManualPaymentAction,
  voidPaymentAction,
} from "@/lib/admin/payment-actions";
import { formatGHS } from "@/lib/format";
import type { AdminPaymentRow } from "@/lib/admin/payments";

/**
 * Staff confirmation that a bank transfer or cash payment physically arrived.
 * The payment is only marked paid after this explicit verification.
 */
export function VerifyManualPaymentForm({
  payment,
}: {
  payment: Pick<AdminPaymentRow, "id" | "method" | "amount" | "reference">;
}) {
  return (
    <ActionForm
      action={verifyManualPaymentAction}
      submitLabel="Confirm payment received"
      pendingLabel="Confirming…"
      className="space-y-3"
    >
      <input type="hidden" name="paymentId" value={payment.id} />
      <p className="text-[11px] leading-4 text-ink-soft">
        Confirm that {formatGHS(payment.amount)} was actually received for this{" "}
        {payment.method.replaceAll("_", " ")} payment before marking it paid.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Reference (optional)"
          htmlFor={`vp-ref-${payment.id}`}
          hint="Override the internal reference if your statement has a different one."
        >
          <TextInput
            id={`vp-ref-${payment.id}`}
            name="reference"
            defaultValue={payment.reference ?? ""}
          />
        </Field>
        <Field label="Notes (optional)" htmlFor={`vp-notes-${payment.id}`}>
          <TextInput id={`vp-notes-${payment.id}`} name="notes" />
        </Field>
      </div>
    </ActionForm>
  );
}

export function VoidPendingPaymentForm({ paymentId }: { paymentId: string }) {
  return (
    <InlineSubmitForm
      action={voidPaymentAction}
      label="Mark as void"
      pendingLabel="Voiding…"
      variant="secondary"
    >
      <input type="hidden" name="paymentId" value={paymentId} />
    </InlineSubmitForm>
  );
}