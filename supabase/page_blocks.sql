create table if not exists public.page_blocks (
  id uuid primary key default gen_random_uuid(),
  page text not null,
  block_type text not null,
  title_sk text,
  title_en text,
  title_de text,
  title_cn text,
  body_sk text,
  body_en text,
  body_de text,
  body_cn text,
  button_label_sk text,
  button_label_en text,
  button_label_de text,
  button_label_cn text,
  button_url text,
  button_external boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.page_blocks enable row level security;

create policy "page_blocks_read" on public.page_blocks
  for select
  using (true);

create policy "page_blocks_insert" on public.page_blocks
  for insert
  to authenticated
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "page_blocks_update" on public.page_blocks
  for update
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  )
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "page_blocks_delete" on public.page_blocks
  for delete
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );
