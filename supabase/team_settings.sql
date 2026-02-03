create table if not exists public.team_settings (
  id uuid primary key default gen_random_uuid(),
  show_linkedin boolean not null default true,
  show_icon boolean not null default true,
  show_bio boolean not null default true,
  columns_desktop int not null default 4,
  columns_tablet int not null default 2,
  columns_mobile int not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.team_settings enable row level security;

create policy "team_settings_read" on public.team_settings
  for select
  using (true);

create policy "team_settings_insert" on public.team_settings
  for insert
  to authenticated
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "team_settings_update" on public.team_settings
  for update
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  )
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "team_settings_delete" on public.team_settings
  for delete
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );
