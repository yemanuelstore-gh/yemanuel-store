import type { DashboardClient } from "@/lib/admin/dashboard";
import type { ListQuery, ListResult } from "@/lib/admin/query";
import { listQuery } from "@/lib/admin/query";

export { PAGE_SIZE } from "@/lib/admin/query";

export type EmployeeListRow = {
  id: string;
  employee_code: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  hire_date: string | null;
  employment_type: string | null;
  employment_status: string | null;
  job_title: string | null;
  departments: { name: string } | null;
  salary_structures: { name: string } | null;
};

export function listEmployees(
  client: DashboardClient,
  params: ListQuery & { department?: string; status?: string },
): Promise<ListResult<EmployeeListRow>> {
  return listQuery(
    client,
    "employees",
    params,
    (q) => {
      let query = q.order("last_name", { ascending: true });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.or(
            `employee_code.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`,
          );
        }
      }
      if (params.department) query = query.eq("department_id", params.department);
      if (params.status) query = query.eq("employment_status", params.status);
      return query;
    },
    "id, employee_code, first_name, last_name, email, phone, hire_date, employment_type, employment_status, job_title, departments(name), salary_structures(name)",
  );
}

export type DepartmentListRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  employee_count: number;
};

export async function listDepartments(
  client: DashboardClient,
  params: ListQuery & { q?: string },
): Promise<ListResult<DepartmentListRow>> {
  const { data: departmentRows, error: departmentError } = await client
    .from("departments")
    .select("id, name, description, is_active")
    .order("name", { ascending: true });
  if (departmentError) throw departmentError;

  const { data: employeeRows } = await client
    .from("employees")
    .select("department_id")
    .limit(1000);

  const countByDepartment = new Map<string, number>();
  for (const employee of employeeRows ?? []) {
    if (!employee.department_id) continue;
    countByDepartment.set(
      employee.department_id,
      (countByDepartment.get(employee.department_id) ?? 0) + 1,
    );
  }

  let rows = (departmentRows ?? []).map((department) => ({
    ...department,
    employee_count: countByDepartment.get(department.id) ?? 0,
  }));

  if (params.q) {
    const term = params.q.trim().toLowerCase();
    rows = rows.filter(
      (row) => row.name.toLowerCase().includes(term) || (row.description ?? "").toLowerCase().includes(term),
    );
  }

  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 25;
  const start = (page - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    total: rows.length,
  };
}

export type PayrollPeriodListRow = {
  id: string;
  name: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
};

export function listPayrollPeriods(
  client: DashboardClient,
  params: ListQuery & { status?: string },
): Promise<ListResult<PayrollPeriodListRow>> {
  return listQuery(
    client,
    "payroll_periods",
    params,
    (q) => {
      let query = q.order("start_date", { ascending: false, nullsFirst: false });
      if (params.q) {
        const term = params.q.trim();
        if (term) query = query.ilike("name", `%${term}%`);
      }
      if (params.status) query = query.eq("status", params.status);
      return query;
    },
    "id, name, status, start_date, end_date, notes, created_at",
  );
}

export type SalaryStructureListRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  component_count: number;
};

export async function listSalaryStructures(
  client: DashboardClient,
): Promise<SalaryStructureListRow[]> {
  const [structuresResult, componentsResult] = await Promise.all([
    client
      .from("salary_structures")
      .select("id, name, description, is_active")
      .order("name", { ascending: true }),
    client
      .from("salary_structure_components")
      .select("structure_id")
      .limit(1000),
  ]);
  if (structuresResult.error) throw structuresResult.error;

  const countByStructure = new Map<string, number>();
  for (const component of componentsResult.data ?? []) {
    countByStructure.set(
      component.structure_id,
      (countByStructure.get(component.structure_id) ?? 0) + 1,
    );
  }

  return (structuresResult.data ?? []).map((structure) => ({
    ...structure,
    component_count: countByStructure.get(structure.id) ?? 0,
  }));
}