-- HR module: master records phase.
--
-- Covers departments, employees, salary components, salary structures,
-- payroll periods and income tax slabs. Attendance, leave and payroll runs
-- are NOT part of this phase.
--
-- Employees are the HR master record; the existing auth-linked `staff`
-- table remains the system-identity record. An employee may optionally be
-- linked to a staff account (staff_id), so the staff table's select policy
-- is widened to include hr.read for that link — insert/update on staff
-- remains staff.manage-only.
--
-- Deletion is intentionally unsupported on master tables: records are
-- deactivated instead (employees have a full employment-status enum). The
-- only deletable rows are salary_structure_components junction rows.
--
-- Permissions follow the existing architecture: hr.read (exists), plus
-- new hr.create and hr.update granted to the owner role.
--
-- Idempotent: safe to re-run.

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Types and sequences
-- ---------------------------------------------------------------------------

create type public.employee_status as enum ('active', 'on_leave', 'inactive', 'terminated');
create type public.employment_type as enum ('full_time', 'part_time', 'contract', 'intern');
create type public.salary_component_type as enum ('earning', 'deduction');
create type public.payroll_period_status as enum ('open', 'closed');

-- Employee codes: EMP-YYYY-00001 via app.next_document_number.
create sequence app.seq_emp;

grant usage on sequence app.seq_emp to service_role;

-- ---------------------------------------------------------------------------
-- Departments
-- ---------------------------------------------------------------------------

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger departments_set_updated_at
before update on public.departments
for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Salary setup (created before employees, which references structures)
-- ---------------------------------------------------------------------------

