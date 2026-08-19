-- Update owner credentials to user's preferred email/password

set search_path = public, extensions;

do $$
declare
  v_owner_id uuid;
  v_new_email text := 'barimasikapa@gmail.com';
  v_new_password text := 'Ohemaadavina2015';
  v_new_full_name text := 'Barima Sikapa';
begin
  -- Find the owner user
  select id into v_owner_id
  from auth.users
  where email = v_new_email
    and is_sso_user = false
  limit 1;

  if v_owner_id is null then
    raise exception 'Owner user not found';
  end if;

  -- Update auth user email and password
  update auth.users
  set email = v_new_email,
      encrypted_password = crypt(v_new_password, gen_salt('bf')),
      raw_user_meta_data = jsonb_set(
        jsonb_set(
          coalesce(raw_user_meta_data, '{}'::jsonb),
          '{full_name}',
          to_jsonb(v_new_full_name)
        ),
        '{name}',
        to_jsonb(v_new_full_name)
      ),
      updated_at = now()
  where id = v_owner_id;

  -- Update profile
  update public.profiles
  set full_name = v_new_full_name,
      phone = null
  where id = v_owner_id;

  raise notice 'Owner credentials updated. New email: %, Name: %', v_new_email, v_new_full_name;
end;
$$;