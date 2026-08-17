-- Reassign the Owner staff record (YS-OWNER-0001) to the existing
-- authenticated identity barimasikapa@gmail.com (profile a7e59bf1-...).
--
-- Reuses the existing auth user, profile and customer record. No users,
-- profiles, customers, staff, roles or permissions are created or deleted.
-- The previous owner identity (owner@yemanuelstore.com) is left untouched
-- but loses staff access.

do $$
declare
  v_profile_id uuid;
  v_staff_id uuid;
begin
  -- Resolve the existing identity from its customer record.
  select profile_id into v_profile_id
  from public.customers
  where email = 'barimasikapa@gmail.com'
    and profile_id is not null
  limit 1;

  if v_profile_id is null then
    raise exception 'No customer record found for barimasikapa@gmail.com';
  end if;

  -- Resolve the Owner staff record.
  select id into v_staff_id
  from public.staff
  where employee_code = 'YS-OWNER-0001'
  limit 1;

  if v_staff_id is null then
    raise exception 'Owner staff record (YS-OWNER-0001) not found';
  end if;

  -- Safety: the target profile must exist and must not be claimed by
  -- another staff record.
  if not exists (select 1 from public.profiles where id = v_profile_id) then
    raise exception 'Target profile % does not exist', v_profile_id;
  end if;

  if exists (
    select 1 from public.staff
    where profile_id = v_profile_id and id <> v_staff_id
  ) then
    raise exception 'Target profile % is already linked to another staff record', v_profile_id;
  end if;

  -- Reassign (no-op when already assigned).
  update public.staff
  set profile_id = v_profile_id
  where id = v_staff_id
    and profile_id is distinct from v_profile_id;
end $$;