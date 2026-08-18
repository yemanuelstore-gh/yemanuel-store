import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

export type DepartmentRow = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  employeeCount: number;
};

export async function getDepartments({
  q,
  isActive,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  isActive?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ departments: DepartmentRow[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("departments")
    .select("id, name, description, is_active", { count: "exact" });

  if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  if (isActive === "true") query = query.eq("is_active", true);
  if (isActive === "false") query = query.eq("is_active", false);

  const { data, count } = await query
    .order("name", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
  }[];

  const counts = await getEmployeeCountsByDepartment(
    rows.map((row) => row.id),
  );

  return {
    departments: rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      isActive: row.is_active,
      employeeCount: counts.get(row.id) ?? 0,
    })),
    total: count ?? 0,
  };
}

export type DepartmentDetail = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  employeeCount: number;
  createdAt: string;
  updatedAt: string;
};

export async function getDepartmentById(id: string): Promise<DepartmentDetail | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("departments")
    .select("id, name, description, is_active, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  const counts = await getEmployeeCountsByDepartment([row.id]);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    employeeCount: counts.get(row.id) ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getEmployeeCountsByDepartment(departmentIds: string[]): Promise<Map<string, number>> {
  const client = await createClient();
  if (departmentIds.length === 0) return new Map();
  const { data } = await client
    .from("employees")
    .select("department_id, employment_status")
    .in("department_id", departmentIds);
  const rows = (data ?? []) as unknown as {
    department_id: string;
    employment_status: string;
  }[];
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.employment_status !== "terminated") {
      counts.set(row.department_id, (counts.get(row.department_id) ?? 0) + 1);
    }
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

export type EmployeeRow = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  employmentType: string;
  employmentStatus: string;
  hireDate: string;
  departmentName: string | null;
};

