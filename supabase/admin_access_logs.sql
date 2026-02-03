-- Admin access diagnostics logs
create table if not exists public.admin_access_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  status text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_access_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_access_logs'
      and policyname = 'admin_access_logs_insert'
  ) then
    create policy "admin_access_logs_insert"
      on public.admin_access_logs
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_access_logs'
      and policyname = 'admin_access_logs_select'
  ) then
    create policy "admin_access_logs_select"
      on public.admin_access_logs
      for select
      using (auth.uid() = user_id);
  end if;
end $$;
