import type { PaymentMethod } from "@/lib/payments/types";

export const POS_CATALOGUE_LIMIT = 48;
export const POS_MAX_LINES = 30;
export const POS_MAX_QUANTITY = 99;

/** A sellable variant as shown in the POS product browser. */
export type PosCatalogueItem = {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  barcode: string | null;
  categoryId: string | null;
  categoryName: string | null;
  /** Current effective selling price (selling or sale) — authoritative from DB. */
  price: number;
  salePrice: number | null;
  /** quantity_on_hand − reserved_quantity at the selected location. */
  available: number;
  imageUrl: string | null;
};

export type PosCategory = {
  id: string;
  name: string;
};

export type PosLocation = {
  id: string;
  name: string;
};

export type PosCustomerOption = {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  email: string | null;
};

export type PosCartLineInput = {
  variantId: string;
  quantity: number;
};

/** Payment methods offered at the register (subset of the DB enum). */
export const POS_PAYMENT_METHODS = [
  "cash",
  "mobile_money",
  "card",
  "bank_transfer",
] as const satisfies readonly PaymentMethod[];

export type PosPaymentMethod = (typeof POS_PAYMENT_METHODS)[number];

export type PosReceiptItem = {
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PosReceipt = {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  cashierName: string;
  customerName: string | null;
  items: PosReceiptItem[];
  subtotal: number;
  discountTotal: number;
  totalAmount: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  paymentReference: string;
};

export type PosSaleResult =
  | { ok: true; receipt: PosReceipt }
  | { ok: false; message: string };