"use client";

import {
  ActionForm,
  Field,
  InlineSubmitForm,
  Select,
  TextArea,
  TextInput,
} from "@/components/admin/ui";
import {
  addStructureComponentAction,
  createDepartmentAction,
  createEmployeeAction,
  createIncomeTaxSlabAction,
  createPayrollPeriodAction,
  createSalaryComponentAction,
  createSalaryStructureAction,
  removeStructureComponentAction,
  setDepartmentStatusAction,
  setEmployeeStatusAction,
  setIncomeTaxSlabStatusAction,
  setPayrollPeriodStatusAction,
  setSalaryComponentStatusAction,
  setSalaryStructureStatusAction,
  updateDepartmentAction,
  updateEmployeeAction,
  updateIncomeTaxSlabAction,
  updatePayrollPeriodAction,
  updateSalaryComponentAction,
  updateSalaryStructureAction,
} from "@/lib/admin/hr-actions";
import {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  GENDERS,
  SALARY_COMPONENT_TYPES,
  employeeStatusLabel,
  employmentTypeLabel,
  genderLabel,
  salaryComponentTypeLabel,
} from "@/lib/admin/hr-constants";
import type {
  ComponentOption,
  DepartmentOption,
  StaffOption,
  StructureOption,
} from "@/lib/admin/hr";

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

export type DepartmentFormInitial = {
  id: string;
  name: string;
  description: string | null;
};

export function DepartmentForm({
  initial,
  action,
}: {
  initial?: DepartmentFormInitial;
  action: "create" | "update";
}) {
  return (
    <ActionForm
      action={action === "create" ? createDepartmentAction : updateDepartmentAction}
      submitLabel={action === "create" ? "Create department" : "Save changes"}
      pendingLabel={action === "create" ? "Creating…" : "Saving…"}
      cancelHref="/admin/hr/departments"
      className="max-w-2xl space-y-4"
    >
      {initial && <input type="hidden" name="departmentId" value={initial.id} />}
      <Field label="Department name" htmlFor="dept-name" required>
        <TextInput
          id="dept-name"
          name="name"
          required
          minLength={2}
          defaultValue={initial?.name}
        />
      </Field>
      <Field label="Description" htmlFor="dept-description">
        <TextArea
          id="dept-description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
        />
      </Field>
    </ActionForm>
  );
}

export function DepartmentStatusForm({
  departmentId,
  isActive,
}: {
  departmentId: string;
  isActive: boolean;
}) {
  return (
    <InlineSubmitForm
      action={setDepartmentStatusAction}
      label={isActive ? "Deactivate" : "Activate"}
      pendingLabel={isActive ? "Deactivating…" : "Activating…"}
      variant={isActive ? "danger" : "primary"}
    >
      <input type="hidden" name="departmentId" value={departmentId} />
      <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />
    </InlineSubmitForm>
  );
}

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

export type EmployeeFormInitial = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  hireDate: string;
  employmentType: string;
  employmentStatus: string;
  jobTitle: string | null;
  socialSecurityNumber: string | null;
  departmentId: string | null;
  structureId: string | null;
  staffId: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
};

