"use client";

import { ActionForm, Field, Select, TextArea, TextInput } from "@/components/admin/ui";
import {
  createBrandAction,
  createCategoryAction,
  updateBrandAction,
  updateCategoryAction,
} from "@/lib/admin/catalogue-actions";

export function CategoryForm({
  categories,
  initial,
  action,
}: {
  categories: { id: string; name: string; parent_id: string | null }[];
  initial?: {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    description: string | null;
    imageUrl: string | null;
    sortOrder: number;
    status: string;
  };
  action: "create" | "update";
}) {
  return (
    <ActionForm
      action={action === "create" ? createCategoryAction : updateCategoryAction}
      submitLabel={action === "create" ? "Create category" : "Save changes"}
      pendingLabel={action === "create" ? "Creating…" : "Saving…"}
      cancelHref={action === "create" ? "/admin/categories" : `/admin/categories/${initial?.id}`}
      className="max-w-xl space-y-4"
    >
      {initial && <input type="hidden" name="categoryId" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="category-name" required>
          <TextInput
            id="category-name"
            name="name"
            required
            minLength={2}
            defaultValue={initial?.name}
          />
        </Field>
        <Field label="Slug" htmlFor="category-slug" hint="Leave blank to generate from the name.">
          <TextInput id="category-slug" name="slug" defaultValue={initial?.slug} />
        </Field>
        <Field label="Parent category" htmlFor="category-parent">
          <Select
            id="category-parent"
            name="parentId"
            defaultValue={initial?.parentId ?? ""}
          >
            <option value="">No parent (top level)</option>
            {categories
              .filter((category) => category.id !== initial?.id)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="category-status" required>
          <Select
            id="category-status"
            name="status"
            required
            defaultValue={initial?.status ?? "active"}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
        <Field label="Sort order" htmlFor="category-sort">
          <TextInput
            id="category-sort"
            name="sortOrder"
            type="number"
            defaultValue={initial?.sortOrder ?? 0}
          />
        </Field>
        <Field label="Image URL" htmlFor="category-image">
          <TextInput
            id="category-image"
            name="imageUrl"
            type="url"
            defaultValue={initial?.imageUrl ?? ""}
          />
        </Field>
      </div>
      <Field label="Description" htmlFor="category-description">
        <TextArea
          id="category-description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
        />
      </Field>
    </ActionForm>
  );
}

export function BrandForm({
  initial,
  action,
}: {
  initial?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    status: string;
  };
  action: "create" | "update";
}) {
  return (
    <ActionForm
      action={action === "create" ? createBrandAction : updateBrandAction}
      submitLabel={action === "create" ? "Create brand" : "Save changes"}
      pendingLabel={action === "create" ? "Creating…" : "Saving…"}
      cancelHref={action === "create" ? "/admin/brands" : `/admin/brands/${initial?.id}`}
      className="max-w-xl space-y-4"
    >
      {initial && <input type="hidden" name="brandId" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="brand-name" required>
          <TextInput
            id="brand-name"
            name="name"
            required
            minLength={2}
            defaultValue={initial?.name}
          />
        </Field>
        <Field label="Slug" htmlFor="brand-slug" hint="Leave blank to generate from the name.">
          <TextInput id="brand-slug" name="slug" defaultValue={initial?.slug} />
        </Field>
        <Field label="Status" htmlFor="brand-status" required>
          <Select
            id="brand-status"
            name="status"
            required
            defaultValue={initial?.status ?? "active"}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
      </div>
      <Field label="Description" htmlFor="brand-description">
        <TextArea
          id="brand-description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
        />
      </Field>
    </ActionForm>
  );
}