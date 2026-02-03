create table if not exists public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page text not null,
  section_key text not null,
  label text not null,
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page, section_key)
);

alter table public.page_sections enable row level security;

-- Public read (needed for homepage layout)
create policy "page_sections_read" on public.page_sections
  for select
  using (true);

-- Admin/editor write access
create policy "page_sections_insert" on public.page_sections
  for insert
  to authenticated
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "page_sections_update" on public.page_sections
  for update
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  )
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "page_sections_delete" on public.page_sections
  for delete
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );
