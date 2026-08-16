create table public.regions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions (id),
  name text not null,
  is_active boolean not null default true
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null unique,
  profile_id uuid unique references public.profiles (id) on delete set null,
  customer_type public.customer_type not null default 'individual',
  first_name text not null,
  last_name text not null,
  business_name text,
  phone text not null,
  email citext,
  tin_number text,
  status public.customer_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id)
);

create unique index customers_email_unique on public.customers (email) where email is not null;

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  label text not null,
  recipient_name text not null,
  recipient_phone text not null,
  address_line_1 text not null,
  address_line_2 text,
  city_id uuid references public.cities (id),
  region_id uuid not null references public.regions (id),
  postal_code text,
  is_default_billing boolean not null default false,
  is_default_delivery boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  location_type public.location_type not null default 'store',
  region_id uuid not null references public.regions (id),
  city text not null,
  address_line_1 text not null,
  address_line_2 text,
  phone text,
  status public.entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger customers_set_updated_at
before update on public.customers
for each row execute function app.set_updated_at();

create trigger customer_addresses_set_updated_at
before update on public.customer_addresses
for each row execute function app.set_updated_at();

create trigger locations_set_updated_at
before update on public.locations
for each row execute function app.set_updated_at();

insert into public.regions (code, name)
values
  ('ACC', 'Greater Accra'),
  ('ASH', 'Ashanti'),
  ('WES', 'Western'),
  ('CEN', 'Central'),
  ('EAS', 'Eastern'),
  ('VOL', 'Volta'),
  ('NOR', 'Northern'),
  ('UPE', 'Upper East'),
  ('UPW', 'Upper West'),
  ('BON', 'Bono'),
  ('BOE', 'Bono East'),
  ('AHA', 'Ahafo'),
  ('SAV', 'Savannah'),
  ('NOE', 'North East'),
  ('OTI', 'Oti'),
  ('WEN', 'Western North');

insert into public.cities (region_id, name, is_active)
select r.id, v.name, true
from (values
  ('ACC', 'Accra'),
  ('ACC', 'Tema'),
  ('ACC', 'Ashaiman'),
  ('ACC', 'Madina'),
  ('ACC', 'Adenta'),
  ('ACC', 'Nungua'),
  ('ACC', 'Teshie'),
  ('ACC', 'Dansoman'),
  ('ASH', 'Kumasi'),
  ('ASH', 'Obuasi'),
  ('ASH', 'Ejisu'),
  ('ASH', 'Mampong'),
  ('ASH', 'Bekwai'),
  ('ASH', 'Konongo-Odumase'),
  ('ASH', 'Agogo'),
  ('WES', 'Sekondi-Takoradi'),
  ('WES', 'Tarkwa'),
  ('WES', 'Axim'),
  ('WES', 'Prestea'),
  ('WES', 'Half Assini'),
  ('WES', 'Bogoso'),
  ('CEN', 'Cape Coast'),
  ('CEN', 'Winneba'),
  ('CEN', 'Kasoa'),
  ('CEN', 'Elmina'),
  ('CEN', 'Agona Swedru'),
  ('CEN', 'Saltpond'),
  ('CEN', 'Dunkwa-on-Offin'),
  ('EAS', 'Koforidua'),
  ('EAS', 'Nkawkaw'),
  ('EAS', 'Akim Oda'),
  ('EAS', 'Suhum'),
  ('EAS', 'Asamankese'),
  ('EAS', 'Aburi'),
  ('EAS', 'Mpraeso'),
  ('EAS', 'Kibi'),
  ('VOL', 'Ho'),
  ('VOL', 'Hohoe'),
  ('VOL', 'Aflao'),
  ('VOL', 'Keta'),
  ('VOL', 'Kpando'),
  ('VOL', 'Anloga'),
  ('VOL', 'Dzodze'),
  ('NOR', 'Tamale'),
  ('NOR', 'Yendi'),
  ('NOR', 'Savelugu'),
  ('NOR', 'Bimbilla'),
  ('NOR', 'Gushegu'),
  ('UPE', 'Bolgatanga'),
  ('UPE', 'Navrongo'),
  ('UPE', 'Bawku'),
  ('UPE', 'Zebilla'),
  ('UPE', 'Bongo'),
  ('UPW', 'Wa'),
  ('UPW', 'Lawra'),
  ('UPW', 'Nandom'),
  ('UPW', 'Tumu'),
  ('UPW', 'Jirapa'),
  ('BON', 'Sunyani'),
  ('BON', 'Berekum'),
  ('BON', 'Wenchi'),
  ('BON', 'Dormaa Ahenkro'),
  ('BOE', 'Techiman'),
  ('BOE', 'Kintampo'),
  ('BOE', 'Atebubu'),
  ('BOE', 'Nkoranza'),
  ('BOE', 'Yeji'),
  ('AHA', 'Goaso'),
  ('AHA', 'Mim'),
  ('AHA', 'Bechem'),
  ('AHA', 'Duayaw-Nkwanta'),
  ('SAV', 'Damongo'),
  ('SAV', 'Salaga'),
  ('SAV', 'Bole'),
  ('SAV', 'Sawla'),
  ('NOE', 'Nalerigu'),
  ('NOE', 'Gambaga'),
  ('NOE', 'Walewale'),
  ('NOE', 'Chereponi'),
  ('OTI', 'Dambai'),
  ('OTI', 'Kete-Krachi'),
  ('OTI', 'Nkwanta'),
  ('OTI', 'Jasikan'),
  ('WEN', 'Sefwi Wiawso'),
  ('WEN', 'Enchi'),
  ('WEN', 'Sefwi Akontombra')
) as v(code, name)
join public.regions r on r.code = v.code;