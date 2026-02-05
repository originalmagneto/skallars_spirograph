-- Base site_content table for multilingual overrides

create table if not exists public.site_content (
  key text primary key,
  section text not null default 'general',
  content_type text not null default 'text',
  description text,
  value_sk text,
  value_en text,
  value_de text,
  value_cn text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
