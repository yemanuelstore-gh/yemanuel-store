"use client";

import { useMemo, useState } from "react";
import {
  ActionForm,
  Field,
  Select,
  TextInput,
} from "@/components/admin/ui";
import { createPriceAction, updatePriceAction } from "@/lib/admin/product-actions";
import type { PriceListItem } from "@/lib/admin/variants";

function toDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function PriceCreateForm({
  products,
  variants,
  locations,
  initialProductId,
  initialVariantId,
}: {
  products: { id: string; name: string }[];
  variants: { id: string; name: string; sku: string; productId: string }[];
  locations: { id: string; name: string }[];
  initialProductId?: string;
  initialVariantId?: string;
}) {
  const [scope, setScope] = useState<"product" | "variant">(
    initialVariantId ? "variant" : "product",
  );
  const [productId, setProductId] = useState(initialProductId ?? "");
  const [variantId, setVariantId] = useState(initialVariantId ?? "");

  const productVariants = useMemo(
    () => variants.filter((variant) => variant.productId === productId),
    [variants, productId],
  );

  const applyProduct = (value: string) => {
    setProductId(value);
    setVariantId("");
  };

  return (
    <ActionForm
      action={createPriceAction}
      submitLabel="Create price"
      pendingLabel="Creating…"
      cancelHref="/admin/products/prices"
      className="max-w-2xl space-y-4"
    >
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
          Price scope <span className="text-danger">*</span>
        </p>
        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
            <input
              type="radio"
              name="scope"
              value="product"
              checked={scope === "product"}
              onChange={() => setScope("product")}
              className="accent-navy"
            />
            Whole product (all variants)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
            <input
              type="radio"
              name="scope"
              value="variant"
              checked={scope === "variant"}
              onChange={() => setScope("variant")}
              className="accent-navy"
            />
            Single variant
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product" htmlFor="price-product" required>
          <Select
            id="price-product"
            name="productId"
            required
            value={productId}
            onChange={(event) => applyProduct(event.target.value)}
          >
            <option value="">Select a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
        </Field>
        {scope === "variant" && (
          <Field
            label="Variant"
            htmlFor="price-variant"
            required
            hint="Prices can be variant-specific."
          >
            <Select
              id="price-variant"
              name="variantId"
              required
              value={variantId}
              onChange={(event) => setVariantId(event.target.value)}
              disabled={productId === ""}
            >
              <option value="">
                {productId === "" ? "Choose a product first" : "Select a variant"}
              </option>
              {productVariants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name} — {variant.sku}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Price type" htmlFor="price-type" required>
          <Select id="price-type" name="priceType" required defaultValue="selling">
            <option value="selling">Selling</option>
            <option value="sale">Sale</option>
          </Select>
        </Field>
        <Field label="Amount (GH₵)" htmlFor="price-amount" required>
          <TextInput
            id="price-amount"
            name="amount"
            type="number"
            required
            min="0"
            step="0.01"
            inputMode="decimal"
          />
        </Field>
        <Field label="Location" htmlFor="price-location" hint="Leave blank for all locations.">
          <Select id="price-location" name="locationId" defaultValue="">
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Valid from" htmlFor="price-valid-from" hint="Blank = effective immediately.">
          <TextInput id="price-valid-from" name="validFrom" type="datetime-local" />
        </Field>
        <Field label="Valid to" htmlFor="price-valid-to">
          <TextInput id="price-valid-to" name="validTo" type="datetime-local" />
        </Field>
      </div>
    </ActionForm>
  );
}

export function PriceEditForm({
  price,
  targetLabel,
  locations,
}: {
  price: PriceListItem;
  targetLabel: string;
  locations: { id: string; name: string }[];
}) {
  return (
    <ActionForm
      action={updatePriceAction}
      submitLabel="Save changes"
      pendingLabel="Saving…"
      cancelHref="/admin/products/prices"
      className="max-w-2xl space-y-4"
    >
      <input type="hidden" name="priceId" value={price.id} />
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
          Applied to
        </p>
        <p className="rounded-md border border-line bg-line/30 px-2.5 py-1.5 text-[13px] font-medium text-ink">
          {targetLabel}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Price type" htmlFor="price-type" required>
          <Select id="price-type" name="priceType" required defaultValue={price.priceType}>
            <option value="selling">Selling</option>
            <option value="sale">Sale</option>
          </Select>
        </Field>
        <Field label="Amount (GH₵)" htmlFor="price-amount" required>
          <TextInput
            id="price-amount"
            name="amount"
            type="number"
            required
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={price.amount}
          />
        </Field>
        <Field label="Location" htmlFor="price-location" hint="Leave blank for all locations.">
          <Select id="price-location" name="locationId" defaultValue={price.locationId ?? ""}>
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Valid from" htmlFor="price-valid-from">
          <TextInput
            id="price-valid-from"
            name="validFrom"
            type="datetime-local"
            defaultValue={toDateTimeLocal(price.validFrom)}
          />
        </Field>
        <Field label="Valid to" htmlFor="price-valid-to">
          <TextInput
            id="price-valid-to"
            name="validTo"
            type="datetime-local"
            defaultValue={toDateTimeLocal(price.validTo)}
          />
        </Field>
      </div>
    </ActionForm>
  );
}