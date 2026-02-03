create table if not exists public.footer_settings (
  id uuid primary key default gen_random_uuid(),
  show_newsletter boolean not null default true,
  show_social boolean not null default true,
  show_solutions boolean not null default true,
  show_contact boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.footer_settings enable row level security;

create policy "footer_settings_read" on public.footer_settings
  for select
  using (true);

create policy "footer_settings_insert" on public.footer_settings
  for insert
  to authenticated
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "footer_settings_update" on public.footer_settings
  for update
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  )
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "footer_settings_delete" on public.footer_settings
  for delete
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );
