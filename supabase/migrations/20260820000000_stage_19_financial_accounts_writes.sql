-- Stage 19: Allow staff to add financial accounts.
--
-- This stage write-enables financial_accounts (stage 18 established the
-- read model). Applies on top of stage 18 — apply it after
-- 20260819000000_stage_18_financial_accounts.sql.
--
-- Adding an account is the first ledger-touching mutation. The opening
-- balance is stored on the account row itself; ledger transactions for
-- payments, expenses and transfers arrive in a later phase.

set search_path = public, app;

-- Permission ---------------------------------------------------------------

insert into public.permissions (code, description)
values ('finance.create', 'Add bank, mobile-money and cash accounts')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'owner'
  and p.code = 'finance.create'
on conflict do nothing;

-- RLS ----------------------------------------------------------------------

-- Accounts can be created by any authenticated staff member holding the
-- permission. Only the columns a user is allowed to provide are exposed by
-- the application form; defaults and constraints stay in the schema.
create policy p_financial_accounts_staff_insert
on public.financial_accounts for insert to authenticated
with check (app.has_permission('finance.create'));