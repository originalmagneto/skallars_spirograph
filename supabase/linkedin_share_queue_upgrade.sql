alter table public.linkedin_share_queue
  add column if not exists share_mode text not null default 'article';

alter table public.linkedin_share_queue
  add column if not exists image_url text;
