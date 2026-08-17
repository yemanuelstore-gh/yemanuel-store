-- HR module permission.
--
-- The HR module (employees, departments, attendance, leave, payroll) is
-- planned but has no pages yet. Its navigation entries are gated by the
-- `hr.read` permission so the module follows the same permission architecture
-- as every other module. The permission is granted to the owner role;
-- custom roles can be granted it once HR pages ship.
--
-- Idempotent: safe to re-run.

set search_path = public, extensions;

do $$
declare
  v_perm_id uuid;
  v_role_id uuid;
begin
  insert into public.permissions (code, description)
  values ('hr.read', 'View HR records (employees, attendance, leave, payroll)')
  on conflict (code) do nothing;

  select id into v_perm_id from public.permissions where code = 'hr.read';

  select id into v_role_id from public.roles where code = 'owner';

  if v_perm_id is not null and v_role_id is not null then
    insert into public.role_permissions (role_id, permission_id)
    values (v_role_id, v_perm_id)
    on conflict do nothing;
  end if;

  raise notice 'HR permission ready (id: %)', v_perm_id;
end;
$$;