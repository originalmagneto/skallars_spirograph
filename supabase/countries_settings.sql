create table if not exists public.countries_settings (
  id uuid primary key default gen_random_uuid(),
  show_stats boolean not null default true,
  show_connections boolean not null default true,
  show_labels boolean not null default true,
  show_controls boolean not null default true,
  default_focus text not null default 'centralEurope',
  updated_at timestamptz not null default now()
);

alter table public.countries_settings enable row level security;

create policy "countries_settings_read" on public.countries_settings
  for select
  using (true);

create policy "countries_settings_insert" on public.countries_settings
  for insert
  to authenticated
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "countries_settings_update" on public.countries_settings
  for update
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  )
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "countries_settings_delete" on public.countries_settings
  for delete
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );
