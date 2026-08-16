import { getProviderConfig, getActiveProviderId } from "@/lib/payments/config";
import {
  MANUAL_PAYMENT_METHODS,
  PAYMENT_METHOD_INFO,
  type PaymentMethod,
  type PaymentMethodInfo,
  type PaymentProvider,
} from "@/lib/payments/types";
import { hubtelProvider } from "@/lib/payments/providers/hubtel";

/**
 * Provider registry.
 *
 * A provider implementation registers itself here and is only returned when
 * it is actually configured in the server environment. Methods backed by an
 * unconfigured provider are never offered to customers.
 */
const providers = new Map<string, PaymentProvider>();

registerPaymentProvider(hubtelProvider);

export function registerPaymentProvider(provider: PaymentProvider): void {
  providers.set(provider.id, provider);
}

export function getPaymentProvider(id: string): PaymentProvider | null {
  return providers.get(id) ?? null;
}

/**
 * The provider currently active in the server environment, or null. A
 * registered-but-not-configured provider is never returned as active.
 */
export function getActivePaymentProvider(): PaymentProvider | null {
  const id = getActiveProviderId();
  if (id === null) return null;
  const provider = providers.get(id);
  if (!provider || !provider.isConfigured()) return null;
  return provider;
}

export function getPaymentProviderForMethod(
  method: PaymentMethod,
): PaymentProvider | null {
  const config = getProviderConfig();
  if (config === null) return null;
  if (!config.methods.includes(method as "mobile_money" | "card")) return null;
  const provider = providers.get(config.id);
  if (!provider || !provider.isConfigured()) return null;
  return provider;
}

export type AvailablePaymentMethod = PaymentMethodInfo & {
  available: boolean;
};

/**
 * Payment methods customers may actually use at checkout.
 *
 * - bank_transfer, cash: always offered — purely manual, staff confirm.
 * - mobile_money: always offered. Manual fallback (send to the store's MoMo
 *   number, staff confirm) until a provider is configured for it, at which
 *   point checkout switches to instant provider payments. Nothing is faked.
 * - card: only available when a live provider is configured for it.
 */
export function getAvailablePaymentMethods(): AvailablePaymentMethod[] {
  const config = getProviderConfig();
  const methods: AvailablePaymentMethod[] = [];

  for (const method of [...MANUAL_PAYMENT_METHODS, "card"] as const) {
    const info = PAYMENT_METHOD_INFO[method];
    const providerAvailable =
      config !== null && config.methods.includes(method as "mobile_money" | "card");
    methods.push({
      ...info,
      available: providerAvailable || info.kind === "manual" || method === "mobile_money",
    });
  }

  return methods;
}

export function isPaymentMethodAvailable(method: PaymentMethod): boolean {
  return getAvailablePaymentMethods().some(
    (candidate) => candidate.id === method && candidate.available,
  );
}