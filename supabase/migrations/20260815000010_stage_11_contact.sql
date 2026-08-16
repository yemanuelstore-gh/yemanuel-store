-- Stage 11: Customer contact & support messages.

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(full_name) between 2 and 120),
  phone text not null check (length(phone) between 9 and 20),
  email text check (
    email is null
    or (length(email) between 5 and 254 and email like '%@%')
  ),
  subject text not null check (length(subject) between 3 and 160),
  message text not null check (length(message) between 10 and 4000),
  status text not null default 'new' check (status in ('new', 'read', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger contact_messages_set_updated_at
before update on public.contact_messages
for each row execute function app.set_updated_at();

create index contact_messages_created_at_idx
on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

-- Anyone may submit a message, but only as a brand-new enquiry. The
-- submitted status can never be forged to 'read' or 'closed'.
create policy p_contact_messages_insert_public
on public.contact_messages
for insert to anon, authenticated
with check (status = 'new');

-- Messages are managed by staff with the settings.manage permission.
create policy p_contact_messages_select_staff
on public.contact_messages
for select to authenticated
using (app.has_permission('settings.manage'));

create policy p_contact_messages_update_staff
on public.contact_messages
for update to authenticated
using (app.has_permission('settings.manage'))
with check (app.has_permission('settings.manage'));

create policy p_contact_messages_delete_staff
on public.contact_messages
for delete to authenticated
using (app.has_permission('settings.manage'));