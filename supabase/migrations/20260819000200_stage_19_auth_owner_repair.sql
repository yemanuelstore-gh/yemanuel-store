-- Stage 19: Repair the seeded owner Auth record.
--
-- The original Stage 13a migration inserted directly into auth.users.
-- Older GoTrue versions tolerate NULL token columns, but current GoTrue
-- expects these fields to be empty strings when unused.
--
-- This migration is intentionally limited to the seeded owner account.
-- It does not create or delete users and does not modify passwords.

set search_path = public, extensions;

update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  recovery_token = coalesce(recovery_token, ''),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  reauthentication_token = coalesce(reauthentication_token, ''),
  updated_at = now()
where email = 'owner@yemanuelstore.com';

-- Keep the owner email confirmed.
update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
where email = 'owner@yemanuelstore.com';

