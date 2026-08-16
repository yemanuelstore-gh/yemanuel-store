/**
 * Server-side payment provider configuration.
 *
 * Provider credentials must never be read through NEXT_PUBLIC_* variables or
 * exposed to the browser. When no provider is configured (default), provider
 * payment methods such as mobile money and card are simply not offered at
 * checkout — nothing is simulated.
 */
export type ProviderConfig = {
  id: string;
  methods: ("mobile_money" | "card")[];
};

function rawProviderId(): string {
  return (process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase();
}

/**
 * The active provider id from the server environment, or null when no live
 * provider is configured. Example values: "hubtel", "paystack", "korba".
 */
export function getActiveProviderId(): string | null {
  const id = rawProviderId();
  return id === "" || id === "none" ? null : id;
}

export function isProviderConfigured(): boolean {
  return getActiveProviderId() !== null;
}

export function getProviderWebhookSecret(): string {
  return (process.env.PAYMENT_PROVIDER_WEBHOOK_SECRET ?? "").trim();
}

export function isWebhookSecretConfigured(): boolean {
  return getProviderWebhookSecret() !== "";
}

export function getProviderConfig(): ProviderConfig | null {
  const id = getActiveProviderId();
  if (id === null) return null;
  const methods = (process.env.PAYMENT_PROVIDER_METHODS ?? "")
    .split(",")
    .map((method) => method.trim().toLowerCase())
    .filter((method): method is "mobile_money" | "card" =>
      method === "mobile_money" || method === "card",
    );
  if (methods.length === 0) {
    return { id, methods: ["mobile_money", "card"] };
  }
  return { id, methods };
}