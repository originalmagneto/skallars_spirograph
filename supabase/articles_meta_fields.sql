-- Add SEO/meta fields to articles table if missing
alter table public.articles
  add column if not exists meta_title_sk text,
  add column if not exists meta_title_en text,
  add column if not exists meta_title_de text,
  add column if not exists meta_title_cn text,
  add column if not exists meta_description_sk text,
  add column if not exists meta_description_en text,
  add column if not exists meta_description_de text,
  add column if not exists meta_description_cn text,
  add column if not exists meta_keywords_sk text,
  add column if not exists meta_keywords_en text,
  add column if not exists meta_keywords_de text,
  add column if not exists meta_keywords_cn text;
