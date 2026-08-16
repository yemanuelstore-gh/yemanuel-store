"use client";

import {
  ActionForm,
  Checkbox,
  Field,
  InlineSubmitForm,
  Select,
  TextArea,
  TextInput,
} from "@/components/admin/ui";
import {
  createImageAction,
  createPriceAction,
  createProductAction,
  createVariantAction,
  deleteImageAction,
  deletePriceAction,
  updateProductAction,
  updateVariantAction,
} from "@/lib/admin/product-actions";

export function ProductForm({
  categories,
  brands,
  initial,
  action,
}: {
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  initial?: {
    id: string;
    name: string;
    slug: string;
    categoryId: string;
    brandId: string | null;
    status: string;
    description: string | null;
  };
  action: "create" | "update";
}) {
  return (
    <ActionForm
      action={action === "create" ? createProductAction : updateProductAction}
      submitLabel={action === "create" ? "Create product" : "Save changes"}
      pendingLabel={action === "create" ? "Creating…" : "Saving…"}
      cancelHref={action === "create" ? "/admin/products" : `/admin/products/${initial?.id}`}
      className="max-w-2xl space-y-4"
    >
      {initial && <input type="hidden" name="productId" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product name" htmlFor="product-name" required>
          <TextInput
            id="product-name"
            name="name"
            required
            minLength={2}
            defaultValue={initial?.name}
          />
        </Field>
        <Field label="Slug" htmlFor="product-slug" hint="Leave blank to generate from the name.">
          <TextInput id="product-slug" name="slug" defaultValue={initial?.slug} />
        </Field>
        <Field label="Category" htmlFor="product-category" required>
          <Select
            id="product-category"
            name="categoryId"
            required
            defaultValue={initial?.categoryId}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Brand" htmlFor="product-brand">
          <Select id="product-brand" name="brandId" defaultValue={initial?.brandId ?? ""}>
            <option value="">No brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="product-status" required>
          <Select
            id="product-status"
            name="status"
            required
            defaultValue={initial?.status ?? "draft"}
          >
            {["draft", "active", "inactive", "archived"].map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Description" htmlFor="product-description">
        <TextArea
          id="product-description"
          name="description"
          rows={4}
          defaultValue={initial?.description ?? ""}
        />
      </Field>
    </ActionForm>
  );
}

export function VariantForm({
  productId,
  initial,
}: {
  productId: string;
  initial?: {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    options: Record<string, unknown> | null;
    status: string;
  };
}) {
  return (
    <ActionForm
      action={initial ? updateVariantAction : createVariantAction}
      submitLabel={initial ? "Save variant" : "Add variant"}
      pendingLabel={initial ? "Saving…" : "Adding…"}
      cancelHref={initial ? `/admin/products/${productId}` : undefined}
      className="space-y-3"
    >
      <input type="hidden" name="productId" value={productId} />
      {initial && <input type="hidden" name="variantId" value={initial.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Variant name" htmlFor="variant-name" required>
          <TextInput
            id="variant-name"
            name="name"
            required
            defaultValue={initial?.name}
            placeholder="e.g. Black, Size M"
          />
        </Field>
        <Field label="SKU" htmlFor="variant-sku" required hint="Unique — SKUs live on variants.">
          <TextInput
            id="variant-sku"
            name="sku"
            required
            defaultValue={initial?.sku}
            placeholder="e.g. YM-BLK-M"
          />
        </Field>
        <Field label="Barcode" htmlFor="variant-barcode">
          <TextInput
            id="variant-barcode"
            name="barcode"
            defaultValue={initial?.barcode ?? ""}
          />
        </Field>
        <Field label="Status" htmlFor="variant-status" required>
          <Select id="variant-status" name="status" required defaultValue={initial?.status ?? "active"}>
            {["active", "inactive"].map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field
        label="Options (JSON)"
        htmlFor="variant-options"
        hint='e.g. {"colour": "Black", "size": "M"}'
      >
        <TextArea
          id="variant-options"
          name="options"
          rows={2}
          defaultValue={
            initial?.options ? JSON.stringify(initial.options, null, 2) : ""
          }
        />
      </Field>
    </ActionForm>
  );
}

export function PriceForm({
  variantId,
  locations,
}: {
  variantId: string;
  locations: { id: string; name: string }[];
}) {
  return (
    <ActionForm
      action={createPriceAction}
      submitLabel="Add price"
      pendingLabel="Adding…"
      className="space-y-3"
    >
      <input type="hidden" name="variantId" value={variantId} />
      <div className="grid gap-3 sm:grid-cols-2">
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
        <Field label="Valid from" htmlFor="price-valid-from">
          <TextInput id="price-valid-from" name="validFrom" type="datetime-local" />
        </Field>
        <Field label="Valid to" htmlFor="price-valid-to">
          <TextInput id="price-valid-to" name="validTo" type="datetime-local" />
        </Field>
      </div>
    </ActionForm>
  );
}

export function DeletePriceForm({ priceId }: { priceId: string }) {
  return (
    <InlineSubmitForm
      action={deletePriceAction}
      label="Delete"
      pendingLabel="Deleting…"
    >
      <input type="hidden" name="priceId" value={priceId} />
    </InlineSubmitForm>
  );
}

export function ImageForm({
  productId,
  hasImages,
}: {
  productId: string;
  hasImages: boolean;
}) {
  return (
    <ActionForm
      action={createImageAction}
      submitLabel="Add image"
      pendingLabel="Adding…"
      className="space-y-3"
    >
      <input type="hidden" name="productId" value={productId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Image URL" htmlFor="image-url" required>
          <TextInput
            id="image-url"
            name="url"
            type="url"
            required
            placeholder="https://…"
          />
        </Field>
        <Field label="Alt text" htmlFor="image-alt">
          <TextInput id="image-alt" name="altText" />
        </Field>
        <Field label="Sort order" htmlFor="image-sort">
          <TextInput id="image-sort" name="sortOrder" type="number" defaultValue="0" />
        </Field>
        <div className="flex items-end">
          <Checkbox
            id="image-primary"
            name="isPrimary"
            label="Primary image"
            defaultChecked={!hasImages}
          />
        </div>
      </div>
    </ActionForm>
  );
}

export function DeleteImageForm({ imageId }: { imageId: string }) {
  return (
    <InlineSubmitForm
      action={deleteImageAction}
      label="Remove"
      pendingLabel="Removing…"
    >
      <input type="hidden" name="imageId" value={imageId} />
    </InlineSubmitForm>
  );
}

export function VariantStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={
        status === "active"
          ? "inline-flex rounded bg-navy-soft px-1.5 py-0.5 text-[11px] font-medium text-navy"
          : "inline-flex rounded bg-line/60 px-1.5 py-0.5 text-[11px] font-medium text-ink-soft"
      }
    >
      {status}
    </span>
  );
}