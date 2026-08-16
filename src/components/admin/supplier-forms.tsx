"use client";

import { ActionForm, Checkbox, Field, Select, TextArea, TextInput } from "@/components/admin/ui";
import {
  createSupplierAction,
  createSupplierProductAction,
  updateSupplierAction,
} from "@/lib/admin/supplier-actions";

export function SupplierForm({
  initial,
  action,
}: {
  initial?: {
    id: string;
    name: string;
    contactPerson: string | null;
    phone: string;
    email: string | null;
    website: string | null;
    status: string;
    paymentTermsDays: number | null;
    notes: string | null;
  };
  action: "create" | "update";
}) {
  return (
    <ActionForm
      action={action === "create" ? createSupplierAction : updateSupplierAction}
      submitLabel={action === "create" ? "Create supplier" : "Save changes"}
      pendingLabel={action === "create" ? "Creating…" : "Saving…"}
      cancelHref={action === "create" ? "/admin/suppliers" : `/admin/suppliers/${initial?.id}`}
      className="max-w-2xl space-y-4"
    >
      {initial && <input type="hidden" name="supplierId" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="supplier-name" required>
          <TextInput
            id="supplier-name"
            name="name"
            required
            minLength={2}
            defaultValue={initial?.name}
          />
        </Field>
        <Field label="Contact person" htmlFor="supplier-contact">
          <TextInput
            id="supplier-contact"
            name="contactPerson"
            defaultValue={initial?.contactPerson ?? ""}
          />
        </Field>
        <Field label="Phone" htmlFor="supplier-phone" required>
          <TextInput
            id="supplier-phone"
            name="phone"
            required
            defaultValue={initial?.phone}
          />
        </Field>
        <Field label="Email" htmlFor="supplier-email">
          <TextInput
            id="supplier-email"
            name="email"
            type="email"
            defaultValue={initial?.email ?? ""}
          />
        </Field>
        <Field label="Website" htmlFor="supplier-website">
          <TextInput
            id="supplier-website"
            name="website"
            type="url"
            defaultValue={initial?.website ?? ""}
          />
        </Field>
        <Field label="Payment terms (days)" htmlFor="supplier-terms">
          <TextInput
            id="supplier-terms"
            name="paymentTermsDays"
            type="number"
            min="0"
            defaultValue={initial?.paymentTermsDays ?? ""}
          />
        </Field>
        <Field label="Status" htmlFor="supplier-status" required>
          <Select
            id="supplier-status"
            name="status"
            required
            defaultValue={initial?.status ?? "active"}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
      </div>
      <Field label="Notes" htmlFor="supplier-notes">
        <TextArea
          id="supplier-notes"
          name="notes"
          rows={3}
          defaultValue={initial?.notes ?? ""}
        />
      </Field>
    </ActionForm>
  );
}

export function SupplierProductForm({
  supplierId,
  variants,
}: {
  supplierId: string;
  variants: { id: string; name: string; sku: string; products: { name: string } | null }[];
}) {
  return (
    <ActionForm
      action={createSupplierProductAction}
      submitLabel="Link variant"
      pendingLabel="Linking…"
      className="max-w-2xl space-y-4"
    >
      <input type="hidden" name="supplierId" value={supplierId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Variant" htmlFor="sp-variant" required>
          <Select id="sp-variant" name="variantId" required>
            <option value="">Select variant…</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name} ({variant.sku}) — {variant.products?.name ?? "—"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Supplier SKU" htmlFor="sp-sku">
          <TextInput id="sp-sku" name="supplierSku" />
        </Field>
        <Field label="Supplier product name" htmlFor="sp-name">
          <TextInput id="sp-name" name="supplierProductName" />
        </Field>
        <Field label="Last cost (GH₵)" htmlFor="sp-cost">
          <TextInput id="sp-cost" name="lastCost" type="number" min="0" step="0.01" />
        </Field>
        <Field label="Lead time (days)" htmlFor="sp-lead">
          <TextInput id="sp-lead" name="leadTimeDays" type="number" min="0" />
        </Field>
        <Field label="Minimum order quantity" htmlFor="sp-moq">
          <TextInput id="sp-moq" name="minimumOrderQuantity" type="number" min="0" step="0.001" />
        </Field>
        <div className="flex items-end">
          <Checkbox id="sp-preferred" name="preferred" label="Preferred supplier for this variant" />
        </div>
      </div>
    </ActionForm>
  );
}