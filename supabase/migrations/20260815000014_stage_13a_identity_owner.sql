-- Stage 13a: Provision the store owner identity.
--
-- The catalogue seed (stage 13b) needs a real auth user to satisfy the
-- prices.created_by / staff.created_by foreign keys. Per project convention
-- the seed itself must not invent auth UUIDs or credentials, so this
-- migration provisions one real authenticated owner user (email
-- owner@yemanuelstore.com) together with its profile, staff record, role and
-- permissions.
--
-- The owner password below is a BOOTSTRAP password only. The owner should
-- sign in and change it after first login. It is hashed with bcrypt (crypt
-- from pgcrypto), never stored in plain text.
--
-- Idempotent: safe to re-run.

set search_path = public, extensions;

do $$
declare
  v_owner_id uuid;
  v_role_id uuid;
  v_perm_id uuid;
  v_staff_id uuid;
  v_perm text;
  v_perms text[] := array[
    'products.read', 'products.create', 'products.update',
    'inventory.read', 'inventory.create', 'inventory.update', 'inventory.adjust',
    'customers.read', 'customers.create', 'customers.update',
    'suppliers.read', 'suppliers.create', 'suppliers.update',
    'purchases.read', 'purchases.create', 'purchases.update',
    'sales.read', 'sales.create', 'sales.update', 'sales.refund',
    'expenses.read', 'expenses.create', 'expenses.update',
    'settings.manage', 'staff.manage', 'reports.view', 'audit.view'
  ];
  v_perm_description text;
begin
  -- 1. Permissions ----------------------------------------------------------
  foreach v_perm in array v_perms loop
    v_perm_description := case v_perm
      when 'products.read'       then 'View products and catalogue'
      when 'products.create'     then 'Create products and catalogue entries'
      when 'products.update'     then 'Edit products and catalogue entries'
      when 'inventory.read'      then 'View inventory and stock levels'
      when 'inventory.create'    then 'Record new inventory'
      when 'inventory.update'    then 'Update inventory levels'
      when 'inventory.adjust'    then 'Approve and apply stock adjustments'
      when 'customers.read'      then 'View customers'
      when 'customers.create'    then 'Create customers'
      when 'customers.update'    then 'Edit customer details'
      when 'suppliers.read'      then 'View suppliers'
      when 'suppliers.create'    then 'Create suppliers'
      when 'suppliers.update'    then 'Edit supplier details'
      when 'purchases.read'      then 'View purchase orders and receipts'
      when 'purchases.create'    then 'Create purchase orders'
      when 'purchases.update'    then 'Edit purchase orders'
      when 'sales.read'          then 'View sales and orders'
      when 'sales.create'        then 'Create sales and orders'
      when 'sales.update'        then 'Edit sales and orders'
      when 'sales.refund'        then 'Process sales refunds'
      when 'expenses.read'       then 'View expenses'
      when 'expenses.create'     then 'Create expenses'
      when 'expenses.update'     then 'Edit expenses'
      when 'settings.manage'     then 'Manage store settings and locations'
      when 'staff.manage'        then 'Manage staff accounts and roles'
      when 'reports.view'        then 'View reports'
      when 'audit.view'          then 'View audit log'
      else 'Granted permission'
    end;
    insert into public.permissions (code, description)
    values (v_perm, v_perm_description)
    on conflict (code) do nothing;
  end loop;

  -- 2. Owner auth user ------------------------------------------------------
  -- Real user created once with a generated UUID; never invented.
  select id into v_owner_id
  from auth.users
  where email = 'owner@yemanuelstore.com'
    and is_sso_user = false
  limit 1;

  if v_owner_id is null then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, is_sso_user, is_anonymous
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'owner@yemanuelstore.com',
      crypt('Yemanuel@Owner2026', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Yemanuel Store Owner","name":"Yemanuel Store Owner"}'::jsonb,
      now(),
      now(),
      false,
      false
    )
    returning id into v_owner_id;

    raise notice 'Owner auth user created: %', v_owner_id;
  else
    raise notice 'Owner auth user already exists: %', v_owner_id;
  end if;

  -- 3. Profile --------------------------------------------------------------
  insert into public.profiles (id, full_name, phone)
  values (v_owner_id, 'Yemanuel Store Owner', '+233 500 090 392')
  on conflict (id) do nothing;

  -- 4. Role -----------------------------------------------------------------
  insert into public.roles (code, name, description, is_system)
  values (
    'owner',
    'Owner',
    'Store owner with full management access.',
    true
  )
  on conflict (code) do nothing;

  select id into v_role_id from public.roles where code = 'owner';

  -- 5. Role -> permissions --------------------------------------------------
  foreach v_perm in array v_perms loop
    select id into v_perm_id from public.permissions where code = v_perm;
    insert into public.role_permissions (role_id, permission_id)
    values (v_role_id, v_perm_id)
    on conflict do nothing;
  end loop;

  -- 6. Staff record ---------------------------------------------------------
  insert into public.staff (
    profile_id, employee_code, position, status, hire_date, notes, created_by
  )
  values (
    v_owner_id,
    'YS-OWNER-0001',
    'Owner',
    'active',
    date '2026-08-01',
    'Store owner and administrator. Seeded with the initial catalogue.',
    v_owner_id
  )
  on conflict (profile_id) do nothing;

  select id into v_staff_id from public.staff where profile_id = v_owner_id;

  -- 7. Staff -> role --------------------------------------------------------
  insert into public.staff_roles (staff_id, role_id)
  values (v_staff_id, v_role_id)
  on conflict do nothing;

  raise notice 'Stage 13a complete. Owner staff id: %', v_staff_id;
end;
$$;