create table public.salary_components (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  component_type public.salary_component_type not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger salary_components_set_updated_at
before update on public.salary_components
for each row execute function app.set_updated_at();

create table public.salary_structures (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger salary_structures_set_updated_at
before update on public.salary_structures
for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Employees
-- ---------------------------------------------------------------------------

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  gender text check (gender in ('male', 'female', 'other')),
  date_of_birth date,
  hire_date date not null,
  employment_type public.employment_type not null default 'full_time',
  employment_status public.employee_status not null default 'active',
  job_title text,
  social_security_number text,
  department_id uuid references public.departments (id) on delete set null,
  structure_id uuid references public.salary_structures (id) on delete set null,
  staff_id uuid unique references public.staff (id) on delete set null,
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  created_by uuid not null references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger employees_set_updated_at
before update on public.employees
for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Salary structure components (junction)
-- ---------------------------------------------------------------------------

create table public.salary_structure_components (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.salary_structures (id) on delete cascade,
  component_id uuid not null references public.salary_components (id) on delete cascade,
  amount numeric(14, 2) not null check (amount >= 0),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (structure_id, component_id)
);

create trigger salary_structure_components_set_updated_at
before update on public.salary_structure_components
for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Payroll periods and tax slabs
-- ---------------------------------------------------------------------------

create table public.payroll_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_date date not null,
  end_date date not null,
  status public.payroll_period_status not null default 'open',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payroll_periods_end_after_start check (end_date >= start_date)
);

create trigger payroll_periods_set_updated_at
before update on public.payroll_periods
for each row execute function app.set_updated_at();

create table public.income_tax_slabs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lower_limit numeric(14, 2) not null check (lower_limit >= 0),
  upper_limit numeric(14, 2) check (upper_limit is null or upper_limit > lower_limit),
  rate numeric(5, 2) not null check (rate >= 0 and rate <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger income_tax_slabs_set_updated_at
before update on public.income_tax_slabs
for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.salary_components enable row level security;
alter table public.salary_structures enable row level security;
alter table public.salary_structure_components enable row level security;
alter table public.payroll_periods enable row level security;
alter table public.income_tax_slabs enable row level security;

create policy p_departments_hr_select on public.departments for select to authenticated using (app.has_permission('hr.read'));
create policy p_departments_hr_insert on public.departments for insert to authenticated with check (app.has_permission('hr.create'));
create policy p_departments_hr_update on public.departments for update to authenticated using (app.has_permission('hr.update')) with check (app.has_permission('hr.update'));

create policy p_employees_hr_select on public.employees for select to authenticated using (app.has_permission('hr.read'));
create policy p_employees_hr_insert on public.employees for insert to authenticated with check (app.has_permission('hr.create'));
create policy p_employees_hr_update on public.employees for update to authenticated using (app.has_permission('hr.update')) with check (app.has_permission('hr.update'));

create policy p_salary_components_hr_select on public.salary_components for select to authenticated using (app.has_permission('hr.read'));
create policy p_salary_components_hr_insert on public.salary_components for insert to authenticated with check (app.has_permission('hr.create'));
create policy p_salary_components_hr_update on public.salary_components for update to authenticated using (app.has_permission('hr.update')) with check (app.has_permission('hr.update'));

create policy p_salary_structures_hr_select on public.salary_structures for select to authenticated using (app.has_permission('hr.read'));
create policy p_salary_structures_hr_insert on public.salary_structures for insert to authenticated with check (app.has_permission('hr.create'));
create policy p_salary_structures_hr_update on public.salary_structures for update to authenticated using (app.has_permission('hr.update')) with check (app.has_permission('hr.update'));

create policy p_salary_structure_components_hr_select on public.salary_structure_components for select to authenticated using (app.has_permission('hr.read'));
create policy p_salary_structure_components_hr_insert on public.salary_structure_components for insert to authenticated with check (app.has_permission('hr.update'));
create policy p_salary_structure_components_hr_delete on public.salary_structure_components for delete to authenticated using (app.has_permission('hr.update'));

create policy p_payroll_periods_hr_select on public.payroll_periods for select to authenticated using (app.has_permission('hr.read'));
create policy p_payroll_periods_hr_insert on public.payroll_periods for insert to authenticated with check (app.has_permission('hr.create'));
create policy p_payroll_periods_hr_update on public.payroll_periods for update to authenticated using (app.has_permission('hr.update')) with check (app.has_permission('hr.update'));

create policy p_income_tax_slabs_hr_select on public.income_tax_slabs for select to authenticated using (app.has_permission('hr.read'));
create policy p_income_tax_slabs_hr_insert on public.income_tax_slabs for insert to authenticated with check (app.has_permission('hr.create'));
create policy p_income_tax_slabs_hr_update on public.income_tax_slabs for update to authenticated using (app.has_permission('hr.update')) with check (app.has_permission('hr.update'));

-- Allow HR staff to read staff accounts so employees can be linked to them.
-- Insert/update on staff remain staff.manage-only.
drop policy p_staff_staff_select on public.staff;
create policy p_staff_staff_select on public.staff for select to authenticated using (app.has_permission('settings.manage') or app.has_permission('staff.manage') or app.has_permission('hr.read'));

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index employees_department_id_idx on public.employees (department_id);
create index employees_employment_status_idx on public.employees (employment_status);
create index employees_structure_id_idx on public.employees (structure_id);
create index employees_hire_date_idx on public.employees (hire_date);
create index salary_structure_components_structure_id_idx on public.salary_structure_components (structure_id);
create index salary_structure_components_component_id_idx on public.salary_structure_components (component_id);
create index income_tax_slabs_lower_limit_idx on public.income_tax_slabs (lower_limit);
create index payroll_periods_start_date_idx on public.payroll_periods (start_date);

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

do $$
declare
  v_perm_code text;
  v_perm_id uuid;
  v_role_id uuid;
begin
  insert into public.permissions (code, description) values
    ('hr.create', 'Create HR records (employees, departments, payroll setup)'),
    ('hr.update', 'Edit HR records (employees, departments, payroll setup)')
  on conflict (code) do nothing;

  select id into v_role_id from public.roles where code = 'owner';

  foreach v_perm_code in array array['hr.create', 'hr.update'] loop
    select id into v_perm_id from public.permissions where code = v_perm_code;
    if v_perm_id is not null and v_role_id is not null then
      insert into public.role_permissions (role_id, permission_id)
      values (v_role_id, v_perm_id)
      on conflict do nothing;
    end if;
  end loop;

  raise notice 'HR create/update permissions ready';
end;
$$;