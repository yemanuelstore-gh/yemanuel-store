create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  amount numeric(14, 2) not null,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  payment_date timestamptz not null default now(),
  reference text,
  provider text,
  provider_reference text,
  notes text,
  received_by uuid references public.staff (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger payments_set_updated_at
before update on public.payments
for each row execute function app.set_updated_at();