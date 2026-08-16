"use client";

import { useState } from "react";
import { AdminBadge } from "@/components/admin/admin-badge";
import { InlineSubmitForm, Select } from "@/components/admin/ui";
import { updateOrderStatusAction } from "@/lib/admin/sales-actions";
import { statusLabel } from "@/lib/admin/labels";

export function OrderStatusEditor({
  orderId,
  field,
  label,
  value,
  options,
  tone,
}: {
  orderId: string;
  field: "status" | "payment_status" | "fulfilment_status";
  label: string;
  value: string;
  options: string[];
  tone: (value: string) => Parameters<typeof AdminBadge>[0]["tone"];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const isChanged = selected !== null && selected !== value;

  return (
    <div className="flex items-center gap-2">
      <AdminBadge tone={tone(value)}>{statusLabel(value)}</AdminBadge>
      <Select
        aria-label={label}
        defaultValue=""
        value={selected ?? ""}
        onChange={(event) => setSelected(event.target.value)}
        className="w-40"
      >
        <option value="">Change…</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {statusLabel(option)}
          </option>
        ))}
      </Select>
      {isChanged && selected && (
        <InlineSubmitForm
          action={updateOrderStatusAction}
          label="Save"
          pendingLabel="Saving…"
          variant="primary"
        >
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="field" value={field} />
          <input type="hidden" name="value" value={selected} />
        </InlineSubmitForm>
      )}
    </div>
  );
}