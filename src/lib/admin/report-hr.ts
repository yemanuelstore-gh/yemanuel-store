import { createClient } from "@/lib/supabase/server";
import { fetchAllPaged } from "@/lib/admin/reporting";

/**
 * HR report data layer.
 *
 * Attendance, leave and payroll runs are not part of the current HR phase
 * (see migration 20260817090000_hr_master_records.sql), so this report covers
 * employee master data and salary structure setup only — no attendance,
 * leave or payroll figures are invented. All tables are small, but the
 * paged fetches keep aggregation exact regardless of volume.
 */

export type HrDepartmentRow = {
  name: string;
  total: number;
  active: number;
};

export type HrStructureRow = {
  name: string;
  componentCount: number;
  monthlyBudget: number;
};

export type HrReportData = {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveEmployees: number;
  terminatedEmployees: number;
  departments: number;
  newThisYear: number;
  averageTenureYears: number | null;
  byStatus: { status: string; count: number }[];
  byType: { type: string; count: number }[];
  byDepartment: HrDepartmentRow[];
  genderCounts: { gender: string; count: number }[];
  newByYear: { year: number; count: number }[];
  structures: HrStructureRow[];
  monthlyBudgetTotal: number;
  available: boolean;
};

export async function getHrReport(): Promise<HrReportData> {
  const client = await createClient();
  const [employees, structureComponents, structures] = await Promise.all([
    fetchAllPaged<{
      id: string;
      first_name: string;
      last_name: string;
      employment_type: string;
      employment_status: string;
      gender: string | null;
      hire_date: string;
      departments: { name: string } | null;
    }>((from, to) =>
      client
        .from("employees")
        .select(
          "id, first_name, last_name, employment_type, employment_status, gender, hire_date, departments(name)",
        )
        .range(from, to),
    ),
    fetchAllPaged<{
      amount: number;
      salary_structures: { name: string } | null;
    }>((from, to) =>
      client
        .from("salary_structure_components")
        .select("amount, salary_structures(name)")
        .range(from, to),
    ),
    fetchAllPaged<{ id: string; name: string; is_active: boolean }>((from, to) =>
      client.from("salary_structures").select("id, name, is_active").range(from, to),
    ),
  ]);

  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString().slice(0, 10);

  const byStatus = new Map<string, number>();
  const byType = new Map<string, number>();
  const byDepartment = new Map<string, { total: number; active: number }>();
  const genderCounts = new Map<string, number>();
  const newByYear = new Map<number, number>();

  let active = 0;
  let onLeave = 0;
  let terminated = 0;
  let newThisYear = 0;
  let tenureTotal = 0;
  let tenureCount = 0;

  for (const employee of employees) {
    byStatus.set(employee.employment_status, (byStatus.get(employee.employment_status) ?? 0) + 1);
    byType.set(employee.employment_type, (byType.get(employee.employment_type) ?? 0) + 1);
    if (employee.employment_status === "active") active += 1;
    if (employee.employment_status === "on_leave") onLeave += 1;
    if (employee.employment_status === "terminated") terminated += 1;

    const departmentName = employee.departments?.name ?? "Unassigned";
    const department = byDepartment.get(departmentName) ?? { total: 0, active: 0 };
    department.total += 1;
    if (employee.employment_status === "active") department.active += 1;
    byDepartment.set(departmentName, department);

    const gender = employee.gender ?? "unspecified";
    genderCounts.set(gender, (genderCounts.get(gender) ?? 0) + 1);

    const hireYear = new Date(`${employee.hire_date}T00:00:00Z`).getUTCFullYear();
    if (Number.isFinite(hireYear)) {
      newByYear.set(hireYear, (newByYear.get(hireYear) ?? 0) + 1);
    }
    if (employee.hire_date >= yearStart) newThisYear += 1;

    const hired = new Date(`${employee.hire_date}T00:00:00Z`).getTime();
    if (Number.isFinite(hired)) {
      tenureTotal += (now.getTime() - hired) / (365.25 * 24 * 60 * 60 * 1000);
      tenureCount += 1;
    }
  }

  const structureMap = new Map<string, { componentCount: number; monthlyBudget: number }>();
  for (const row of structures) {
    structureMap.set(row.name, { componentCount: 0, monthlyBudget: 0 });
  }
  for (const component of structureComponents) {
    const name = component.salary_structures?.name ?? "Unassigned";
    const current = structureMap.get(name) ?? { componentCount: 0, monthlyBudget: 0 };
    current.componentCount += 1;
    current.monthlyBudget += Number(component.amount);
    structureMap.set(name, current);
  }

  const structuresRows: HrStructureRow[] = Array.from(structureMap.entries())
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.monthlyBudget - a.monthlyBudget);

  return {
    totalEmployees: employees.length,
    activeEmployees: active,
    onLeaveEmployees: onLeave,
    terminatedEmployees: terminated,
    departments: byDepartment.size,
    newThisYear,
    averageTenureYears: tenureCount > 0 ? tenureTotal / tenureCount : null,
    byStatus: Array.from(byStatus.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    byType: Array.from(byType.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    byDepartment: Array.from(byDepartment.entries())
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.total - a.total),
    genderCounts: Array.from(genderCounts.entries())
      .map(([gender, count]) => ({ gender, count }))
      .sort((a, b) => b.count - a.count),
    newByYear: Array.from(newByYear.entries())
      .sort((a, b) => b[0] - a[0])
      .slice(0, 6)
      .map(([year, count]) => ({ year, count }))
      .reverse(),
    structures: structuresRows,
    monthlyBudgetTotal: structuresRows.reduce((sum, row) => sum + row.monthlyBudget, 0),
    available: employees.length > 0 || structures.length > 0,
  };
}