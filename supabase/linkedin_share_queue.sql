create extension if not exists "pgcrypto";

create table if not exists public.linkedin_share_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid,
  share_target text not null default 'member',
  organization_urn text,
  visibility text not null default 'PUBLIC',
  message text,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled',
  provider_response jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists linkedin_share_queue_user_id_idx
  on public.linkedin_share_queue(user_id);

create index if not exists linkedin_share_queue_scheduled_at_idx
  on public.linkedin_share_queue(scheduled_at);

alter table public.linkedin_share_queue enable row level security;

-- No public policies. Access is only via service role API routes.
