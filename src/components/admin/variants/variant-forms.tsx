"use client";

import {
  ActionForm,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/admin/ui";
import {
  createImageAction,
  createVariantAction,
  updateVariantAction,
} from "@/lib/admin/product-actions";

export function VariantCreateForm({
  products,
  initialProductId,
}: {
  products: { id: string; name: string; status: string }[];
  initialProductId?: string;
}) {
  return (
    <ActionForm
      action={createVariantAction}
      submitLabel="Create variant"
      pendingLabel="Creating…"
      cancelHref="/admin/products/variants"
      className="max-w-2xl space-y-4"
    >
      <input type="hidden" name="redirect" value="detail" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product" htmlFor="variant-product" required>
          <Select
            id="variant-product"
            name="productId"
            required
            defaultValue={initialProductId ?? ""}
          >
            <option value="">Select a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Variant name" htmlFor="variant-name" required>
          <TextInput
            id="variant-name"
            name="name"
            required
            placeholder="e.g. Black, Size M"
          />
        </Field>
        <Field label="SKU" htmlFor="variant-sku" required hint="Unique — SKUs live on variants.">
          <TextInput
            id="variant-sku"
            name="sku"
            required
            placeholder="e.g. YM-BLK-M"
          />
        </Field>
        <Field label="Barcode" htmlFor="variant-barcode" hint="Optional EAN / UPC for scanner lookup.">
          <TextInput id="variant-barcode" name="barcode" placeholder="e.g. 7741589147269" />
        </Field>
        <Field label="Status" htmlFor="variant-status" required>
          <Select id="variant-status" name="status" required defaultValue="active">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
      </div>
      <Field
        label="Options (JSON)"
        htmlFor="variant-options"
        hint='e.g. {"colour": "Black", "size": "M"}'
      >
        <TextArea id="variant-options" name="options" rows={2} />
      </Field>
    </ActionForm>
  );
}

export function VariantEditForm({
  variant,
  productName,
}: {
  variant: {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    options: Record<string, unknown> | null;
    status: string;
  };
  productName: string;
}) {
  return (
    <ActionForm
      action={updateVariantAction}
      submitLabel="Save changes"
      pendingLabel="Saving…"
      cancelHref={`/admin/products/variants/${variant.id}`}
      className="max-w-2xl space-y-4"
    >
      <input type="hidden" name="variantId" value={variant.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product" htmlFor="variant-product" required>
          <TextInput
            id="variant-product"
            value={productName}
            disabled
            className="disabled:bg-line/40"
          />
        </Field>
        <Field label="Variant name" htmlFor="variant-name" required>
          <TextInput
            id="variant-name"
            name="name"
            required
            defaultValue={variant.name}
          />
        </Field>
        <Field label="SKU" htmlFor="variant-sku" required hint="Unique — SKUs live on variants.">
          <TextInput id="variant-sku" name="sku" required defaultValue={variant.sku} />
        </Field>
        <Field label="Barcode" htmlFor="variant-barcode" hint="Optional EAN / UPC for scanner lookup.">
          <TextInput
            id="variant-barcode"
            name="barcode"
            defaultValue={variant.barcode ?? ""}
          />
        </Field>
        <Field label="Status" htmlFor="variant-status" required>
          <Select id="variant-status" name="status" required defaultValue={variant.status}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
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
          rows={3}
          defaultValue={variant.options ? JSON.stringify(variant.options, null, 2) : ""}
        />
      </Field>
    </ActionForm>
  );
}

export function VariantImageForm({
  productId,
  variantId,
}: {
  productId: string;
  variantId: string;
}) {
  return (
    <ActionForm
      action={createImageAction}
      submitLabel="Add variant image"
      pendingLabel="Adding…"
      className="max-w-2xl space-y-3"
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="variantId" value={variantId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Image URL" htmlFor="variant-image-url" required>
          <TextInput
            id="variant-image-url"
            name="url"
            type="url"
            required
            placeholder="https://…"
          />
        </Field>
        <Field label="Alt text" htmlFor="variant-image-alt">
          <TextInput id="variant-image-alt" name="altText" />
        </Field>
      </div>
    </ActionForm>
  );
}