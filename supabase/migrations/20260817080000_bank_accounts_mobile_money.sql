-- Finance module: Bank Accounts and Mobile Money Accounts.
--
-- Account master records only. No ledger, no transaction tables and no
-- balance automation. Future financial transactions will reference these
-- accounts once posting infrastructure ships.
--
-- Access follows the finance permission family used by the Expenses module
-- (expenses.read / expenses.create / expenses.update) because the system has
-- no finance.* permissions.
--
-- Deletion is intentionally unsupported: accounts are deactivated, never
-- deleted, because they may later become linked to transactions.
--
-- Idempotent: safe to re-run.

set search_path = public, extensions;

create type public.bank_account_type as enum ('current', 'savings', 'corporate', 'other');
create type public.mobile_money_account_type as enum ('business', 'merchant', 'wallet', 'other');

-- Account code sequences: BA-YYYY-00001 / MM-YYYY-00001 generated through
-- app.next_document_number, the same race-safe architecture as every other
-- document number in the system.
create sequence app.seq_ba;
create sequence app.seq_mm;

grant usage on sequence app.seq_ba, app.seq_mm to service_role;

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  account_code text not null unique,
  account_name text not null,
  bank_name text not null,
  account_number text not null,
  account_type public.bank_account_type not null default 'current',
  branch_name text,
  currency text not null default 'GHS',
  opening_balance numeric(14, 2) not null default 0,
  status public.entity_status not null default 'active',
  notes text,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_accounts_opening_balance_non_negative check (opening_balance >= 0)
);

create table public.mobile_money_accounts (
  id uuid primary key default gen_random_uuid(),
  account_code text not null unique,
  account_name text not null,
  provider text not null,
  mobile_number text not null,
  account_type public.mobile_money_account_type not null default 'business',
  currency text not null default 'GHS',
  opening_balance numeric(14, 2) not null default 0,
  status public.entity_status not null default 'active',
  notes text,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mobile_money_accounts_opening_balance_non_negative check (opening_balance >= 0)
);

create trigger bank_accounts_set_updated_at
before update on public.bank_accounts
for each row execute function app.set_updated_at();

create trigger mobile_money_accounts_set_updated_at
before update on public.mobile_money_accounts
for each row execute function app.set_updated_at();

alter table public.bank_accounts enable row level security;
alter table public.mobile_money_accounts enable row level security;

create policy p_bank_accounts_staff_select on public.bank_accounts for select to authenticated using (app.has_permission('expenses.read'));
create policy p_bank_accounts_staff_insert on public.bank_accounts for insert to authenticated with check (app.has_permission('expenses.create'));
create policy p_bank_accounts_staff_update on public.bank_accounts for update to authenticated using (app.has_permission('expenses.update')) with check (app.has_permission('expenses.update'));

create policy p_mobile_money_accounts_staff_select on public.mobile_money_accounts for select to authenticated using (app.has_permission('expenses.read'));
create policy p_mobile_money_accounts_staff_insert on public.mobile_money_accounts for insert to authenticated with check (app.has_permission('expenses.create'));
create policy p_mobile_money_accounts_staff_update on public.mobile_money_accounts for update to authenticated using (app.has_permission('expenses.update')) with check (app.has_permission('expenses.update'));

-- No delete policies anywhere: accounts are deactivated, never deleted.

create index bank_accounts_status_idx on public.bank_accounts (status);
create unique index bank_accounts_active_account_number_idx on public.bank_accounts (account_number) where status = 'active';

create index mobile_money_accounts_status_idx on public.mobile_money_accounts (status);
create index mobile_money_accounts_provider_idx on public.mobile_money_accounts (provider);
create unique index mobile_money_accounts_active_mobile_number_idx on public.mobile_money_accounts (mobile_number) where status = 'active';