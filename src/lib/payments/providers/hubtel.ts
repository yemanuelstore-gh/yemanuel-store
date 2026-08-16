import type {
  PaymentMethod,
  PaymentProvider,
  PaymentProviderInitParams,
  PaymentProviderInitResult,
  PaymentProviderVerifyParams,
  PaymentProviderVerifyResult,
  PaymentProviderRefundResult,
} from "@/lib/payments/types";

/**
 * Hubtel payment provider adapter (Hubtel v2 payments API).
 *
 * Implements the Hubtel v2 Online Checkout contract documented at
 * https://developers.hubtel.com/:
 *
 *   POST https://api.hubtel.com/v2/payments/request
 *     Authorization: Basic base64("{clientId}:{clientSecret}")
 *     {
 *       merchantAccountNumber,   // Hubtel merchant account (e.g. HD....)
 *       totalAmount,             // e.g. "12.50"
 *       title,                   // short payment title
 *       description,
 *       callbackUrl,             // our webhook endpoint
 *       returnUrl,               // customer return page
 *       cancellationUrl,         // customer cancel page
 *       payeeName,
 *       payeeEmail,
 *       payeeMobileNumber,
 *       clientReference          // our payment reference, echoed back
 *     }
 *     -> { responseCode: "0000", data: { checkoutUrl } }
 *
 * The adapter is dormant until the store provisions real Hubtel credentials
 * (see isConfigured). While dormant, Hubtel-backed methods are never offered
 * at checkout and nothing is simulated. It is registered in the provider
 * registry and selected via the PAYMENT_PROVIDER / PAYMENT_PROVIDER_METHODS
 * environment variables.
 *
 * NOTE: This adapter follows the documented v2 contract. Before enabling it
 * with live credentials, verify the current endpoint and response shapes on
 * the Hubtel developer portal, since provider APIs can evolve.
 */

const API_BASE = "https://api.hubtel.com/v2/payments";

function credentials(): {
  clientId: string;
  clientSecret: string;
  merchantAccountNumber: string;
} | null {
  const clientId = (process.env.HUBTEL_CLIENT_ID ?? "").trim();
  const clientSecret = (process.env.HUBTEL_CLIENT_SECRET ?? "").trim();
  const merchantAccountNumber = (process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER ?? "").trim();
  if (clientId === "" || clientSecret === "" || merchantAccountNumber === "") {
    return null;
  }
  return { clientId, clientSecret, merchantAccountNumber };
}

function authHeader(credentials: {
  clientId: string;
  clientSecret: string;
}): string {
  const token = Buffer.from(
    `${credentials.clientId}:${credentials.clientSecret}`,
    "utf8",
  ).toString("base64");
  return `Basic ${token}`;
}

function hubtelAmount(value: number): string {
  return value.toFixed(2);
}

export const hubtelProvider: PaymentProvider = {
  id: "hubtel",
  methods: ["mobile_money", "card"] as PaymentMethod[],

  isConfigured(): boolean {
    return credentials() !== null;
  },

  async initializePayment(
    params: PaymentProviderInitParams,
  ): Promise<PaymentProviderInitResult> {
    const creds = credentials();
    if (!creds) {
      return { ok: false, message: "Hubtel is not configured." };
    }

    const body = {
      merchantAccountNumber: creds.merchantAccountNumber,
      totalAmount: hubtelAmount(params.amount),
      title: `Yemanuel Store order ${params.orderNumber}`,
      description: `Payment for order ${params.orderNumber}`,
      callbackUrl: params.notifyUrl,
      returnUrl: params.returnUrl,
      cancellationUrl: params.returnUrl,
      payeeName: params.customerName ?? "",
      payeeEmail: params.email ?? "",
      payeeMobileNumber: params.phone ?? "",
      clientReference: params.reference,
    };

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/request`, {
        method: "POST",
        headers: {
          Authorization: authHeader(creds),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });
    } catch {
      return {
        ok: false,
        message: "Could not reach the payment provider. Please try again.",
      };
    }

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, message: "The payment provider returned an invalid response." };
    }

    if (!response.ok) {
      return {
        ok: false,
        message: "The payment provider rejected this payment request.",
      };
    }

    const data = payload as {
      responseCode?: string;
      responseMessage?: string;
      data?: { checkoutUrl?: string };
    } | null;

    if (data?.responseCode !== "0000" || typeof data.data?.checkoutUrl !== "string") {
      return {
        ok: false,
        message: data?.responseMessage ?? "The payment provider could not start this payment.",
      };
    }

    const checkoutUrl = data.data.checkoutUrl;
    if (!/^https?:\/\//.test(checkoutUrl)) {
      return { ok: false, message: "The payment provider returned an invalid checkout link." };
    }

    return {
      ok: true,
      redirectUrl: checkoutUrl,
      providerReference: body.clientReference,
    };
  },

  async verifyPayment(
    params: PaymentProviderVerifyParams,
  ): Promise<PaymentProviderVerifyResult> {
    const creds = credentials();
    if (!creds) {
      return { status: "pending", providerReference: params.providerReference };
    }

    // Hubtel v2 exposes a transaction status resource. If the status cannot
    // be confirmed server-side, we return "pending" — a payment is never
    // marked paid without a verified source, and store staff can confirm
    // manually in the Hubtel portal.
    try {
      const response = await fetch(
        `${API_BASE}/status/${encodeURIComponent(params.providerReference)}`,
        {
          headers: { Authorization: authHeader(creds) },
          cache: "no-store",
        },
      );
      if (!response.ok) {
        return { status: "pending", providerReference: params.providerReference };
      }
      const payload: unknown = await response.json();
      const record = (typeof payload === "object" && payload !== null
        ? payload
        : {}) as Record<string, unknown>;
      const status = String(
        record.status ?? record.Status ?? record.responseCode ?? "",
      ).toLowerCase();

      if (status.includes("success") || status === "paid" || status === "0000") {
        return { status: "paid", providerReference: params.providerReference };
      }
      if (
        status.includes("fail") ||
        status.includes("cancel") ||
        status === "declined" ||
        status === "void"
      ) {
        return { status: "void", providerReference: params.providerReference };
      }
    } catch {
      // Unreachable or invalid response: stay pending, never fake success.
    }

    return { status: "pending", providerReference: params.providerReference };
  },

  async refund(): Promise<PaymentProviderRefundResult> {
    // The Hubtel v2 payments API used here does not expose a refund operation.
    // Refunds are handled manually in the Hubtel merchant portal; the store
    // records them in the admin refunds workflow.
    return {
      ok: false,
      message: "Hubtel refunds are handled manually in the Hubtel portal.",
    };
  },
};