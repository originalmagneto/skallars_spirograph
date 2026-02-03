create table if not exists public.service_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_sk text not null,
  title_en text not null,
  title_de text not null,
  title_cn text not null,
  description_sk text not null,
  description_en text not null,
  description_de text not null,
  description_cn text not null,
  icon text,
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_items enable row level security;

create policy "service_items_read" on public.service_items
  for select
  using (true);

create policy "service_items_insert" on public.service_items
  for insert
  to authenticated
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "service_items_update" on public.service_items
  for update
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  )
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "service_items_delete" on public.service_items
  for delete
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );
