"use client";

import { ActionForm, Checkbox, Field, Select, TextInput } from "@/components/admin/ui";
import {
  createDeliveryMethodAction,
  createLocationAction,
  updateDeliveryMethodAction,
  updateDeliveryRateAction,
  updateLocationStatusAction,
  upsertSettingAction,
} from "@/lib/admin/settings-actions";

export function LocationForm({ regions }: { regions: { id: string; name: string }[] }) {
  return (
    <ActionForm
      action={createLocationAction}
      submitLabel="Create location"
      pendingLabel="Creating…"
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="loc-name" required>
          <TextInput id="loc-name" name="name" required minLength={2} />
        </Field>
        <Field label="Type" htmlFor="loc-type" required>
          <Select id="loc-type" name="locationType" required defaultValue="store">
            <option value="store">Store</option>
            <option value="warehouse">Warehouse</option>
          </Select>
        </Field>
        <Field label="Region" htmlFor="loc-region" required>
          <Select id="loc-region" name="regionId" required>
            <option value="">Select region…</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="City" htmlFor="loc-city" required>
          <TextInput id="loc-city" name="city" required />
        </Field>
        <Field label="Address line 1" htmlFor="loc-addr1" required>
          <TextInput id="loc-addr1" name="addressLine1" required />
        </Field>
        <Field label="Address line 2" htmlFor="loc-addr2">
          <TextInput id="loc-addr2" name="addressLine2" />
        </Field>
        <Field label="Phone" htmlFor="loc-phone">
          <TextInput id="loc-phone" name="phone" type="tel" />
        </Field>
      </div>
    </ActionForm>
  );
}

export function LocationStatusForm({ locationId, current }: { locationId: string; current: string }) {
  return (
    <ActionForm
      action={updateLocationStatusAction}
      submitLabel="Update"
      pendingLabel="Updating…"
      className="space-y-3"
    >
      <input type="hidden" name="locationId" value={locationId} />
      <Field label="Status" htmlFor={`loc-status-${locationId}`} required>
        <Select
          id={`loc-status-${locationId}`}
          name="status"
          required
          defaultValue={current}
          className="w-36"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </Field>
    </ActionForm>
  );
}

export function DeliveryMethodForm() {
  return (
    <ActionForm
      action={createDeliveryMethodAction}
      submitLabel="Create method"
      pendingLabel="Creating…"
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Name" htmlFor="dm-name" required>
          <TextInput id="dm-name" name="name" required minLength={2} />
        </Field>
        <Field label="Kind" htmlFor="dm-kind" required hint="Pickup collects at a store location.">
          <Select id="dm-kind" name="kind" required defaultValue="delivery">
            <option value="delivery">Delivery</option>
            <option value="pickup">Pickup</option>
          </Select>
        </Field>
        <Field label="Sort order" htmlFor="dm-sort">
          <TextInput id="dm-sort" name="sortOrder" type="number" defaultValue="0" />
        </Field>
      </div>
      <p className="text-[11px] text-ink-faint">
        Fees are set per region in the Delivery rates section below.
      </p>
    </ActionForm>
  );
}

export function DeliveryMethodEditForm({
  method,
}: {
  method: { id: string; name: string; kind: string; isActive: boolean; sortOrder: number };
}) {
  return (
    <ActionForm
      action={updateDeliveryMethodAction}
      submitLabel="Save"
      pendingLabel="Saving…"
      className="space-y-3"
    >
      <input type="hidden" name="methodId" value={method.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor={`dm-edit-${method.id}`} required>
          <TextInput
            id={`dm-edit-${method.id}`}
            name="name"
            required
            minLength={2}
            defaultValue={method.name}
          />
        </Field>
        <Field label="Kind" htmlFor={`dm-kind-${method.id}`}>
          <Select
            id={`dm-kind-${method.id}`}
            name="kind"
            defaultValue={method.kind}
          >
            <option value="delivery">Delivery</option>
            <option value="pickup">Pickup</option>
          </Select>
        </Field>
        <Field label="Sort order" htmlFor={`dm-sort-${method.id}`}>
          <TextInput
            id={`dm-sort-${method.id}`}
            name="sortOrder"
            type="number"
            defaultValue={method.sortOrder}
          />
        </Field>
        <div className="flex items-end pb-1">
          <Checkbox
            id={`dm-active-${method.id}`}
            name="isActive"
            label="Active"
            defaultChecked={method.isActive}
          />
        </div>
      </div>
    </ActionForm>
  );
}

export function DeliveryRateForm({
  rate,
}: {
  rate: {
    id: string;
    regionName: string;
    fee: number;
    etaMinDays: number;
    etaMaxDays: number;
    isActive: boolean;
  };
}) {
  return (
    <ActionForm
      action={updateDeliveryRateAction}
      submitLabel="Save"
      pendingLabel="Saving…"
      className="flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="rateId" value={rate.id} />
      <span className="w-32 pb-2 text-[13px] font-medium text-ink">
        {rate.regionName}
      </span>
      <Field label="Fee (GH₵)" htmlFor={`rate-fee-${rate.id}`}>
        <TextInput
          id={`rate-fee-${rate.id}`}
          name="fee"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={rate.fee}
          className="w-24"
        />
      </Field>
      <Field label="ETA min (days)" htmlFor={`rate-min-${rate.id}`}>
        <TextInput
          id={`rate-min-${rate.id}`}
          name="etaMinDays"
          type="number"
          min="0"
          step="1"
          required
          defaultValue={rate.etaMinDays}
          className="w-20"
        />
      </Field>
      <Field label="ETA max (days)" htmlFor={`rate-max-${rate.id}`}>
        <TextInput
          id={`rate-max-${rate.id}`}
          name="etaMaxDays"
          type="number"
          min="0"
          step="1"
          required
          defaultValue={rate.etaMaxDays}
          className="w-20"
        />
      </Field>
      <div className="pb-2">
        <Checkbox
          id={`rate-active-${rate.id}`}
          name="isActive"
          label="Active"
          defaultChecked={rate.isActive}
        />
      </div>
    </ActionForm>
  );
}

export function SettingForm() {
  return (
    <ActionForm
      action={upsertSettingAction}
      submitLabel="Save setting"
      pendingLabel="Saving…"
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Key" htmlFor="set-key" required>
          <TextInput id="set-key" name="key" required placeholder="e.g. store.hours" />
        </Field>
        <Field label="Value" htmlFor="set-value" required>
          <TextInput id="set-value" name="value" required placeholder="e.g. 9:00 – 20:00" />
        </Field>
      </div>
      <p className="text-[11px] text-ink-faint">
        Adds a new global setting, or updates the value if the key already exists.
      </p>
    </ActionForm>
  );
}