-- Generic key/value settings store (AI keys, SEO defaults, etc.)

create table if not exists public.settings (
  key text primary key,
  value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
