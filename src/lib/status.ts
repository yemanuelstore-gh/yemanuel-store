export type StatusTone =
  | "neutral"
  | "progress"
  | "active"
  | "done"
  | "muted"
  | "danger";

export function orderStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "confirmed":
      return "Confirmed";
    case "processing":
      return "Processing";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function orderStatusTone(status: string): StatusTone {
  switch (status) {
    case "delivered":
      return "done";
    case "shipped":
      return "active";
    case "confirmed":
    case "processing":
      return "progress";
    case "cancelled":
      return "muted";
    default:
      return "neutral";
  }
}

export function paymentStatusLabel(status: string): string {
  switch (status) {
    case "unpaid":
      return "Unpaid";
    case "partially_paid":
      return "Partially paid";
    case "paid":
      return "Paid";
    case "refunded":
      return "Refunded";
    case "partially_refunded":
      return "Partially refunded";
    default:
      return status;
  }
}

export function paymentStatusTone(status: string): StatusTone {
  switch (status) {
    case "paid":
      return "done";
    case "partially_paid":
    case "partially_refunded":
      return "progress";
    case "refunded":
      return "muted";
    default:
      return "neutral";
  }
}

export function fulfilmentStatusLabel(status: string): string {
  switch (status) {
    case "unfulfilled":
      return "Unfulfilled";
    case "partially_fulfilled":
      return "Partially fulfilled";
    case "fulfilled":
      return "Fulfilled";
    default:
      return status;
  }
}

export function fulfilmentStatusTone(status: string): StatusTone {
  switch (status) {
    case "fulfilled":
      return "done";
    case "partially_fulfilled":
      return "progress";
    default:
      return "neutral";
  }
}

export function deliveryStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "processing":
      return "Processing";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function deliveryStatusTone(status: string): StatusTone {
  switch (status) {
    case "delivered":
      return "done";
    case "shipped":
      return "active";
    case "processing":
      return "progress";
    case "failed":
      return "danger";
    case "cancelled":
      return "muted";
    default:
      return "neutral";
  }
}