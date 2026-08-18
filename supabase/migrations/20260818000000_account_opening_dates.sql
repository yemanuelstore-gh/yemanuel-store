-- Finance module: account opening dates.
--
-- Adds an editable business/opening date to the bank and mobile money
-- account master records.
--
--   opening_date = the actual date the account was opened or became active
--                  at the bank / mobile money provider.
--   created_at   = when the ERP record itself was created.
--   updated_at   = when the ERP record was last modified.
--
-- Existing records are preserved untouched: opening_date starts NULL and is
-- only filled in when an account is explicitly edited. No historical dates
-- are invented, and created_at is never substituted for opening_date.
--
-- Idempotent: safe to re-run.

set search_path = public, extensions;

alter table public.bank_accounts
  add column if not exists opening_date date;

alter table public.mobile_money_accounts
  add column if not exists opening_date date;

comment on column public.bank_accounts.opening_date is
  'Actual date the account was opened or became active.';
comment on column public.mobile_money_accounts.opening_date is
  'Actual date the account was opened or became active.';
