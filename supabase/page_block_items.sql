create table if not exists public.page_block_items (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.page_blocks(id) on delete cascade,
  title_sk text,
  title_en text,
  title_de text,
  title_cn text,
  subtitle_sk text,
  subtitle_en text,
  subtitle_de text,
  subtitle_cn text,
  body_sk text,
  body_en text,
  body_de text,
  body_cn text,
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.page_block_items enable row level security;

create policy "page_block_items_read" on public.page_block_items
  for select
  using (true);

create policy "page_block_items_insert" on public.page_block_items
  for insert
  to authenticated
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "page_block_items_update" on public.page_block_items
  for update
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  )
  with check (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );

create policy "page_block_items_delete" on public.page_block_items
  for delete
  to authenticated
  using (
    coalesce(is_profile_admin(auth.uid()), false) OR coalesce(is_profile_editor(auth.uid()), false)
  );
