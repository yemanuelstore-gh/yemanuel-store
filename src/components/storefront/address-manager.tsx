"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  deleteAddressAction,
  saveAddressAction,
  type AddressActionResult,
} from "@/lib/address-actions";
import type { City, Region } from "@/lib/catalogue";

export type AccountAddress = {
  id: string;
  label: string;
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  cityId: string;
  regionId: string;
  postalCode: string | null;
  isDefaultDelivery: boolean;
  isDefaultBilling: boolean;
};

const fieldClasses =
  "mt-1.5 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-navy/50 focus:border-navy focus:outline-2 focus:outline-offset-0 focus:outline-navy/25";

const labelClasses =
  "block text-xs font-medium uppercase tracking-wider text-ink-soft";

function AddressForm({
  regions,
  cities,
  initial,
  onCancel,
}: {
  regions: Region[];
  cities: City[];
  initial?: {
    id?: string;
    label: string;
    recipientName: string;
    recipientPhone: string;
    addressLine1: string;
    addressLine2: string | null;
    cityId: string;
    regionId: string;
    postalCode: string | null;
    isDefaultDelivery: boolean;
    isDefaultBilling: boolean;
  };
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    AddressActionResult,
    FormData
  >(saveAddressAction, { ok: true, message: "" });

  const defaultRegionId = initial?.regionId ?? regions[0]?.id ?? "";
  const [regionId, setRegionId] = useState(defaultRegionId);
  const [cityId, setCityId] = useState(initial?.cityId ?? "");

  const regionCities = useMemo(
    () => cities.filter((city) => city.regionId === regionId),
    [cities, regionId],
  );

  const selectRegion = (nextRegionId: string) => {
    setRegionId(nextRegionId);
    const firstCity = cities.find((city) => city.regionId === nextRegionId);
    setCityId(firstCity?.id ?? "");
  };

  return (
    <form action={formAction} className="rounded-md border border-line bg-paper p-5">
      {initial?.id && <input type="hidden" name="addressId" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="label" className={labelClasses}>
            Label
          </label>
          <Input
            id="label"
            name="label"
            type="text"
            required
            defaultValue={initial?.label}
            placeholder="Home or Office"
            className={fieldClasses}
          />
        </div>
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
            defaultValue={initial?.recipientName}
            placeholder="Recipient full name"
            className={fieldClasses}
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
            defaultValue={initial?.recipientPhone}
            placeholder="024 412 3456"
            className={fieldClasses}
          />
        </div>
        <div>
          <label htmlFor="postalCode" className={labelClasses}>
            Postal code{" "}
            <span className="normal-case text-ink-faint">(optional)</span>
          </label>
          <Input
            id="postalCode"
            name="postalCode"
            type="text"
            autoComplete="postal-code"
            defaultValue={initial?.postalCode ?? ""}
            placeholder="e.g. GA-100"
            className={fieldClasses}
          />
        </div>
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
            defaultValue={initial?.addressLine1}
            placeholder="House number and street"
            className={fieldClasses}
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
            defaultValue={initial?.addressLine2 ?? ""}
            placeholder="Landmark, building or area"
            className={fieldClasses}
          />
        </div>
        <div>
          <label htmlFor={`region-${initial?.id ?? "new"}`} className={labelClasses}>
            Region
          </label>
          <select
            id={`region-${initial?.id ?? "new"}`}
            name="regionId"
            required
            value={regionId}
            onChange={(event) => selectRegion(event.target.value)}
            className={fieldClasses}
          >
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`city-${initial?.id ?? "new"}`} className={labelClasses}>
            City / town
          </label>
          <select
            id={`city-${initial?.id ?? "new"}`}
            name="cityId"
            required
            value={cityId}
            onChange={(event) => setCityId(event.target.value)}
            className={fieldClasses}
          >
            {regionCities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2 text-ink-soft">
          <input
            type="checkbox"
            name="isDefaultDelivery"
            defaultChecked={initial?.isDefaultDelivery}
            className="h-4 w-4 rounded-sm accent-navy"
          />
          Default delivery address
        </label>
        <label className="flex items-center gap-2 text-ink-soft">
          <input
            type="checkbox"
            name="isDefaultBilling"
            defaultChecked={initial?.isDefaultBilling}
            className="h-4 w-4 rounded-sm accent-navy"
          />
          Default billing address
        </label>
      </div>

      {!state.ok && state.message !== "" && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {state.message}
        </p>
      )}
      {state.ok && state.message !== "" && (
        <p role="status" className="mt-3 text-sm text-navy">
          {state.message}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : initial?.id
              ? "Save address"
              : "Add address"}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function AddressManager({
  addresses,
  regions,
  cities,
}: {
  addresses: AccountAddress[];
  regions: Region[];
  cities: City[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  if (addresses.length === 0 && !adding) {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy-soft">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-navy"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <h3 className="mt-4 font-display text-lg font-medium tracking-tight text-ink">
          No saved addresses yet
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-soft">
          Save a delivery address to check out faster next time.
        </p>
        <Button type="button" className="mt-6" onClick={() => setAdding(true)}>
          Add an address
        </Button>
        {adding && (
          <div className="mt-6 text-left">
            <AddressForm
              regions={regions}
              cities={cities}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {addresses.map((address) =>
        editingId === address.id ? (
          <AddressForm
            key={address.id}
            regions={regions}
            cities={cities}
            initial={address}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <Card key={address.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-ink">{address.label}</h4>
                  {address.isDefaultDelivery && (
                    <span className="rounded-full bg-navy-soft px-2 py-0.5 text-[11px] font-medium text-navy">
                      Default delivery
                    </span>
                  )}
                  {address.isDefaultBilling && (
                    <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-medium text-gold-dark">
                      Default billing
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  {address.recipientName} · {address.recipientPhone}
                  <br />
                  {address.addressLine1}
                  {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                  {address.postalCode ? `, ${address.postalCode}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingId(address.id)}
                >
                  Edit
                </Button>
                <form action={deleteAddressAction}>
                  <input type="hidden" name="addressId" value={address.id} />
                  <Button type="submit" variant="ghost" size="sm" className="text-danger">
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          </Card>
        ),
      )}

      {adding ? (
        <AddressForm
          regions={regions}
          cities={cities}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
          Add another address
        </Button>
      )}
    </div>
  );
}