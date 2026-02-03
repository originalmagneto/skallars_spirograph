create table if not exists public.footer_links (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  label_sk text not null,
  label_en text not null,
  label_de text not null,
  label_cn text not null,
  url text not null,
  is_external boolean not null default false,
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.footer_links enable row level security;

create policy "footer_links_read" on public.footer_links
  for select
  using (true);

create policy "footer_links_insert" on public.footer_links
  for insert
  to authenticated
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "footer_links_update" on public.footer_links
  for update
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  )
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "footer_links_delete" on public.footer_links
  for delete
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );
