-- Finance: account transaction ledger compatibility migration.
-- Uses the existing account_transactions schema already present in the database.
-- Supports deposits, withdrawals and transfers without replacing existing data.

set search_path = public, extensions;

do $$
begin
  create type public.account_transaction_type
    as enum ('deposit', 'withdrawal', 'transfer');
exception
  when duplicate_object then null;
end
$$;

create sequence if not exists app.seq_at;

grant usage on sequence app.seq_at to service_role;

-- Existing table is intentionally preserved.
-- It already contains:
-- transaction_number, transaction_type,
-- bank_account_id, mobile_money_account_id,
-- transfer_bank_account_id, transfer_mobile_money_account_id,
-- transaction_date, amount, reference, description,
-- balance_after, status, created_by, created_at, updated_at.

alter table public.account_transactions enable row level security;

create index if not exists account_transactions_created_at_idx
  on public.account_transactions (created_at desc);

create index if not exists account_transactions_date_idx
  on public.account_transactions (transaction_date desc);

create index if not exists account_transactions_bank_idx
  on public.account_transactions (bank_account_id);

create index if not exists account_transactions_mobile_money_idx
  on public.account_transactions (mobile_money_account_id);

create index if not exists account_transactions_transfer_bank_idx
  on public.account_transactions (transfer_bank_account_id);

create index if not exists account_transactions_transfer_mobile_money_idx
  on public.account_transactions (transfer_mobile_money_account_id);

-- Current balance for every registered bank/mobile-money account.
create or replace function app.finance_account_balances(p_kind text)
returns table (
  account_id uuid,
  balance numeric,
  total_credits numeric,
  total_debits numeric,
  transaction_count bigint
)
language sql
security invoker
stable
as $$
  with accounts as (
    select id, opening_balance
    from public.bank_accounts
    where p_kind = 'bank'

    union all

    select id, opening_balance
    from public.mobile_money_accounts
    where p_kind = 'mobile_money'
  ),
  credits as (
    -- Deposits into bank accounts.
    select
      t.bank_account_id as account_id,
      sum(t.amount) as total,
      count(*) as n
    from public.account_transactions t
    where t.transaction_type = 'deposit'
      and t.bank_account_id is not null
    group by t.bank_account_id

    union all

    -- Deposits into mobile money.
    select
      t.mobile_money_account_id as account_id,
      sum(t.amount) as total,
      count(*) as n
    from public.account_transactions t
    where t.transaction_type = 'deposit'
      and t.mobile_money_account_id is not null
    group by t.mobile_money_account_id

    union all

    -- Incoming bank transfers.
    select
      t.transfer_bank_account_id as account_id,
      sum(t.amount) as total,
      count(*) as n
    from public.account_transactions t
    where t.transaction_type = 'transfer'
      and t.transfer_bank_account_id is not null
    group by t.transfer_bank_account_id

    union all

    -- Incoming mobile-money transfers.
    select
      t.transfer_mobile_money_account_id as account_id,
      sum(t.amount) as total,
      count(*) as n
    from public.account_transactions t
    where t.transaction_type = 'transfer'
      and t.transfer_mobile_money_account_id is not null
    group by t.transfer_mobile_money_account_id
  ),
  debits as (
    -- Withdrawals from bank accounts.
    select
      t.bank_account_id as account_id,
      sum(t.amount) as total,
      count(*) as n
    from public.account_transactions t
    where t.transaction_type = 'withdrawal'
      and t.bank_account_id is not null
    group by t.bank_account_id

    union all

    -- Withdrawals from mobile money.
    select
      t.mobile_money_account_id as account_id,
      sum(t.amount) as total,
      count(*) as n
    from public.account_transactions t
    where t.transaction_type = 'withdrawal'
      and t.mobile_money_account_id is not null
    group by t.mobile_money_account_id

    union all

    -- Outgoing bank transfers.
    select
      t.bank_account_id as account_id,
      sum(t.amount) as total,
      count(*) as n
    from public.account_transactions t
    where t.transaction_type = 'transfer'
      and t.bank_account_id is not null
    group by t.bank_account_id

    union all

    -- Outgoing mobile-money transfers.
    select
      t.mobile_money_account_id as account_id,
      sum(t.amount) as total,
      count(*) as n
    from public.account_transactions t
    where t.transaction_type = 'transfer'
      and t.mobile_money_account_id is not null
    group by t.mobile_money_account_id
  ),
  credit_totals as (
    select
      account_id,
      sum(total) as total,
      sum(n) as n
    from credits
    group by account_id
  ),
  debit_totals as (
    select
      account_id,
      sum(total) as total,
      sum(n) as n
    from debits
    group by account_id
  )
  select
    a.id,
    a.opening_balance
      + coalesce(c.total, 0)
      - coalesce(d.total, 0) as balance,
    coalesce(c.total, 0) as total_credits,
    coalesce(d.total, 0) as total_debits,
    coalesce(c.n, 0) + coalesce(d.n, 0) as transaction_count
  from accounts a
  left join credit_totals c on c.account_id = a.id
  left join debit_totals d on d.account_id = a.id;
$$;

-- Transaction history for one account.
create or replace function app.finance_account_transactions(
  p_kind text,
  p_account_id uuid,
  p_q text default null,
  p_page integer default 1,
  p_page_size integer default 20
)
returns jsonb
language plpgsql
security invoker
stable
as $$
declare
  v_balance numeric(14,2);
  v_credits numeric(14,2);
  v_debits numeric(14,2);
  v_total bigint;
  v_rows jsonb;
begin
  if p_page < 1 then
    p_page := 1;
  end if;

  if p_page_size < 1 or p_page_size > 100 then
    p_page_size := 20;
  end if;

  select
    fab.balance,
    fab.total_credits,
    fab.total_debits
  into
    v_balance,
    v_credits,
    v_debits
  from app.finance_account_balances(p_kind) fab
  where fab.account_id = p_account_id;

  select count(*)
  into v_total
  from public.account_transactions t
  where (
    (p_kind = 'bank'
      and (
        t.bank_account_id = p_account_id
        or t.transfer_bank_account_id = p_account_id
      ))
    or
    (p_kind = 'mobile_money'
      and (
        t.mobile_money_account_id = p_account_id
        or t.transfer_mobile_money_account_id = p_account_id
      ))
  )
  and (
    p_q is null
    or p_q = ''
    or t.transaction_number ilike '%' || p_q || '%'
    or coalesce(t.reference, '') ilike '%' || p_q || '%'
    or coalesce(t.description, '') ilike '%' || p_q || '%'
  );

  select jsonb_agg(x.row order by x.transaction_date desc, x.created_at desc)
  into v_rows
  from (
    select
      jsonb_build_object(
        'id', t.id,
        'transaction_number', t.transaction_number,
        'transaction_type', t.transaction_type,
        'amount', t.amount,
        'direction',
          case
            when t.transaction_type = 'deposit' then 'in'
            when t.transaction_type = 'withdrawal' then 'out'
            when t.transaction_type = 'transfer'
              and (
                (p_kind = 'bank' and t.transfer_bank_account_id = p_account_id)
                or
                (p_kind = 'mobile_money' and t.transfer_mobile_money_account_id = p_account_id)
              )
              then 'in'
            else 'out'
          end,
        'transaction_date', t.transaction_date,
        'reference', t.reference,
        'description', t.description,
        'status', t.status,
        'balance_after', t.balance_after,
        'created_at', t.created_at
      ) as row,
      t.transaction_date,
      t.created_at
    from public.account_transactions t
    where (
      (p_kind = 'bank'
        and (
          t.bank_account_id = p_account_id
          or t.transfer_bank_account_id = p_account_id
        ))
      or
      (p_kind = 'mobile_money'
        and (
          t.mobile_money_account_id = p_account_id
          or t.transfer_mobile_money_account_id = p_account_id
        ))
    )
    and (
      p_q is null
      or p_q = ''
      or t.transaction_number ilike '%' || p_q || '%'
      or coalesce(t.reference, '') ilike '%' || p_q || '%'
      or coalesce(t.description, '') ilike '%' || p_q || '%'
    )
    order by t.transaction_date desc, t.created_at desc
    limit p_page_size
    offset (p_page - 1) * p_page_size
  ) x;

  return jsonb_build_object(
    'balance', coalesce(v_balance, 0),
    'total_credits', coalesce(v_credits, 0),
    'total_debits', coalesce(v_debits, 0),
    'total', v_total,
    'rows', coalesce(v_rows, '[]'::jsonb)
  );
end;
$$;

grant execute on function app.finance_account_balances(text)
  to authenticated, service_role;

grant execute on function app.finance_account_transactions(
  text, uuid, text, integer, integer
) to authenticated, service_role;
