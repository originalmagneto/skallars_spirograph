-- Global map cities dataset

create extension if not exists "pgcrypto";

create table if not exists public.map_cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  latitude numeric not null,
  longitude numeric not null,
  is_main boolean not null default false,
  is_secondary boolean not null default false,
  region text not null default 'europe',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists map_cities_region_idx
  on public.map_cities (region);

create index if not exists map_cities_display_order_idx
  on public.map_cities (display_order);
