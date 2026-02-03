create table if not exists public.news_settings (
  id uuid primary key default gen_random_uuid(),
  limit_count int not null default 9,
  show_view_all boolean not null default true,
  autoplay boolean not null default true,
  autoplay_interval_ms int not null default 50,
  scroll_step int not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.news_settings enable row level security;

create policy "news_settings_read" on public.news_settings
  for select
  using (true);

create policy "news_settings_insert" on public.news_settings
  for insert
  to authenticated
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "news_settings_update" on public.news_settings
  for update
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  )
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "news_settings_delete" on public.news_settings
  for delete
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );
