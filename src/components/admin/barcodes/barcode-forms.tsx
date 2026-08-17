"use client";

import { ActionForm, Field, InlineSubmitForm, TextInput } from "@/components/admin/ui";
import { updateVariantBarcodeAction } from "@/lib/admin/product-actions";

export function AssignBarcodeForm({
  variantId,
  initialBarcode,
}: {
  variantId: string;
  initialBarcode?: string | null;
}) {
  return (
    <ActionForm
      action={updateVariantBarcodeAction}
      submitLabel={initialBarcode ? "Save barcode" : "Assign barcode"}
      pendingLabel="Saving…"
      className="space-y-3"
    >
      <input type="hidden" name="variantId" value={variantId} />
      <Field
        label="Barcode"
        htmlFor="barcode-value"
        hint="Type or scan a barcode. Duplicate barcodes are rejected."
      >
        <TextInput
          id="barcode-value"
          name="barcode"
          defaultValue={initialBarcode ?? ""}
          placeholder="Scan or type barcode"
          autoFocus
        />
      </Field>
    </ActionForm>
  );
}

export function ClearBarcodeForm({ variantId }: { variantId: string }) {
  return (
    <InlineSubmitForm
      action={updateVariantBarcodeAction}
      label="Clear"
      pendingLabel="Clearing…"
      variant="secondary"
    >
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="barcode" value="" />
    </InlineSubmitForm>
  );
}