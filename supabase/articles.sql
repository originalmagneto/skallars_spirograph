-- Base articles table for blog content

create extension if not exists "pgcrypto";

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title_sk text,
  title_en text,
  title_de text,
  title_cn text,
  excerpt_sk text,
  excerpt_en text,
  excerpt_de text,
  excerpt_cn text,
  content_sk text,
  content_en text,
  content_de text,
  content_cn text,
  meta_title_sk text,
  meta_title_en text,
  meta_title_de text,
  meta_title_cn text,
  meta_description_sk text,
  meta_description_en text,
  meta_description_de text,
  meta_description_cn text,
  meta_keywords_sk text,
  meta_keywords_en text,
  meta_keywords_de text,
  meta_keywords_cn text,
  slug text unique,
  cover_image_url text,
  tags text[] default '{}'::text[],
  is_published boolean not null default false,
  published_at timestamptz,
  author_id uuid references auth.users(id),
  status text not null default 'draft',
  scheduled_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  compliance_disclaimer_sk text,
  compliance_disclaimer_en text,
  compliance_disclaimer_de text,
  compliance_disclaimer_cn text,
  fact_checklist jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_slug_idx
  on public.articles (slug);

create index if not exists articles_published_idx
  on public.articles (is_published, published_at desc);