export async function getEmployees({
  q,
  status,
  departmentId,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  status?: string;
  departmentId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ employees: EmployeeRow[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("employees")
    .select(
      "id, employee_code, first_name, last_name, email, phone, job_title, employment_type, employment_status, hire_date, department_id, departments(name)",
      { count: "exact" },
    );

  if (q) {
    query = query.or(
      `employee_code.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,job_title.ilike.%${q}%`,
    );
  }
  if (status) query = query.eq("employment_status", status);
  if (departmentId) query = query.eq("department_id", departmentId);

  const { data, count } = await query
    .order("first_name", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    job_title: string | null;
    employment_type: string;
    employment_status: string;
    hire_date: string;
    department_id: string | null;
    departments: { name: string } | null;
  }[];

  return {
    employees: rows.map((row) => ({
      id: row.id,
      employeeCode: row.employee_code,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`.trim(),
      email: row.email,
      phone: row.phone,
      jobTitle: row.job_title,
      employmentType: row.employment_type,
      employmentStatus: row.employment_status,
      hireDate: row.hire_date,
      departmentName: row.departments?.name ?? null,
    })),
    total: count ?? 0,
  };
}

export type EmployeeSummary = {
  total: number;
  active: number;
  onLeave: number;
  departments: number;
};

export async function getEmployeeSummary(): Promise<EmployeeSummary> {
  const client = await createClient();
  const { data } = await client.from("employees").select("employment_status, department_id");
  const rows = (data ?? []) as unknown as {
    employment_status: string;
    department_id: string | null;
  }[];
  return {
    total: rows.length,
    active: rows.filter((row) => row.employment_status === "active").length,
    onLeave: rows.filter((row) => row.employment_status === "on_leave").length,
    departments: new Set(rows.map((row) => row.department_id).filter(Boolean)).size,
  };
}

export type EmployeeDetail = {
  id: string;
  employeeCode: string;
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
  departmentName: string | null;
  structureId: string | null;
  structureName: string | null;
  staffId: string | null;
  staffName: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
  updatedByName: string | null;
};

export async function getEmployeeById(id: string): Promise<EmployeeDetail | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("employees")
    .select(
      "id, employee_code, first_name, last_name, email, phone, gender, date_of_birth, hire_date, employment_type, employment_status, job_title, social_security_number, department_id, departments(name), structure_id, salary_structures(name), staff_id, staff(employee_code), emergency_contact_name, emergency_contact_phone, notes, created_at, updated_at, created_by, updated_by",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    gender: string | null;
    date_of_birth: string | null;
    hire_date: string;
    employment_type: string;
    employment_status: string;
    job_title: string | null;
    social_security_number: string | null;
    department_id: string | null;
    departments: { name: string } | null;
    structure_id: string | null;
    salary_structures: { name: string } | null;
    staff_id: string | null;
    staff: { employee_code: string } | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    updated_by: string | null;
  };

  const names = await resolveUserNames(
    [row.created_by, row.updated_by].filter((id): id is string => id !== null),
  );

  return {
    id: row.id,
    employeeCode: row.employee_code,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    gender: row.gender,
    dateOfBirth: row.date_of_birth,
    hireDate: row.hire_date,
    employmentType: row.employment_type,
    employmentStatus: row.employment_status,
    jobTitle: row.job_title,
    socialSecurityNumber: row.social_security_number,
    departmentId: row.department_id,
    departmentName: row.departments?.name ?? null,
    structureId: row.structure_id,
    structureName: row.salary_structures?.name ?? null,
    staffId: row.staff_id,
    staffName: row.staff?.employee_code ?? null,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByName: row.created_by ? (names.get(row.created_by) ?? null) : null,
    updatedByName: row.updated_by ? (names.get(row.updated_by) ?? null) : null,
  };
}

// ---------------------------------------------------------------------------
// Salary components
// ---------------------------------------------------------------------------

export type SalaryComponentRow = {
  id: string;
  name: string;
  componentType: string;
  description: string | null;
  isActive: boolean;
  usageCount: number;
};

export async function getSalaryComponents({
  q,
  componentType,
  isActive,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  componentType?: string;
  isActive?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ components: SalaryComponentRow[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("salary_components")
    .select("id, name, component_type, description, is_active", { count: "exact" });

  if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  if (componentType) query = query.eq("component_type", componentType);
  if (isActive === "true") query = query.eq("is_active", true);
  if (isActive === "false") query = query.eq("is_active", false);

  const { data, count } = await query
    .order("name", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    component_type: string;
    description: string | null;
    is_active: boolean;
  }[];

  const usage = await getComponentUsageCounts(rows.map((row) => row.id));

  return {
    components: rows.map((row) => ({
      id: row.id,
      name: row.name,
      componentType: row.component_type,
      description: row.description,
      isActive: row.is_active,
      usageCount: usage.get(row.id) ?? 0,
    })),
    total: count ?? 0,
  };
}

export type SalaryComponentDetail = {
  id: string;
  name: string;
  componentType: string;
  description: string | null;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

export async function getSalaryComponentById(id: string): Promise<SalaryComponentDetail | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("salary_components")
    .select("id, name, component_type, description, is_active, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    name: string;
    component_type: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  const usage = await getComponentUsageCounts([row.id]);

  return {
    id: row.id,
    name: row.name,
    componentType: row.component_type,
    description: row.description,
    isActive: row.is_active,
    usageCount: usage.get(row.id) ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getComponentUsageCounts(componentIds: string[]): Promise<Map<string, number>> {
  const client = await createClient();
  if (componentIds.length === 0) return new Map();
  const { data } = await client
    .from("salary_structure_components")
    .select("component_id")
    .in("component_id", componentIds);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as unknown as { component_id: string }[]) {
    counts.set(row.component_id, (counts.get(row.component_id) ?? 0) + 1);
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Salary structures
// ---------------------------------------------------------------------------

export type SalaryStructureRow = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  componentCount: number;
  employeeCount: number;
};

export async function getSalaryStructures({
  q,
  isActive,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  isActive?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ structures: SalaryStructureRow[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("salary_structures")
    .select("id, name, description, is_active", { count: "exact" });

  if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  if (isActive === "true") query = query.eq("is_active", true);
  if (isActive === "false") query = query.eq("is_active", false);

  const { data, count } = await query
    .order("name", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
  }[];

  const components = await getStructureComponentCounts(rows.map((row) => row.id));
  const employees = await getStructureEmployeeCounts(rows.map((row) => row.id));

  return {
    structures: rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      isActive: row.is_active,
      componentCount: components.get(row.id) ?? 0,
      employeeCount: employees.get(row.id) ?? 0,
    })),
    total: count ?? 0,
  };
}

export type SalaryStructureComponentRow = {
  id: string;
  componentId: string;
  componentName: string;
  componentType: string;
  amount: number;
};

export type SalaryStructureDetail = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  employeeCount: number;
  totalMonthly: number;
  components: SalaryStructureComponentRow[];
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
  updatedByName: string | null;
};

export async function getSalaryStructureById(id: string): Promise<SalaryStructureDetail | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("salary_structures")
    .select(
      "id, name, description, is_active, created_at, updated_at, created_by, updated_by, salary_structure_components(component_id, amount, salary_components(name, component_type))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    updated_by: string | null;
    salary_structure_components: {
      component_id: string;
      amount: number;
      salary_components: { name: string; component_type: string } | null;
    }[];
  };

  const employees = await getStructureEmployeeCounts([row.id]);
  const names = await resolveUserNames(
    [row.created_by, row.updated_by].filter((id): id is string => id !== null),
  );

  const components: SalaryStructureComponentRow[] = row.salary_structure_components
    .map((item) => ({
      id: item.component_id,
      componentId: item.component_id,
      componentName: item.salary_components?.name ?? "Unknown",
      componentType: item.salary_components?.component_type ?? "earning",
      amount: Number(item.amount),
    }))
    .sort((a, b) => a.componentName.localeCompare(b.componentName));

  const totalMonthly = components.reduce(
    (sum, item) =>
      sum + (item.componentType === "earning" ? item.amount : -item.amount),
    0,
  );

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    employeeCount: employees.get(row.id) ?? 0,
    totalMonthly,
    components,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByName: row.created_by ? (names.get(row.created_by) ?? null) : null,
    updatedByName: row.updated_by ? (names.get(row.updated_by) ?? null) : null,
  };
}

async function getStructureComponentCounts(structureIds: string[]): Promise<Map<string, number>> {
  const client = await createClient();
  if (structureIds.length === 0) return new Map();
  const { data } = await client
    .from("salary_structure_components")
    .select("structure_id")
    .in("structure_id", structureIds);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as unknown as { structure_id: string }[]) {
    counts.set(row.structure_id, (counts.get(row.structure_id) ?? 0) + 1);
  }
  return counts;
}

async function getStructureEmployeeCounts(structureIds: string[]): Promise<Map<string, number>> {
  const client = await createClient();
  if (structureIds.length === 0) return new Map();
  const { data } = await client
    .from("employees")
    .select("structure_id")
    .in("structure_id", structureIds);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as unknown as { structure_id: string }[]) {
    counts.set(row.structure_id, (counts.get(row.structure_id) ?? 0) + 1);
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Payroll periods
// ---------------------------------------------------------------------------

export type PayrollPeriodRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  notes: string | null;
};

export async function getPayrollPeriods({
  q,
  status,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ periods: PayrollPeriodRow[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("payroll_periods")
    .select("id, name, start_date, end_date, status, notes", { count: "exact" });

  if (q) query = query.or(`name.ilike.%${q}%,notes.ilike.%${q}%`);
  if (status) query = query.eq("status", status);

  const { data, count } = await query
    .order("start_date", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    status: string;
    notes: string | null;
  }[];

  return {
    periods: rows.map((row) => ({
      id: row.id,
      name: row.name,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      notes: row.notes,
    })),
    total: count ?? 0,
  };
}

export type PayrollPeriodSummary = {
  total: number;
  open: number;
  closed: number;
};

export async function getPayrollPeriodSummary(): Promise<PayrollPeriodSummary> {
  const client = await createClient();
  const { data } = await client.from("payroll_periods").select("status");
  const rows = (data ?? []) as unknown as { status: string }[];
  return {
    total: rows.length,
    open: rows.filter((row) => row.status === "open").length,
    closed: rows.filter((row) => row.status === "closed").length,
  };
}

// ---------------------------------------------------------------------------
// Income tax slabs
// ---------------------------------------------------------------------------

export type IncomeTaxSlabRow = {
  id: string;
  name: string;
  lowerLimit: number;
  upperLimit: number | null;
  rate: number;
  isActive: boolean;
};

export async function getIncomeTaxSlabs({
  q,
  isActive,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  isActive?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ slabs: IncomeTaxSlabRow[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("income_tax_slabs")
    .select("id, name, lower_limit, upper_limit, rate, is_active", { count: "exact" });

  if (q) query = query.ilike("name", `%${q}%`);
  if (isActive === "true") query = query.eq("is_active", true);
  if (isActive === "false") query = query.eq("is_active", false);

  const { data, count } = await query
    .order("lower_limit", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    lower_limit: number;
    upper_limit: number | null;
    rate: number;
    is_active: boolean;
  }[];

  return {
    slabs: rows.map((row) => ({
      id: row.id,
      name: row.name,
      lowerLimit: Number(row.lower_limit),
      upperLimit: row.upper_limit === null ? null : Number(row.upper_limit),
      rate: Number(row.rate),
      isActive: row.is_active,
    })),
    total: count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Form options
// ---------------------------------------------------------------------------

export type DepartmentOption = { id: string; name: string };
export type StructureOption = { id: string; name: string };
export type ComponentOption = { id: string; name: string; componentType: string };
export type StaffOption = { id: string; employeeCode: string; fullName: string };

export async function getDepartmentOptions(): Promise<DepartmentOption[]> {
  const client = await createClient();
  const { data } = await client
    .from("departments")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  return (data ?? []) as unknown as DepartmentOption[];
}

export async function getStructureOptions(): Promise<StructureOption[]> {
  const client = await createClient();
  const { data } = await client
    .from("salary_structures")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  return (data ?? []) as unknown as StructureOption[];
}

export async function getComponentOptions(): Promise<ComponentOption[]> {
  const client = await createClient();
  const { data } = await client
    .from("salary_components")
    .select("id, name, component_type")
    .eq("is_active", true)
    .order("name", { ascending: true });
  return (data ?? []) as unknown as ComponentOption[];
}

export async function getStaffOptions(): Promise<StaffOption[]> {
  const client = await createClient();
  const { data } = await client
    .from("staff")
    .select("id, employee_code, profiles(full_name)")
    .eq("status", "active")
    .order("employee_code", { ascending: true });
  return ((data ?? []) as unknown as {
    id: string;
    employee_code: string;
    profiles: { full_name: string | null } | null;
  }[]).map((row) => ({
    id: row.id,
    employeeCode: row.employee_code,
    fullName: row.profiles?.full_name ?? "",
  }));
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function resolveUserNames(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  if (!isServiceConfigured()) return new Map();
  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);
  return new Map(
    ((data ?? []) as { id: string; full_name: string | null }[]).map((row) => [
      row.id,
      row.full_name ?? "",
    ]),
  );
}