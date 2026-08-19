-- Stage 18: Financial accounts foundation.
--
-- Financial Account = where money is held (bank, mobile money, cash).
-- Transaction = movement of money in or out of an account.
--
-- This migration only establishes the read model. Balances are derived from
-- the ledger (opening_balance + signed transaction deltas) and are never
-- stored as a running balance. Payment / expense / transfer mutations that
-- write to the ledger arrive in a later phase.

set search_path = public, app;

create type public.financial_account_type as enum ('bank', 'mobile_money', 'cash');
create type public.financial_account_status as enum ('active', 'inactive');
create type public.financial_transaction_type as enum (
  'customer_payment',  -- money in: customer payment settles into the account
  'refund',            -- money out: money returned to a customer
  'supplier_payment',  -- money out: payment to a supplier
  'expense',           -- money out: business expense paid from the account
  'transfer_in',       -- money in: credit leg of an internal transfer
  'transfer_out',      -- money out: debit leg of an internal transfer
  'opening_balance'    -- money in: initial balance entry when the account opens
);

-- Financial accounts: every place Yemanuel holds money.
create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  account_name text not null,
  account_type public.financial_account_type not null,
  institution text,
  account_number text,
  currency text not null default 'GHS' check (currency ~ '^[A-Z]{3}$'),
  status public.financial_account_status not null default 'active',
  opening_balance numeric(14, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only ledger. Amounts are stored positive; the direction is implied
-- by the transaction type. An internal transfer is two legs: a transfer_out
-- on the source account and a transfer_in on the destination account, paired
-- by `reference` (the transfer document number).
create table public.financial_account_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.financial_accounts (id) on delete restrict,
  transaction_type public.financial_transaction_type not null,
  amount numeric(14, 2) not null check (amount > 0),
  reference text,
  description text,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create trigger financial_accounts_set_updated_at
before update on public.financial_accounts
for each row execute function app.set_updated_at();

create index financial_accounts_status_idx on public.financial_accounts (status);
create index financial_accounts_type_idx on public.financial_accounts (account_type);
create index financial_account_transactions_account_occurred_idx
  on public.financial_account_transactions (account_id, occurred_at desc);

-- RLS ---------------------------------------------------------------------

alter table public.financial_accounts enable row level security;
alter table public.financial_account_transactions enable row level security;

-- Read-only for this phase. Write policies arrive with the transactions
-- phase that introduces ledger mutations.
create policy p_financial_accounts_staff_select
on public.financial_accounts for select to authenticated
using (app.has_permission('finance.read'));

create policy p_financial_account_transactions_staff_select
on public.financial_account_transactions for select to authenticated
using (app.has_permission('finance.read'));

-- Permission ---------------------------------------------------------------

insert into public.permissions (code, description)
values ('finance.read', 'View financial accounts, balances and transactions')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'owner'
  and p.code = 'finance.read'
on conflict do nothing;