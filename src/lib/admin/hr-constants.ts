/**
 * Pure constants and display helpers for the HR master records.
 * Safe to import from both server code and client components (no Supabase
 * or server-only imports).
 */

export const EMPLOYEE_STATUSES = ["active", "on_leave", "inactive", "terminated"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const SALARY_COMPONENT_TYPES = ["earning", "deduction"] as const;
export type SalaryComponentType = (typeof SALARY_COMPONENT_TYPES)[number];

export const PAYROLL_PERIOD_STATUSES = ["open", "closed"] as const;
export type PayrollPeriodStatus = (typeof PAYROLL_PERIOD_STATUSES)[number];

export const GENDERS = ["male", "female", "other"] as const;

const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  on_leave: "On Leave",
  inactive: "Inactive",
  terminated: "Terminated",
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  intern: "Intern",
};

const SALARY_COMPONENT_TYPE_LABELS: Record<string, string> = {
  earning: "Earning",
  deduction: "Deduction",
};

const PAYROLL_PERIOD_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  closed: "Closed",
};

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

function fallbackLabel(value: string): string {
  return value.replaceAll("_", " ");
}

export function employeeStatusLabel(value: string): string {
  return EMPLOYEE_STATUS_LABELS[value] ?? fallbackLabel(value);
}

export function employmentTypeLabel(value: string): string {
  return EMPLOYMENT_TYPE_LABELS[value] ?? fallbackLabel(value);
}

export function salaryComponentTypeLabel(value: string): string {
  return SALARY_COMPONENT_TYPE_LABELS[value] ?? fallbackLabel(value);
}

export function payrollPeriodStatusLabel(value: string): string {
  return PAYROLL_PERIOD_STATUS_LABELS[value] ?? fallbackLabel(value);
}

export function genderLabel(value: string): string {
  return GENDER_LABELS[value] ?? fallbackLabel(value);
}