export function EmployeeForm({
  initial,
  action,
  departments,
  structures,
  components,
  staffOptions,
}: {
  initial?: EmployeeFormInitial;
  action: "create" | "update";
  departments: DepartmentOption[];
  structures: StructureOption[];
  components: ComponentOption[];
  staffOptions: StaffOption[];
}) {
  return (
    <ActionForm
      action={action === "create" ? createEmployeeAction : updateEmployeeAction}
      submitLabel={action === "create" ? "Create employee" : "Save changes"}
      pendingLabel={action === "create" ? "Creating…" : "Saving…"}
      cancelHref={
        action === "create" ? "/admin/hr/employees" : `/admin/hr/employees/${initial?.id}`
      }
      className="max-w-2xl space-y-4"
    >
      {initial && <input type="hidden" name="employeeId" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="emp-first" required>
          <TextInput
            id="emp-first"
            name="firstName"
            required
            minLength={2}
            defaultValue={initial?.firstName}
          />
        </Field>
        <Field label="Last name" htmlFor="emp-last" required>
          <TextInput
            id="emp-last"
            name="lastName"
            required
            minLength={2}
            defaultValue={initial?.lastName}
          />
        </Field>
        <Field label="Email" htmlFor="emp-email">
          <TextInput
            id="emp-email"
            name="email"
            type="email"
            defaultValue={initial?.email ?? ""}
          />
        </Field>
        <Field
          label="Phone"
          htmlFor="emp-phone"
          hint="Ghana number, e.g. 0244 123 456 or +233 24 412 3456."
        >
          <TextInput
            id="emp-phone"
            name="phone"
            defaultValue={initial?.phone ?? ""}
            placeholder="0244 123 456"
          />
        </Field>
        <Field label="Gender" htmlFor="emp-gender">
          <Select id="emp-gender" name="gender" defaultValue={initial?.gender ?? ""}>
            <option value="">Not specified</option>
            {GENDERS.map((gender) => (
              <option key={gender} value={gender}>
                {genderLabel(gender)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date of birth" htmlFor="emp-dob">
          <TextInput
            id="emp-dob"
            name="dateOfBirth"
            type="date"
            defaultValue={initial?.dateOfBirth ?? ""}
          />
        </Field>
        <Field label="Hire date" htmlFor="emp-hire" required>
          <TextInput
            id="emp-hire"
            name="hireDate"
            type="date"
            required
            defaultValue={initial?.hireDate ?? ""}
          />
        </Field>
        <Field label="Employment type" htmlFor="emp-type" required>
          <Select
            id="emp-type"
            name="employmentType"
            required
            defaultValue={initial?.employmentType ?? "full_time"}
          >
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {employmentTypeLabel(type)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Employment status" htmlFor="emp-status" required>
          <Select
            id="emp-status"
            name="employmentStatus"
            required
            defaultValue={initial?.employmentStatus ?? "active"}
          >
            {EMPLOYEE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {employeeStatusLabel(status)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Job title" htmlFor="emp-title">
          <TextInput id="emp-title" name="jobTitle" defaultValue={initial?.jobTitle ?? ""} />
        </Field>
        <Field
          label="Social security number"
          htmlFor="emp-ssn"
          hint="SSNIT number, e.g. A0000123456789."
        >
          <TextInput
            id="emp-ssn"
            name="socialSecurityNumber"
            defaultValue={initial?.socialSecurityNumber ?? ""}
            placeholder="A0000123456789"
          />
        </Field>
        <Field label="Department" htmlFor="emp-dept">
          <Select id="emp-dept" name="departmentId" defaultValue={initial?.departmentId ?? ""}>
            <option value="">Not assigned</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Salary structure" htmlFor="emp-structure">
          <Select id="emp-structure" name="structureId" defaultValue={initial?.structureId ?? ""}>
            <option value="">Not assigned</option>
            {structures.map((structure) => (
              <option key={structure.id} value={structure.id}>
                {structure.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Staff account"
          htmlFor="emp-staff"
          hint="Optional link to a system staff account."
        >
          <Select id="emp-staff" name="staffId" defaultValue={initial?.staffId ?? ""}>
            <option value="">Not linked</option>
            {staffOptions.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.employeeCode}
                {staff.fullName ? ` — ${staff.fullName}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Emergency contact name" htmlFor="emp-emerg-name">
          <TextInput
            id="emp-emerg-name"
            name="emergencyContactName"
            defaultValue={initial?.emergencyContactName ?? ""}
          />
        </Field>
        <Field label="Emergency contact phone" htmlFor="emp-emerg-phone">
          <TextInput
            id="emp-emerg-phone"
            name="emergencyContactPhone"
            defaultValue={initial?.emergencyContactPhone ?? ""}
            placeholder="0244 123 456"
          />
        </Field>
      </div>
      <Field label="Notes" htmlFor="emp-notes">
        <TextArea id="emp-notes" name="notes" rows={3} defaultValue={initial?.notes ?? ""} />
      </Field>
      {components.length === 0 && (
        <p className="text-sm text-ink-faint">
          Tip: create salary components and a salary structure first to assign pay later.
        </p>
      )}
    </ActionForm>
  );
}

export function EmployeeStatusForm({
  employeeId,
  currentStatus,
}: {
  employeeId: string;
  currentStatus: string;
}) {
  return (
    <InlineSubmitForm
      action={setEmployeeStatusAction}
      label="Change status"
      pendingLabel="Updating…"
      variant="primary"
    >
      <input type="hidden" name="employeeId" value={employeeId} />
      <select
        name="employmentStatus"
        className="h-8 rounded border border-line bg-paper px-2 text-sm text-ink"
        defaultValue={currentStatus}
      >
        {EMPLOYEE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {employeeStatusLabel(status)}
          </option>
        ))}
      </select>
    </InlineSubmitForm>
  );
}

// ---------------------------------------------------------------------------
// Salary components
// ---------------------------------------------------------------------------

export type SalaryComponentFormInitial = {
  id: string;
  name: string;
  componentType: string;
  description: string | null;
};

export function SalaryComponentForm({
  initial,
  action,
}: {
  initial?: SalaryComponentFormInitial;
  action: "create" | "update";
}) {
  return (
    <ActionForm
      action={action === "create" ? createSalaryComponentAction : updateSalaryComponentAction}
      submitLabel={action === "create" ? "Create component" : "Save changes"}
      pendingLabel={action === "create" ? "Creating…" : "Saving…"}
      cancelHref="/admin/hr/salary-components"
      className="max-w-2xl space-y-4"
    >
      {initial && <input type="hidden" name="componentId" value={initial.id} />}
      <Field label="Component name" htmlFor="sc-name" required>
        <TextInput
          id="sc-name"
          name="name"
          required
          minLength={2}
          defaultValue={initial?.name}
          placeholder="e.g. Basic Salary"
        />
      </Field>
      <Field label="Component type" htmlFor="sc-type" required>
        <Select
          id="sc-type"
          name="componentType"
          required
          defaultValue={initial?.componentType ?? "earning"}
        >
          {SALARY_COMPONENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {salaryComponentTypeLabel(type)}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Description"
        htmlFor="sc-description"
        hint="Earnings add to pay; deductions subtract from pay."
      >
        <TextArea
          id="sc-description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
        />
      </Field>
    </ActionForm>
  );
}

export function SalaryComponentStatusForm({
  componentId,
  isActive,
}: {
  componentId: string;
  isActive: boolean;
}) {
  return (
    <InlineSubmitForm
      action={setSalaryComponentStatusAction}
      label={isActive ? "Deactivate" : "Activate"}
      pendingLabel={isActive ? "Deactivating…" : "Activating…"}
      variant={isActive ? "danger" : "primary"}
    >
      <input type="hidden" name="componentId" value={componentId} />
      <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />
    </InlineSubmitForm>
  );
}

// ---------------------------------------------------------------------------
// Salary structures
// ---------------------------------------------------------------------------

export type SalaryStructureFormInitial = {
  id: string;
  name: string;
  description: string | null;
};

export function SalaryStructureForm({
  initial,
  action,
}: {
  initial?: SalaryStructureFormInitial;
  action: "create" | "update";
}) {
  return (
    <ActionForm
      action={action === "create" ? createSalaryStructureAction : updateSalaryStructureAction}
      submitLabel={action === "create" ? "Create structure" : "Save changes"}
      pendingLabel={action === "create" ? "Creating…" : "Saving…"}
      cancelHref={
        action === "create"
          ? "/admin/hr/salary-structures"
          : `/admin/hr/salary-structures/${initial?.id}`
      }
      className="max-w-2xl space-y-4"
    >
      {initial && <input type="hidden" name="structureId" value={initial.id} />}
      <Field label="Structure name" htmlFor="ss-name" required>
        <TextInput
          id="ss-name"
          name="name"
          required
          minLength={2}
          defaultValue={initial?.name}
          placeholder="e.g. Sales Team Structure"
        />
      </Field>
      <Field label="Description" htmlFor="ss-description">
        <TextArea
          id="ss-description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
        />
      </Field>
    </ActionForm>
  );
}

export function SalaryStructureStatusForm({
  structureId,
  isActive,
}: {
  structureId: string;
  isActive: boolean;
}) {
  return (
    <InlineSubmitForm
      action={setSalaryStructureStatusAction}
      label={isActive ? "Deactivate" : "Activate"}
      pendingLabel={isActive ? "Deactivating…" : "Activating…"}
      variant={isActive ? "danger" : "primary"}
    >
      <input type="hidden" name="structureId" value={structureId} />
      <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />
    </InlineSubmitForm>
  );
}

export function StructureComponentForm({
  structureId,
  components,
}: {
  structureId: string;
  components: ComponentOption[];
}) {
  return (
    <InlineSubmitForm
      action={addStructureComponentAction}
      label="Add component"
      pendingLabel="Adding…"
      variant="primary"
    >
      <input type="hidden" name="structureId" value={structureId} />
      <select
        name="componentId"
        className="h-8 rounded border border-line bg-paper px-2 text-sm text-ink"
        defaultValue=""
      >
        <option value="" disabled>
          Choose component…
        </option>
        {components.map((component) => (
          <option key={component.id} value={component.id}>
            {component.name} ({salaryComponentTypeLabel(component.componentType)})
          </option>
        ))}
      </select>
      <input
        type="number"
        name="amount"
        min="0"
        step="0.01"
        placeholder="Amount (GHS)"
        required
        className="h-8 w-40 rounded border border-line bg-paper px-2 text-sm text-ink"
      />
    </InlineSubmitForm>
  );
}

export function StructureComponentRemoveForm({
  structureId,
  componentId,
}: {
  structureId: string;
  componentId: string;
}) {
  return (
    <InlineSubmitForm
      action={removeStructureComponentAction}
      label="Remove"
      pendingLabel="Removing…"
      variant="danger"
    >
      <input type="hidden" name="structureId" value={structureId} />
      <input type="hidden" name="componentId" value={componentId} />
    </InlineSubmitForm>
  );
}

// ---------------------------------------------------------------------------
// Payroll periods
// ---------------------------------------------------------------------------

export type PayrollPeriodFormInitial = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  notes: string | null;
};

export function PayrollPeriodForm({
  initial,
  action,
}: {
  initial?: PayrollPeriodFormInitial;
  action: "create" | "update";
}) {
  return (
    <ActionForm
      action={action === "create" ? createPayrollPeriodAction : updatePayrollPeriodAction}
      submitLabel={action === "create" ? "Create period" : "Save changes"}
      pendingLabel={action === "create" ? "Creating…" : "Saving…"}
      cancelHref="/admin/hr/payroll-periods"
      className="max-w-2xl space-y-4"
    >
      {initial && <input type="hidden" name="periodId" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Period name" htmlFor="pp-name" required>
          <TextInput
            id="pp-name"
            name="name"
            required
            minLength={2}
            defaultValue={initial?.name}
            placeholder="e.g. August 2026"
          />
        </Field>
        <Field label="Status" htmlFor="pp-status">
          <Select id="pp-status" name="status" defaultValue="open" disabled>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </Select>
        </Field>
        <Field label="Start date" htmlFor="pp-start" required>
          <TextInput
            id="pp-start"
            name="startDate"
            type="date"
            required
            defaultValue={initial?.startDate}
          />
        </Field>
        <Field label="End date" htmlFor="pp-end" required>
          <TextInput
            id="pp-end"
            name="endDate"
            type="date"
            required
            defaultValue={initial?.endDate}
          />
        </Field>
      </div>
      <Field label="Notes" htmlFor="pp-notes">
        <TextArea id="pp-notes" name="notes" rows={3} defaultValue={initial?.notes ?? ""} />
      </Field>
    </ActionForm>
  );
}

export function PayrollPeriodStatusForm({
  periodId,
  status,
}: {
  periodId: string;
  status: string;
}) {
  const closing = status !== "closed";
  return (
    <InlineSubmitForm
      action={setPayrollPeriodStatusAction}
      label={closing ? "Close period" : "Reopen period"}
      pendingLabel={closing ? "Closing…" : "Reopening…"}
      variant={closing ? "danger" : "primary"}
    >
      <input type="hidden" name="periodId" value={periodId} />
      <input type="hidden" name="status" value={closing ? "closed" : "open"} />
    </InlineSubmitForm>
  );
}

// ---------------------------------------------------------------------------
// Income tax slabs
// ---------------------------------------------------------------------------

export type IncomeTaxSlabFormInitial = {
  id: string;
  name: string;
  lowerLimit: number;
  upperLimit: number | null;
  rate: number;
};

export function IncomeTaxSlabForm({
  initial,
  action,
}: {
  initial?: IncomeTaxSlabFormInitial;
  action: "create" | "update";
}) {
  return (
    <ActionForm
      action={action === "create" ? createIncomeTaxSlabAction : updateIncomeTaxSlabAction}
      submitLabel={action === "create" ? "Create slab" : "Save changes"}
      pendingLabel={action === "create" ? "Creating…" : "Saving…"}
      cancelHref="/admin/hr/tax-slabs"
      className="max-w-2xl space-y-4"
    >
      {initial && <input type="hidden" name="slabId" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Slab name" htmlFor="tx-name" required>
          <TextInput
            id="tx-name"
            name="name"
            required
            minLength={2}
            defaultValue={initial?.name}
            placeholder="e.g. First bracket"
          />
        </Field>
        <Field
          label="Rate (%)"
          htmlFor="tx-rate"
          required
          hint="Tax rate for income within this bracket, e.g. 5 for 5%."
        >
          <TextInput
            id="tx-rate"
            name="rate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            required
            defaultValue={initial !== undefined ? String(initial.rate) : ""}
            placeholder="5"
          />
        </Field>
        <Field
          label="Lower limit (GHS)"
          htmlFor="tx-lower"
          required
          hint="Monthly income from this amount."
        >
          <TextInput
            id="tx-lower"
            name="lowerLimit"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={initial !== undefined ? String(initial.lowerLimit) : "0"}
          />
        </Field>
        <Field
          label="Upper limit (GHS)"
          htmlFor="tx-upper"
          hint="Leave empty for the highest bracket."
        >
          <TextInput
            id="tx-upper"
            name="upperLimit"
            type="number"
            min="0"
            step="0.01"
            defaultValue={initial?.upperLimit !== null && initial?.upperLimit !== undefined ? String(initial.upperLimit) : ""}
          />
        </Field>
      </div>
    </ActionForm>
  );
}

export function IncomeTaxSlabStatusForm({
  slabId,
  isActive,
}: {
  slabId: string;
  isActive: boolean;
}) {
  return (
    <InlineSubmitForm
      action={setIncomeTaxSlabStatusAction}
      label={isActive ? "Deactivate" : "Activate"}
      pendingLabel={isActive ? "Deactivating…" : "Activating…"}
      variant={isActive ? "danger" : "primary"}
    >
      <input type="hidden" name="slabId" value={slabId} />
      <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />
    </InlineSubmitForm>
  );
}