-- AI generation logs for debugging long-running or failed requests
create table if not exists public.ai_generation_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid,
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  status text not null,
  model text,
  duration_ms integer,
  error_message text,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_generation_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_generation_logs'
      and policyname = 'ai_generation_logs_insert'
  ) then
    create policy "ai_generation_logs_insert"
      on public.ai_generation_logs
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_generation_logs'
      and policyname = 'ai_generation_logs_select'
  ) then
    create policy "ai_generation_logs_select"
      on public.ai_generation_logs
      for select
      using (auth.uid() = user_id);
  end if;
end $$;
