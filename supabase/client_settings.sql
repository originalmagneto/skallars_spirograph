create table if not exists public.client_settings (
  id uuid primary key default gen_random_uuid(),
  autoplay boolean not null default true,
  autoplay_interval_ms int not null default 3000,
  visible_count int not null default 3,
  updated_at timestamptz not null default now()
);

alter table public.client_settings enable row level security;

create policy "client_settings_read" on public.client_settings
  for select
  using (true);

create policy "client_settings_insert" on public.client_settings
  for insert
  to authenticated
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "client_settings_update" on public.client_settings
  for update
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  )
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "client_settings_delete" on public.client_settings
  for delete
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );
