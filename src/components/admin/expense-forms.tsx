"use client";

import { ActionForm, Checkbox, Field, Select, TextArea, TextInput } from "@/components/admin/ui";
import {
  createExpenseAction,
  createExpenseCategoryAction,
  updateExpenseCategoryAction,
} from "@/lib/admin/expense-actions";

export function ExpenseForm({
  categories,
  suppliers,
  locations,
}: {
  categories: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  locations: { id: string; name: string }[];
}) {
  return (
    <ActionForm
      action={createExpenseAction}
      submitLabel="Record expense"
      pendingLabel="Recording…"
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Category" htmlFor="exp-category" required>
          <Select id="exp-category" name="categoryId" required>
            <option value="">Select category…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount (GH₵)" htmlFor="exp-amount" required>
          <TextInput id="exp-amount" name="amount" type="number" min="0.01" step="0.01" required />
        </Field>
        <Field label="Date" htmlFor="exp-date" required>
          <TextInput id="exp-date" name="expenseDate" type="date" required />
        </Field>
        <Field label="Description" htmlFor="exp-description" required>
          <TextInput id="exp-description" name="description" required minLength={3} />
        </Field>
        <Field label="Method" htmlFor="exp-method" required>
          <Select id="exp-method" name="method" required defaultValue="cash">
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile money</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Reference number" htmlFor="exp-reference">
          <TextInput id="exp-reference" name="referenceNumber" />
        </Field>
        <Field label="Supplier (optional)" htmlFor="exp-supplier">
          <Select id="exp-supplier" name="supplierId">
            <option value="">None</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Location (optional)" htmlFor="exp-location">
          <Select id="exp-location" name="locationId">
            <option value="">None</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Notes" htmlFor="exp-notes">
        <TextArea id="exp-notes" name="notes" rows={3} />
      </Field>
    </ActionForm>
  );
}

export function ExpenseCategoryForm() {
  return (
    <ActionForm
      action={createExpenseCategoryAction}
      submitLabel="Create category"
      pendingLabel="Creating…"
      className="space-y-3"
    >
      <Field label="Name" htmlFor="exp-cat-name" required>
        <TextInput id="exp-cat-name" name="name" required minLength={2} />
      </Field>
      <Field label="Description" htmlFor="exp-cat-description">
        <TextInput id="exp-cat-description" name="description" />
      </Field>
    </ActionForm>
  );
}

export function ExpenseCategoryEditForm({
  category,
}: {
  category: { id: string; name: string; description: string | null; isActive: boolean };
}) {
  return (
    <ActionForm
      action={updateExpenseCategoryAction}
      submitLabel="Save"
      pendingLabel="Saving…"
      className="space-y-3"
    >
      <input type="hidden" name="categoryId" value={category.id} />
      <Field label="Name" htmlFor={`exp-cat-edit-${category.id}`} required>
        <TextInput
          id={`exp-cat-edit-${category.id}`}
          name="name"
          required
          minLength={2}
          defaultValue={category.name}
        />
      </Field>
      <Field label="Description" htmlFor={`exp-cat-desc-${category.id}`}>
        <TextInput
          id={`exp-cat-desc-${category.id}`}
          name="description"
          defaultValue={category.description ?? ""}
        />
      </Field>
      <Checkbox
        id={`exp-cat-active-${category.id}`}
        name="isActive"
        label="Active"
        defaultChecked={category.isActive}
      />
    </ActionForm>
  );
}