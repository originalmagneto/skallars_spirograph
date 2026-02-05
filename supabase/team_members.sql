-- Team members for the "Náš tím" section

create extension if not exists "pgcrypto";

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role_sk text,
  role_en text,
  bio_sk text,
  bio_en text,
  icon text,
  company text,
  photo_url text,
  linkedin_url text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  photo_position_x numeric,
  photo_position_y numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_members_display_order_idx
  on public.team_members (display_order);
