export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "muted";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-line/60 text-ink-soft",
  success: "bg-navy-soft text-navy",
  warning: "bg-gold-soft text-gold-dark",
  danger: "bg-danger-soft text-danger",
  info: "bg-navy-mist text-navy-dark",
  muted: "bg-line/30 text-ink-faint",
};

export function statusBadgeTone(tone: BadgeTone): string {
  return toneClasses[tone];
}

const humanize = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

const toneFor = (
  value: string,
  map: Record<string, BadgeTone>,
  fallback: BadgeTone = "neutral",
): BadgeTone => map[value] ?? fallback;

export function entityStatusTone(value: string): BadgeTone {
  return toneFor(value, { active: "success", inactive: "neutral" });
}

export function productStatusTone(value: string): BadgeTone {
  return toneFor(value, {
    draft: "neutral",
    active: "success",
    inactive: "warning",
    archived: "muted",
  });
}

export function customerStatusTone(value: string): BadgeTone {
  return toneFor(value, {
    active: "success",
    inactive: "neutral",
    blocked: "danger",
  });
}

export function staffStatusTone(value: string): BadgeTone {
  return toneFor(value, { active: "success", inactive: "neutral", suspended: "danger" });
}

export function transferStatusTone(value: string): BadgeTone {
  return toneFor(value, {
    draft: "neutral",
    in_transit: "info",
    received: "success",
    cancelled: "danger",
  });
}

export function transferItemStatusTone(value: string): BadgeTone {
  return toneFor(value, { pending: "neutral", shipped: "info", received: "success" });
}

export function adjustmentStatusTone(value: string): BadgeTone {
  return toneFor(value, {
    draft: "neutral",
    applied: "success",
    cancelled: "danger",
  });
}

export function purchaseOrderStatusTone(value: string): BadgeTone {
  return toneFor(value, {
    draft: "neutral",
    sent: "info",
    partially_received: "warning",
    received: "success",
    cancelled: "danger",
  });
}

export function goodsReceiptStatusTone(value: string): BadgeTone {
  return toneFor(value, { draft: "neutral", completed: "success", cancelled: "danger" });
}

export function invoiceStatusTone(value: string): BadgeTone {
  return toneFor(value, {
    pending: "warning",
    partially_paid: "info",
    paid: "success",
    cancelled: "danger",
  });
}

export function quotationStatusTone(value: string): BadgeTone {
  return toneFor(value, {
    draft: "neutral",
    sent: "info",
    accepted: "success",
    rejected: "danger",
    expired: "muted",
  });
}

export function orderStatusTone(value: string): BadgeTone {
  return toneFor(value, {
    pending: "warning",
    confirmed: "info",
    processing: "info",
    ready_for_delivery: "info",
    out_for_delivery: "info",
    shipped: "info",
    delivered: "success",
    cancelled: "danger",
  });
}

export function orderPaymentStatusTone(value: string): BadgeTone {
  return toneFor(value, {
    unpaid: "warning",
    partially_paid: "info",
    paid: "success",
    refunded: "neutral",
    partially_refunded: "neutral",
  });
}

export function fulfilmentStatusTone(value: string): BadgeTone {
  return toneFor(value, {
    unfulfilled: "neutral",
    partially_fulfilled: "warning",
    fulfilled: "success",
  });
}

export function paymentStatusTone(value: string): BadgeTone {
  return toneFor(value, {
    pending: "warning",
    authorized: "info",
    paid: "success",
    void: "muted",
    refunded: "neutral",
  });
}

export function deliveryStatusTone(value: string): BadgeTone {
  return toneFor(value, {
    pending: "neutral",
    processing: "info",
    ready_for_delivery: "info",
    out_for_delivery: "info",
    shipped: "info",
    delivered: "success",
    failed: "danger",
    cancelled: "muted",
  });
}

export function returnStatusTone(value: string): BadgeTone {
  return toneFor(value, {
    pending: "warning",
    approved: "info",
    received: "success",
    rejected: "danger",
    cancelled: "muted",
  });
}

export function refundStatusTone(value: string): BadgeTone {
  return toneFor(value, {
    pending: "warning",
    processed: "success",
    failed: "danger",
    cancelled: "muted",
  });
}

export function itemConditionTone(value: string): BadgeTone {
  return toneFor(value, { resellable: "success", not_resellable: "danger" });
}

export function movementTypeTone(value: string): BadgeTone {
  return toneFor(
    value,
    {
      opening_stock: "info",
      purchase_receipt: "success",
      sale: "neutral",
      sale_return: "warning",
      transfer_out: "info",
      transfer_in: "info",
      adjustment: "warning",
      damage: "danger",
    },
    "muted",
  );
}

export function priceTypeTone(value: string): BadgeTone {
  return toneFor(value, { selling: "info", sale: "warning" });
}

export function pricePeriodTone(value: string): BadgeTone {
  return toneFor(value, { active: "success", future: "info", expired: "muted" });
}

export function barcodeStatusTone(value: string): BadgeTone {
  return toneFor(value, { assigned: "success", unassigned: "neutral" });
}

export function statusLabel(value: string): string {
  return humanize(value);
}