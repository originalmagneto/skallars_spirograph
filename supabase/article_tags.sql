-- Join table between articles and tags

create table if not exists public.article_tags (
  article_id uuid not null references public.articles(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, tag_id)
);

create index if not exists article_tags_article_id_idx
  on public.article_tags (article_id);

create index if not exists article_tags_tag_id_idx
  on public.article_tags (tag_id);
