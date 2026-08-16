-- Stage 16: Configurable delivery rates, pickup orders and payment lifecycle.
--
-- Adds:
--   1. delivery_methods.kind — marks a method as 'delivery' or 'pickup'.
--   2. delivery_rates — per-method per-region delivery fees and ETA windows.
--      This becomes the authoritative source for checkout delivery fees
--      (delivery_methods.fee remains only as a legacy flat value).
--   3. orders pickup columns — pickup orders carry the chosen location.
--   4. Additive order/delivery statuses: ready_for_delivery, out_for_delivery.
--   5. Public RLS for active locations so customers can pick a pickup point.
--   6. Seeds the Standard / Express / Pickup methods and an initial, fully
--      editable rate card for all 16 Ghana regions. Fees below are starting
--      configuration (GH₵) that the store owner manages in admin — they are
--      estimates based on common courier pricing from an Accra hub and must be
--      reviewed by the store before going live.
--
-- The migration is idempotent: existing rows are never modified or removed.

-- 1. Delivery method kind -------------------------------------------------

alter table public.delivery_methods
  add column kind text not null default 'delivery'
  constraint delivery_methods_kind_check check (kind in ('delivery', 'pickup'));

-- 2. Delivery rates -------------------------------------------------------

create table public.delivery_rates (
  id uuid primary key default gen_random_uuid(),
  delivery_method_id uuid not null references public.delivery_methods (id) on delete cascade,
  region_id uuid not null references public.regions (id),
  fee numeric(14, 2) not null default 0 check (fee >= 0),
  eta_min_days integer not null default 1 check (eta_min_days >= 0),
  eta_max_days integer not null default 5 check (eta_max_days >= eta_min_days),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_rates_method_region_unique unique (delivery_method_id, region_id)
);

create trigger delivery_rates_set_updated_at
before update on public.delivery_rates
for each row execute function app.set_updated_at();

alter table public.delivery_rates enable row level security;

create policy p_delivery_rates_public_select on public.delivery_rates
  for select to anon, authenticated using (is_active);
create policy p_delivery_rates_staff_select on public.delivery_rates
  for select to authenticated using (app.has_permission('sales.read'));
create policy p_delivery_rates_staff_insert on public.delivery_rates
  for insert to authenticated with check (app.has_permission('settings.manage'));
create policy p_delivery_rates_staff_update on public.delivery_rates
  for update to authenticated using (app.has_permission('settings.manage'))
  with check (app.has_permission('settings.manage'));
create policy p_delivery_rates_staff_delete on public.delivery_rates
  for delete to authenticated using (app.has_permission('settings.manage'));

create index delivery_rates_region_id_idx on public.delivery_rates (region_id);

-- 3. Pickup orders ---------------------------------------------------------

alter table public.orders
  add column pickup_location_id uuid references public.locations (id),
  add column pickup_location_name text;

-- 4. Order / delivery lifecycle statuses (additive) -------------------------

alter type public.order_status add value if not exists 'ready_for_delivery';
alter type public.order_status add value if not exists 'out_for_delivery';
alter type public.delivery_status add value if not exists 'ready_for_delivery';
alter type public.delivery_status add value if not exists 'out_for_delivery';

-- 5. Public RLS for active pickup locations --------------------------------
-- Locations are otherwise staff-only; customers need to choose a pickup point.

create policy p_locations_public_select on public.locations
  for select to anon, authenticated using (status = 'active');

-- 6. Seed delivery methods --------------------------------------------------

insert into public.delivery_methods (code, name, kind, fee, is_active, sort_order)
values
  ('STANDARD', 'Standard Delivery', 'delivery', null, true, 10),
  ('EXPRESS', 'Express Delivery', 'delivery', null, true, 20),
  ('PICKUP', 'Pickup', 'pickup', 0, true, 30)
on conflict (code) do nothing;

-- 7. Seed delivery rates ----------------------------------------------------
-- Starting rate card for all 16 regions. Fees are GH₵ and fully editable from
-- admin settings (Settings → Delivery rates). Pickup is always GH₵ 0.
--
-- Bands (from an Accra hub, indicative):
--   Greater Accra        25–40
--   Central/Eastern/Volta 45–70
--   Ashanti/Western/North-West 50–75
--   Bono/Bono East/Ahafo/Oti 55–85
--   Northern/North East/Savannah 75–110
--   Upper East/Upper West 85–120

insert into public.delivery_rates
  (delivery_method_id, region_id, fee, eta_min_days, eta_max_days, is_active, notes)
select m.id, r.id, v.fee, v.eta_min, v.eta_max, true, v.notes
from (values
  -- Standard Delivery (2–5 business days)
  ('STANDARD', 'ACC', 25, 1, 2, 'Accra metro courier'),
  ('STANDARD', 'CEN', 45, 2, 3, 'Central region'),
  ('STANDARD', 'EAS', 45, 2, 3, 'Eastern region'),
  ('STANDARD', 'VOL', 45, 2, 3, 'Volta region'),
  ('STANDARD', 'ASH', 50, 2, 3, 'Ashanti region'),
  ('STANDARD', 'WES', 50, 2, 3, 'Western region'),
  ('STANDARD', 'WEN', 50, 2, 3, 'Western North region'),
  ('STANDARD', 'BON', 55, 2, 4, 'Bono region'),
  ('STANDARD', 'BOE', 55, 2, 4, 'Bono East region'),
  ('STANDARD', 'AHA', 55, 2, 4, 'Ahafo region'),
  ('STANDARD', 'OTI', 55, 2, 4, 'Oti region'),
  ('STANDARD', 'NOR', 75, 3, 5, 'Northern region'),
  ('STANDARD', 'NOE', 75, 3, 5, 'North East region'),
  ('STANDARD', 'SAV', 75, 3, 5, 'Savannah region'),
  ('STANDARD', 'UPE', 85, 3, 5, 'Upper East region'),
  ('STANDARD', 'UPW', 85, 3, 5, 'Upper West region'),
  -- Express Delivery (1–2 business days)
  ('EXPRESS', 'ACC', 40, 1, 1, 'Accra metro express'),
  ('EXPRESS', 'CEN', 70, 1, 2, 'Central region'),
  ('EXPRESS', 'EAS', 70, 1, 2, 'Eastern region'),
  ('EXPRESS', 'VOL', 70, 1, 2, 'Volta region'),
  ('EXPRESS', 'ASH', 75, 1, 2, 'Ashanti region'),
  ('EXPRESS', 'WES', 75, 1, 2, 'Western region'),
  ('EXPRESS', 'WEN', 75, 1, 2, 'Western North region'),
  ('EXPRESS', 'BON', 85, 1, 2, 'Bono region'),
  ('EXPRESS', 'BOE', 85, 1, 2, 'Bono East region'),
  ('EXPRESS', 'AHA', 85, 1, 2, 'Ahafo region'),
  ('EXPRESS', 'OTI', 85, 1, 2, 'Oti region'),
  ('EXPRESS', 'NOR', 110, 2, 3, 'Northern region'),
  ('EXPRESS', 'NOE', 110, 2, 3, 'North East region'),
  ('EXPRESS', 'SAV', 110, 2, 3, 'Savannah region'),
  ('EXPRESS', 'UPE', 120, 2, 3, 'Upper East region'),
  ('EXPRESS', 'UPW', 120, 2, 3, 'Upper West region'),
  -- Pickup (collection at an active store location)
  ('PICKUP', 'ACC', 0, 1, 1, 'Collection at Yemanuel Store'),
  ('PICKUP', 'CEN', 0, 1, 1, 'Collection at Yemanuel Store'),
  ('PICKUP', 'EAS', 0, 1, 1, 'Collection at Yemanuel Store'),
  ('PICKUP', 'VOL', 0, 1, 1, 'Collection at Yemanuel Store'),
  ('PICKUP', 'ASH', 0, 1, 1, 'Collection at Yemanuel Store'),
  ('PICKUP', 'WES', 0, 1, 1, 'Collection at Yemanuel Store'),
  ('PICKUP', 'WEN', 0, 1, 1, 'Collection at Yemanuel Store'),
  ('PICKUP', 'BON', 0, 1, 1, 'Collection at Yemanuel Store'),
  ('PICKUP', 'BOE', 0, 1, 1, 'Collection at Yemanuel Store'),
  ('PICKUP', 'AHA', 0, 1, 1, 'Collection at Yemanuel Store'),
  ('PICKUP', 'OTI', 0, 1, 1, 'Collection at Yemanuel Store'),
  ('PICKUP', 'NOR', 0, 1, 1, 'Collection at Yemanuel Store'),
  ('PICKUP', 'NOE', 0, 1, 1, 'Collection at Yemanuel Store'),
  ('PICKUP', 'SAV', 0, 1, 1, 'Collection at Yemanuel Store'),
  ('PICKUP', 'UPE', 0, 1, 1, 'Collection at Yemanuel Store'),
  ('PICKUP', 'UPW', 0, 1, 1, 'Collection at Yemanuel Store')
) as v(code, region_code, fee, eta_min, eta_max, notes)
join public.delivery_methods m on m.code = v.code
join public.regions r on r.code = v.region_code
on conflict (delivery_method_id, region_id) do nothing;
