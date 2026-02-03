-- Add tags array to articles table (for quick display)
alter table public.articles
  add column if not exists tags text[] default '{}';
