alter table public.linkedin_share_logs
  add column if not exists share_mode text not null default 'article';

create index if not exists linkedin_share_logs_article_id_idx
  on public.linkedin_share_logs(article_id);

create index if not exists linkedin_share_logs_created_at_idx
  on public.linkedin_share_logs(created_at desc);
