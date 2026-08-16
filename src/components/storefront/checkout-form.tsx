"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProductImage } from "@/components/storefront/product-image";
import { placeOrderAction, type PlaceOrderState } from "@/lib/checkout-actions";
import { formatGHS } from "@/lib/format";
import { cn } from "@/lib/cn";
import type {
  DeliveryMethod,
  DeliveryRate,
  Region,
  City,
  StoreLocation,
} from "@/lib/catalogue";
import type { AvailablePaymentMethod } from "@/lib/payments/registry";
import type { PaymentMethod } from "@/lib/payments/types";

export type CheckoutLineItem = {
  variantId: string;
  sku: string;
  variantName: string;
  optionLabels: { key: string; value: string }[];
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  imageAlt: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type CheckoutSavedAddress = {
  id: string;
  label: string;
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  cityId: string;
  regionId: string;
};

export type CheckoutPrefill = {
  fullName: string;
  phone: string;
  email: string;
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  cityId: string;
  regionId: string;
};

type CheckoutFormProps = {
  requestId: string;
  lines: CheckoutLineItem[];
  subtotal: number;
  deliveryMethods: DeliveryMethod[];
  deliveryRates: DeliveryRate[];
  storeLocations: StoreLocation[];
  regions: Region[];
  cities: City[];
  paymentMethods: AvailablePaymentMethod[];
  unavailableNames: string[];
  prefill?: CheckoutPrefill;
  savedAddresses?: CheckoutSavedAddress[];
};

const inputClasses =
  "mt-1.5 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-navy/50 focus:border-navy focus:outline-2 focus:outline-offset-0 focus:outline-navy/25";

const labelClasses = "block text-xs font-medium uppercase tracking-wider text-ink-soft";

export function CheckoutForm({
  requestId,
  lines,
  subtotal,
  deliveryMethods,
  deliveryRates,
  storeLocations,
  regions,
  cities,
  paymentMethods,
  unavailableNames,
  prefill,
  savedAddresses = [],
}: CheckoutFormProps) {
  const [state, formAction, pending] = useActionState<PlaceOrderState, FormData>(
    placeOrderAction,
    { ok: true, message: "" },
  );

  const initialRegionId = prefill?.regionId ?? regions[0]?.id ?? "";
  const availablePaymentMethods = paymentMethods.filter((method) => method.available);
  const [methodId, setMethodId] = useState(
    deliveryMethods[0]?.id ?? "",
  );
  const [paymentMethodId, setPaymentMethodId] = useState<PaymentMethod | "">(
    availablePaymentMethods[0]?.id ?? "",
  );
  const [regionId, setRegionId] = useState(initialRegionId);
  const [cityId, setCityId] = useState(
    prefill?.cityId && prefill.regionId === initialRegionId
      ? prefill.cityId
      : (cities.find((city) => city.regionId === initialRegionId)?.id ?? ""),
  );
  const [delivery, setDelivery] = useState({
    recipientName: prefill?.recipientName ?? "",
    recipientPhone: prefill?.recipientPhone ?? "",
    addressLine1: prefill?.addressLine1 ?? "",
    addressLine2: prefill?.addressLine2 ?? "",
  });
  const [pickupLocationId, setPickupLocationId] = useState(
    storeLocations[0]?.id ?? "",
  );
  const [savedAddressId, setSavedAddressId] = useState("");

  const selectedMethod = deliveryMethods.find(
    (method) => method.id === methodId,
  );
  const selectedPayment = availablePaymentMethods.find(
    (method) => method.id === paymentMethodId,
  );

  const selectedRate = useMemo(() => {
    if (!selectedMethod || selectedMethod.kind === "pickup") return null;
    return (
      deliveryRates.find(
        (rate) =>
          rate.deliveryMethodId === selectedMethod.id &&
          rate.regionId === regionId &&
          rate.isActive,
      ) ?? null
    );
  }, [deliveryRates, selectedMethod, regionId]);

  const isPickup = selectedMethod?.kind === "pickup";
  const deliveryFee =
    selectedMethod === undefined
      ? 0
      : isPickup
        ? 0
        : (selectedRate?.fee ?? null);
  const total = subtotal + (deliveryFee ?? 0);
  const regionUnavailable =
    !isPickup && selectedMethod !== undefined && deliveryFee === null;

  const regionCities = useMemo(
    () => cities.filter((city) => city.regionId === regionId),
    [cities, regionId],
  );

  const hasUnavailable = unavailableNames.length > 0;
  const canPlaceOrder =
    !pending &&
    deliveryMethods.length > 0 &&
    paymentMethodId !== "" &&
    !regionUnavailable &&
    !(isPickup && pickupLocationId === "") &&
    !hasUnavailable;

  const selectSavedAddress = (id: string) => {
    setSavedAddressId(id);
    const address = savedAddresses.find((item) => item.id === id);
    if (!address) return;
    setDelivery({
      recipientName: address.recipientName,
      recipientPhone: address.recipientPhone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? "",
    });
    setRegionId(address.regionId);
    setCityId(address.cityId);
  };

  return (
    <form action={formAction}>
      <input type="hidden" name="requestId" value={requestId} />

      <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-12">
        <div className="space-y-10">
          <section aria-labelledby="checkout-contact-heading">
            <h2
              id="checkout-contact-heading"
              className="flex items-center gap-3 font-display text-xl font-medium tracking-tight text-ink"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-xs font-semibold text-ivory">
                1
              </span>
              Contact information
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="fullName" className={labelClasses}>
                  Full name
                </label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  defaultValue={prefill?.fullName ?? ""}
                  placeholder="Ama Mensah"
                  className={inputClasses}
                />
              </div>
              <div>
                <label htmlFor="phone" className={labelClasses}>
                  Phone
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  defaultValue={prefill?.phone ?? ""}
                  placeholder="024 412 3456"
                  className={inputClasses}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="email" className={labelClasses}>
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  defaultValue={prefill?.email ?? ""}
                  placeholder="you@example.com"
                  className={inputClasses}
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="checkout-delivery-heading">
            <h2
              id="checkout-delivery-heading"
              className="flex items-center gap-3 font-display text-xl font-medium tracking-tight text-ink"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-xs font-semibold text-ivory">
                2
              </span>
              Delivery
            </h2>

            {deliveryMethods.length === 0 ? (
              <div className="mt-5 rounded-md border border-line bg-paper p-6">
                <h3 className="text-sm font-medium text-ink">
                  Delivery options will be available soon
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  We are still setting up delivery for your area. Your cart is
                  safe — check back soon to complete your order.
                </p>
              </div>
            ) : (
              <>
                <fieldset className="mt-5">
                  <legend className={labelClasses}>Delivery method</legend>
                  <div className="mt-2 space-y-2">
                    {deliveryMethods.map((method) => {
                      const methodIsPickup = method.kind === "pickup";
                      const rate = deliveryRates.find(
                        (candidate) =>
                          candidate.deliveryMethodId === method.id &&
                          candidate.regionId === regionId &&
                          candidate.isActive,
                      );
                      return (
                        <label
                          key={method.id}
                          className={cn(
                            "flex cursor-pointer items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm transition-colors",
                            methodId === method.id
                              ? "border-navy bg-navy-soft/60"
                              : "border-line-strong bg-white hover:border-navy/40",
                          )}
                        >
                          <span className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="deliveryMethodId"
                              value={method.id}
                              checked={methodId === method.id}
                              onChange={(event) => setMethodId(event.target.value)}
                              className="accent-navy"
                            />
                            <span>
                              <span className="block font-medium text-ink">
                                {method.name}
                              </span>
                              <span className="mt-0.5 block text-xs text-ink-soft">
                                {methodIsPickup
                                  ? "Collection at our store"
                                  : rate
                                    ? `Delivery in ${rate.etaMinDays}${
                                        rate.etaMaxDays > rate.etaMinDays
                                          ? `–${rate.etaMaxDays}`
                                          : ""
                                      } business day${rate.etaMaxDays > 1 ? "s" : ""}`
                                    : "Not available in this region"}
                              </span>
                            </span>
                          </span>
                          <span className="text-sm font-semibold text-navy">
                            {methodIsPickup
                              ? "Free"
                              : rate
                                ? formatGHS(rate.fee)
                                : "—"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {isPickup ? (
                  <div className="mt-5 space-y-4">
                    {storeLocations.length === 0 ? (
                      <div className="rounded-md border border-line bg-paper p-5">
                        <p className="text-sm leading-6 text-ink-soft">
                          Pickup is not available at the moment — please choose
                          a delivery method instead.
                        </p>
                      </div>
                    ) : (
                      <>
                        <input
                          type="hidden"
                          name="pickupLocationId"
                          value={pickupLocationId}
                        />
                        <div>
                          <label htmlFor="pickupLocationId" className={labelClasses}>
                            Pickup location
                          </label>
                          <select
                            id="pickupLocationId"
                            value={pickupLocationId}
                            onChange={(event) =>
                              setPickupLocationId(event.target.value)
                            }
                            className={inputClasses}
                          >
                            {storeLocations.map((location) => (
                              <option key={location.id} value={location.id}>
                                {location.name} — {location.addressLine1},{" "}
                                {location.city}
                              </option>
                            ))}
                          </select>
                        </div>
                        {pickupLocationId !== "" && (
                          <p className="text-xs leading-5 text-ink-soft">
                            {(() => {
                              const location = storeLocations.find(
                                (candidate) => candidate.id === pickupLocationId,
                              );
                              if (!location) return null;
                              return `${location.name}, ${location.addressLine1}${
                                location.addressLine2
                                  ? `, ${location.addressLine2}`
                                  : ""
                              }, ${location.city}${location.regionName ? `, ${location.regionName}` : ""}. Free of charge.`;
                            })()}
                          </p>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="pickupRecipientName" className={labelClasses}>
                              Person collecting
                            </label>
                            <Input
                              id="pickupRecipientName"
                              name="recipientName"
                              type="text"
                              autoComplete="name"
                              required
                              value={delivery.recipientName}
                              onChange={(event) =>
                                setDelivery({
                                  ...delivery,
                                  recipientName: event.target.value,
                                })
                              }
                              placeholder="Recipient full name"
                              className={inputClasses}
                            />
                          </div>
                          <div>
                            <label htmlFor="pickupRecipientPhone" className={labelClasses}>
                              Phone
                            </label>
                            <Input
                              id="pickupRecipientPhone"
                              name="recipientPhone"
                              type="tel"
                              inputMode="tel"
                              autoComplete="tel"
                              required
                              value={delivery.recipientPhone}
                              onChange={(event) =>
                                setDelivery({
                                  ...delivery,
                                  recipientPhone: event.target.value,
                                })
                              }
                              placeholder="024 412 3456"
                              className={inputClasses}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="recipientName" className={labelClasses}>
                        Recipient name
                      </label>
                      <Input
                        id="recipientName"
                        name="recipientName"
                        type="text"
                        autoComplete="name"
                        required
                        value={delivery.recipientName}
                        onChange={(event) =>
                          setDelivery({
                            ...delivery,
                            recipientName: event.target.value,
                          })
                        }
                        placeholder="Recipient full name"
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label htmlFor="recipientPhone" className={labelClasses}>
                        Recipient phone
                      </label>
                      <Input
                        id="recipientPhone"
                        name="recipientPhone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        value={delivery.recipientPhone}
                        onChange={(event) =>
                          setDelivery({
                            ...delivery,
                            recipientPhone: event.target.value,
                          })
                        }
                        placeholder="024 412 3456"
                        className={inputClasses}
                      />
                    </div>
                    {savedAddresses.length > 0 && (
                      <div className="sm:col-span-2">
                        <label htmlFor="savedAddress" className={labelClasses}>
                          Saved address
                        </label>
                        <select
                          id="savedAddress"
                          value={savedAddressId}
                          onChange={(event) => selectSavedAddress(event.target.value)}
                          className={inputClasses}
                        >
                          <option value="">Use a new address</option>
                          {savedAddresses.map((address) => (
                            <option key={address.id} value={address.id}>
                              {address.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <label htmlFor="addressLine1" className={labelClasses}>
                        Address line 1
                      </label>
                      <Input
                        id="addressLine1"
                        name="addressLine1"
                        type="text"
                        autoComplete="address-line1"
                        required
                        value={delivery.addressLine1}
                        onChange={(event) =>
                          setDelivery({
                            ...delivery,
                            addressLine1: event.target.value,
                          })
                        }
                        placeholder="House number and street"
                        className={inputClasses}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="addressLine2" className={labelClasses}>
                        Address line 2{" "}
                        <span className="normal-case text-ink-faint">(optional)</span>
                      </label>
                      <Input
                        id="addressLine2"
                        name="addressLine2"
                        type="text"
                        autoComplete="address-line2"
                        value={delivery.addressLine2}
                        onChange={(event) =>
                          setDelivery({
                            ...delivery,
                            addressLine2: event.target.value,
                          })
                        }
                        placeholder="Landmark, building or area"
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label htmlFor="regionId" className={labelClasses}>
                        Region
                      </label>
                      <select
                        id="regionId"
                        name="regionId"
                        required
                        value={regionId}
                        onChange={(event) => {
                          const nextRegionId = event.target.value;
                          setRegionId(nextRegionId);
                          const firstCity = cities.find(
                            (city) => city.regionId === nextRegionId,
                          );
                          setCityId(firstCity?.id ?? "");
                        }}
                        className={inputClasses}
                      >
                        {regions.map((region) => (
                          <option key={region.id} value={region.id}>
                            {region.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="cityId" className={labelClasses}>
                        City / town
                      </label>
                      <select
                        id="cityId"
                        name="cityId"
                        required
                        value={cityId}
                        onChange={(event) => setCityId(event.target.value)}
                        className={inputClasses}
                      >
                        {regionCities.map((city) => (
                          <option key={city.id} value={city.id}>
                            {city.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {regionUnavailable && (
                  <div
                    role="alert"
                    className="mt-5 rounded-md border border-gold-dark/30 bg-gold-soft px-4 py-3 text-sm leading-6 text-gold-dark"
                  >
                    {selectedMethod.name} is not available in the selected
                    region. Please choose another delivery method.
                  </div>
                )}
              </>
            )}
          </section>

          <section aria-labelledby="checkout-payment-heading">
            <h2
              id="checkout-payment-heading"
              className="flex items-center gap-3 font-display text-xl font-medium tracking-tight text-ink"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-xs font-semibold text-ivory">
                3
              </span>
              Payment method
            </h2>
            {availablePaymentMethods.length === 0 ? (
              <div className="mt-5 rounded-md border border-line bg-paper p-6">
                <h3 className="text-sm font-medium text-ink">
                  Payment options will be available soon
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  We are still setting up payments. You can still place your
                  order and we will contact you to arrange payment.
                </p>
              </div>
            ) : (
              <fieldset className="mt-5">
                <legend className={labelClasses}>How would you like to pay?</legend>
                <div className="mt-2 space-y-2">
                  {availablePaymentMethods.map((method) => (
                    <label
                      key={method.id}
                      className={cn(
                        "flex cursor-pointer items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm transition-colors",
                        paymentMethodId === method.id
                          ? "border-navy bg-navy-soft/60"
                          : "border-line-strong bg-white hover:border-navy/40",
                      )}
                    >
                      <span className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="paymentMethodId"
                          value={method.id}
                          checked={paymentMethodId === method.id}
                          onChange={(event) =>
                            setPaymentMethodId(event.target.value as PaymentMethod)
                          }
                          className="mt-0.5 accent-navy"
                        />
                        <span>
                          <span className="block font-medium text-ink">
                            {method.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 text-ink-soft">
                            {method.description}
                          </span>
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </section>

          {state.ok === false && state.message !== "" && (
            <div
              role="alert"
              className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm leading-6 text-danger"
            >
              {state.message}
            </div>
          )}

          {hasUnavailable && (
            <div
              role="alert"
              className="rounded-md border border-gold-dark/30 bg-gold-soft px-4 py-3 text-sm leading-6 text-gold-dark"
            >
              Some items in your cart are no longer available ({unavailableNames
                .slice(0, 3)
                .join(", ")}). Please review your cart before placing an order.
            </div>
          )}
        </div>

        <section aria-labelledby="checkout-summary-heading">
          <Card className="p-6 lg:sticky lg:top-24">
            <h2
              id="checkout-summary-heading"
              className="font-display text-lg font-medium tracking-tight text-ink"
            >
              Order summary
            </h2>
            <ul className="mt-5 space-y-4 border-b border-line pb-5">
              {lines.map((line) => (
                <li key={line.variantId} className="flex gap-3">
                  <div className="relative h-16 w-13 flex-shrink-0 overflow-hidden rounded-sm border border-line bg-navy-soft">
                    <ProductImage
                      src={line.imageUrl}
                      alt={line.imageAlt ?? line.productName}
                      sizes="52px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {line.productName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-soft">
                      {line.variantName}
                      {line.optionLabels.length > 0 &&
                        ` · ${line.optionLabels
                          .map((option) => `${option.key}: ${option.value}`)
                          .join(" · ")}`}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {line.quantity} × {formatGHS(line.unitPrice)}
                    </p>
                  </div>
                  <p className="flex-shrink-0 text-sm font-semibold text-ink">
                    {formatGHS(line.lineTotal)}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="font-semibold text-ink">{formatGHS(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">
                  Delivery
                  {selectedMethod ? ` (${selectedMethod.name})` : ""}
                </dt>
                <dd className="font-semibold text-ink">
                  {deliveryMethods.length === 0
                    ? "Available soon"
                    : isPickup
                      ? "Free"
                      : deliveryFee === null
                        ? "Not available"
                        : formatGHS(deliveryFee)}
                </dd>
              </div>
              {selectedRate && (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-soft">Delivery ETA</dt>
                  <dd className="font-medium text-ink">
                    {selectedRate.etaMinDays}–
                    {selectedRate.etaMaxDays} business day
                    {selectedRate.etaMaxDays > 1 ? "s" : ""}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-line pt-3">
                <dt className="font-medium text-ink">Total</dt>
                <dd className="text-lg font-semibold text-ink">
                  {formatGHS(total)}
                </dd>
              </div>
            </dl>
            <Button
              type="submit"
              disabled={!canPlaceOrder}
              className="mt-6 w-full"
            >
              {pending ? "Placing order…" : "Place Order"}
            </Button>
            <p className="mt-3 text-center text-xs text-ink-faint">
              {selectedPayment?.description ?? "No payment is taken at this stage."}
            </p>
            <div className="mt-5 space-y-2 border-t border-line pt-5 text-xs text-ink-soft">
              <p className="flex items-center gap-2">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-navy">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Secure checkout
              </p>
              <p className="flex items-center gap-2">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-navy">
                  <path d="M5 8h14" />
                  <path d="M5 8 3 13v6h18v-6l-2-5" />
                  <path d="M9 19v-4h6v4" />
                </svg>
                Delivery across Ghana
              </p>
              <p className="flex items-center gap-2">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-navy">
                  <path d="m4 12 5 5L20 6" />
                </svg>
                Order confirmation on the next screen
              </p>
            </div>
          </Card>
        </section>
      </div>
    </form>
  );
}