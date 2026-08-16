"use client";

import { ActionForm, Field, Select, TextArea, TextInput } from "@/components/admin/ui";
import { updateCustomerAction } from "@/lib/admin/customer-actions";

export function CustomerForm({
  initial,
}: {
  initial: {
    id: string;
    firstName: string;
    lastName: string;
    businessName: string | null;
    phone: string;
    email: string | null;
    tinNumber: string | null;
    customerType: string;
    status: string;
    notes: string | null;
  };
}) {
  return (
    <ActionForm
      action={updateCustomerAction}
      submitLabel="Save changes"
      pendingLabel="Saving…"
      className="max-w-2xl space-y-4"
    >
      <input type="hidden" name="customerId" value={initial.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="customer-first" required>
          <TextInput
            id="customer-first"
            name="firstName"
            required
            defaultValue={initial.firstName}
          />
        </Field>
        <Field label="Last name" htmlFor="customer-last" required>
          <TextInput
            id="customer-last"
            name="lastName"
            required
            defaultValue={initial.lastName}
          />
        </Field>
        <Field label="Business name" htmlFor="customer-business">
          <TextInput
            id="customer-business"
            name="businessName"
            defaultValue={initial.businessName ?? ""}
          />
        </Field>
        <Field label="Phone" htmlFor="customer-phone" required>
          <TextInput
            id="customer-phone"
            name="phone"
            required
            defaultValue={initial.phone}
          />
        </Field>
        <Field label="Email" htmlFor="customer-email">
          <TextInput
            id="customer-email"
            name="email"
            type="email"
            defaultValue={initial.email ?? ""}
          />
        </Field>
        <Field label="TIN number" htmlFor="customer-tin">
          <TextInput
            id="customer-tin"
            name="tinNumber"
            defaultValue={initial.tinNumber ?? ""}
          />
        </Field>
        <Field label="Customer type" htmlFor="customer-type" required>
          <Select
            id="customer-type"
            name="customerType"
            required
            defaultValue={initial.customerType}
          >
            <option value="individual">Individual</option>
            <option value="business">Business</option>
          </Select>
        </Field>
        <Field label="Status" htmlFor="customer-status" required>
          <Select
            id="customer-status"
            name="status"
            required
            defaultValue={initial.status}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
          </Select>
        </Field>
      </div>
      <Field label="Notes" htmlFor="customer-notes">
        <TextArea
          id="customer-notes"
          name="notes"
          rows={3}
          defaultValue={initial.notes ?? ""}
        />
      </Field>
    </ActionForm>
  );
}