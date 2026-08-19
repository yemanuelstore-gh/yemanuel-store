export const humanize = (value: string | null | undefined): string => {
  if (!value) return "—";
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  partially_paid: "Partially Paid",
  partially_refunded: "Partially Refunded",
  refunded: "Refunded",
  pending: "Pending",
  failed: "Failed",
};

export const CHANNEL_LABELS: Record<string, string> = {
  online: "Online",
  in_store: "In store",
};

export const ORDER_STATUSES = ["processing", "shipped", "delivered", "cancelled"];

export const PAYMENT_STATUSES = [
  "paid",
  "unpaid",
  "partially_paid",
  "partially_refunded",
  "refunded",
];

export const QUOTATION_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const QUOTATION_STATUSES = ["draft", "sent", "accepted", "expired", "cancelled"];

export const RETURN_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  received: "Received",
  refunded: "Refunded",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const RETURN_STATUSES = ["pending", "approved", "received", "refunded", "rejected", "cancelled"];

export const RETURN_REASON_LABELS: Record<string, string> = {
  wrong_item: "Wrong item",
  damaged: "Damaged",
  not_as_described: "Not as described",
  changed_mind: "Changed mind",
  quality: "Quality issue",
  other: "Other",
};

export const PO_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_received: "Partially Received",
  received: "Received",
  cancelled: "Cancelled",
  closed: "Closed",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  partially_paid: "Partially Paid",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const GOODS_RECEIPT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  received: "Received",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-Time",
  part_time: "Part-Time",
  contract: "Contract",
  intern: "Intern",
  temporary: "Temporary",
  casual: "Casual",
};

export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  on_leave: "On Leave",
  terminated: "Terminated",
  suspended: "Suspended",
  inactive: "Inactive",
};

export const PAYROLL_PERIOD_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  open: "Open",
  processing: "Processing",
  closed: "Closed",
  paid: "Paid",
};

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  individual: "Individual",
  business: "Business",
};

export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  blocked: "Blocked",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  card: "Card",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: "Bank",
  mobile_money: "Mobile Money",
  cash: "Cash",
};

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
};

export const FINANCIAL_TRANSACTION_TYPE_LABELS: Record<string, string> = {
  customer_payment: "Customer payment",
  refund: "Refund",
  supplier_payment: "Supplier payment",
  expense: "Expense",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
  opening_balance: "Opening balance",
};

export function labelFor(
  value: string | null | undefined,
  labels: Record<string, string>,
): string {
  if (!value) return "—";
  return labels[value] ?? humanize(value);
}