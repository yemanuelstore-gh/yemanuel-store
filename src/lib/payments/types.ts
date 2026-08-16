export const PAYMENT_METHODS = ["mobile_money", "card", "bank_transfer", "cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Methods that are always offered at checkout without a live provider.
 *
 * - bank_transfer, cash: purely manual — staff confirm before dispatch.
 * - mobile_money: manual fallback (customer sends to the store's MoMo number
 *   and staff confirm) until a provider is configured for it, at which point
 *   checkout switches to instant provider payments for the same method.
 */
export const MANUAL_PAYMENT_METHODS: PaymentMethod[] = [
  "bank_transfer",
  "cash",
  "mobile_money",
];

export type PaymentStatus = "pending" | "authorized" | "paid" | "void" | "refunded";

export type PaymentMethodInfo = {
  id: PaymentMethod;
  label: string;
  description: string;
  kind: "provider" | "manual";
};

export const PAYMENT_METHOD_INFO: Record<PaymentMethod, PaymentMethodInfo> = {
  mobile_money: {
    id: "mobile_money",
    label: "Mobile Money",
    description:
      "Pay with MTN MoMo, Vodafone Cash or AirtelTigo Money. We confirm your payment before dispatch.",
    kind: "provider",
  },
  card: {
    id: "card",
    label: "Card",
    description: "Pay with a debit or credit card through our payment partner.",
    kind: "provider",
  },
  bank_transfer: {
    id: "bank_transfer",
    label: "Bank Transfer",
    description: "Transfer to our bank account and we confirm it before dispatch.",
    kind: "manual",
  },
  cash: {
    id: "cash",
    label: "Cash on Delivery",
    description: "Pay cash when your order arrives. Available in selected areas.",
    kind: "manual",
  },
};

export type PaymentProviderInitParams = {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  /** Our internal payment reference — echoed by the provider as clientReference. */
  reference: string;
  phone?: string;
  customerName?: string;
  email?: string;
  returnUrl: string;
  notifyUrl: string;
};

export type PaymentProviderInitResult =
  | { ok: true; redirectUrl: string; providerReference: string }
  | { ok: true; requiresAwaiting: boolean; providerReference: string }
  | { ok: false; message: string };

export type PaymentProviderVerifyParams = {
  orderId: string;
  paymentId: string;
  providerReference: string;
};

export type PaymentProviderVerifyResult = {
  status: PaymentStatus;
  providerReference: string;
  failureReason?: string;
};

export type PaymentProviderRefundParams = {
  paymentId: string;
  amount: number;
  reason?: string;
};

export type PaymentProviderRefundResult =
  | { ok: true; providerReference: string }
  | { ok: false; message: string };

export type PaymentProvider = {
  id: string;
  methods: PaymentMethod[];
  isConfigured(): boolean;
  initializePayment(
    params: PaymentProviderInitParams,
  ): Promise<PaymentProviderInitResult>;
  verifyPayment(params: PaymentProviderVerifyParams): Promise<PaymentProviderVerifyResult>;
  refund(params: PaymentProviderRefundParams): Promise<PaymentProviderRefundResult>;
};