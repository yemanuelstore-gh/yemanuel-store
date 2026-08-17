"use client";

import { ActionForm, Field, Select, TextArea, TextInput } from "@/components/admin/ui";
import {
  createRoleAction,
  createStaffAction,
  updateRoleAction,
  updateRolePermissionsAction,
  updateStaffAction,
  updateStaffRolesAction,
} from "@/lib/admin/staff-actions";

export function StaffForm({
  initial,
  roles,
}: {
  initial?: {
    id: string;
    profileId: string;
    fullName: string;
    phone: string | null;
    position: string;
    status: string;
    hireDate: string | null;
    notes: string | null;
  };
  roles: { id: string; name: string }[];
}) {
  const isCreate = initial === undefined;
  return (
    <ActionForm
      action={isCreate ? createStaffAction : updateStaffAction}
      submitLabel={isCreate ? "Create staff account" : "Save changes"}
      pendingLabel={isCreate ? "Creating…" : "Saving…"}
      cancelHref={isCreate ? "/admin/staff" : `/admin/staff/${initial.id}`}
      className="max-w-2xl space-y-4"
    >
      {initial && <input type="hidden" name="staffId" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="staff-name" required>
          <TextInput
            id="staff-name"
            name="fullName"
            required
            minLength={2}
            defaultValue={initial?.fullName}
          />
        </Field>
        <Field label="Email" htmlFor="staff-email" required>
          <TextInput
            id="staff-email"
            name="email"
            type="email"
            required
            disabled={!isCreate}
            defaultValue={initial ? undefined : undefined}
            placeholder={isCreate ? "name@yemanuelstore.com" : "Email cannot be changed"}
          />
        </Field>
        <Field label="Phone" htmlFor="staff-phone">
          <TextInput id="staff-phone" name="phone" defaultValue={initial?.phone ?? ""} />
        </Field>
        <Field label="Position" htmlFor="staff-position" required>
          <TextInput
            id="staff-position"
            name="position"
            required
            minLength={2}
            defaultValue={initial?.position}
            placeholder="e.g. Cashier, Sales Staff"
          />
        </Field>
        <Field label="Status" htmlFor="staff-status" required>
          <Select id="staff-status" name="status" required defaultValue={initial?.status ?? "active"}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </Select>
        </Field>
        <Field label="Hire date" htmlFor="staff-hire-date">
          <TextInput
            id="staff-hire-date"
            name="hireDate"
            type="date"
            defaultValue={initial?.hireDate ?? ""}
          />
        </Field>
      </div>
      {isCreate && roles.length > 0 && (
        <Field
          label="Roles"
          htmlFor="staff-roles"
          hint="The staff member can sign in immediately and will inherit these permissions."
        >
          <Select id="staff-roles" name="roleIds" multiple className="h-24">
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Notes" htmlFor="staff-notes">
        <TextArea id="staff-notes" name="notes" rows={3} defaultValue={initial?.notes ?? ""} />
      </Field>
    </ActionForm>
  );
}

export function StaffRolesForm({
  staffId,
  roles,
  assignedRoleIds,
}: {
  staffId: string;
  roles: { id: string; name: string; description: string }[];
  assignedRoleIds: string[];
}) {
  return (
    <ActionForm
      action={updateStaffRolesAction}
      submitLabel="Save roles"
      pendingLabel="Saving…"
      className="max-w-2xl space-y-3"
    >
      <input type="hidden" name="staffId" value={staffId} />
      <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-md border border-line bg-paper p-3">
        {roles.map((role) => (
          <label
            key={role.id}
            className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-navy-soft/50"
          >
            <input
              type="checkbox"
              name="roleIds"
              value={role.id}
              defaultChecked={assignedRoleIds.includes(role.id)}
              className="mt-0.5 h-4 w-4 rounded border-line-strong accent-navy"
            />
            <span>
              <span className="block text-[13px] font-medium text-ink">{role.name}</span>
              <span className="block text-[11px] leading-4 text-ink-faint">
                {role.description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </ActionForm>
  );
}

export function RoleForm({
  initial,
}: {
  initial?: {
    id: string;
    name: string;
    description: string;
    isSystem: boolean;
  };
}) {
  const isCreate = initial === undefined;
  return (
    <ActionForm
      action={isCreate ? createRoleAction : updateRoleAction}
      submitLabel={isCreate ? "Create role" : "Save changes"}
      pendingLabel={isCreate ? "Creating…" : "Saving…"}
      cancelHref={isCreate ? "/admin/roles" : `/admin/roles/${initial.id}`}
      className="max-w-2xl space-y-4"
    >
      {initial && <input type="hidden" name="roleId" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" htmlFor="role-code" required>
          <TextInput
            id="role-code"
            name="code"
            required
            pattern="[a-z][a-z0-9_]*"
            disabled={!isCreate}
            defaultValue={initial?.isSystem ? initial?.name.toLowerCase() : undefined}
            placeholder="e.g. cashier"
          />
        </Field>
        <Field label="Name" htmlFor="role-name" required>
          <TextInput
            id="role-name"
            name="name"
            required
            minLength={2}
            defaultValue={initial?.name}
          />
        </Field>
      </div>
      <Field label="Description" htmlFor="role-description" required>
        <TextArea
          id="role-description"
          name="description"
          required
          minLength={2}
          rows={3}
          defaultValue={initial?.description}
        />
      </Field>
    </ActionForm>
  );
}

export function RolePermissionsForm({
  role,
  permissions,
  permissionIds,
}: {
  role: { id: string; name: string; isSystem: boolean };
  permissions: { id: string; code: string; description: string }[];
  permissionIds: string[];
}) {
  const grouped = new Map<string, typeof permissions>();
  for (const permission of permissions) {
    const group = permission.code.split(".")[0];
    const list = grouped.get(group) ?? [];
    list.push(permission);
    grouped.set(group, list);
  }

  return (
    <ActionForm
      action={updateRolePermissionsAction}
      submitLabel="Save permissions"
      pendingLabel="Saving…"
      className="space-y-4"
    >
      <input type="hidden" name="roleId" value={role.id} />
      {role.isSystem && (
        <p className="rounded-md border border-gold/30 bg-gold-soft/50 px-3 py-2 text-[11px] leading-5 text-gold-dark">
          This is a system role. Changing its permissions affects the owner account
          immediately.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...grouped.entries()].map(([group, list]) => (
          <div key={group} className="rounded-md border border-line bg-paper p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
              {group}
            </p>
            <div className="space-y-1">
              {list.map((permission) => (
                <label
                  key={permission.id}
                  className="flex cursor-pointer items-start gap-2 rounded-sm px-1 py-1 transition-colors hover:bg-navy-soft/40"
                >
                  <input
                    type="checkbox"
                    name="permissionIds"
                    value={permission.id}
                    defaultChecked={permissionIds.includes(permission.id)}
                    className="mt-0.5 h-4 w-4 rounded border-line-strong accent-navy"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[11px] font-medium text-ink">
                      {permission.code}
                    </span>
                    <span className="block text-[11px] leading-4 text-ink-faint">
                      {permission.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ActionForm>
  );
}