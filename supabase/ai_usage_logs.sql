-- AI usage logs for cost analytics and monitoring

create extension if not exists "pgcrypto";

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text,
  model text,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_logs_user_id_idx
  on public.ai_usage_logs (user_id);

create index if not exists ai_usage_logs_created_at_idx
  on public.ai_usage_logs (created_at desc);
