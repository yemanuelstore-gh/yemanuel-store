create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  is_system boolean not null default false
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  employee_code text not null unique,
  position text not null,
  status public.staff_status not null default 'active',
  hire_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id)
);

create table public.staff_roles (
  staff_id uuid not null references public.staff (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  primary key (staff_id, role_id)
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function app.set_updated_at();

create trigger staff_set_updated_at
before update on public.staff
for each row execute function app.set_updated_at();

create or replace function app.has_permission(p_code text)
returns boolean
language plpgsql
security definer
stable
set search_path = public, app
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return false;
  end if;
  return exists (
    select 1
    from public.staff s
    join public.staff_roles sr on sr.staff_id = s.id
    join public.role_permissions rp on rp.role_id = sr.role_id
    join public.permissions p on p.id = rp.permission_id
    where s.profile_id = v_user_id
      and s.status = 'active'
      and p.code = p_code
  );
end;
$$;

revoke execute on function app.has_permission(text) from public;
grant execute on function app.has_permission(text) to authenticated;
grant usage on schema app to authenticated;