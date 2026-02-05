-- Tags for articles

create extension if not exists "pgcrypto";

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name_sk text,
  name_en text,
  name_de text,
  name_cn text,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create index if not exists tags_slug_idx
  on public.tags (slug);
