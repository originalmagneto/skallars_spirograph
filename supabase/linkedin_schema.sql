create extension if not exists "pgcrypto";

create table if not exists public.linkedin_oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state text not null unique,
  redirect_to text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.linkedin_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  member_urn text,
  member_name text,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scopes text[],
  organization_urns text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists linkedin_accounts_user_id_key
  on public.linkedin_accounts(user_id);

create table if not exists public.linkedin_share_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid,
  share_target text,
  visibility text,
  status text not null,
  share_url text,
  provider_response jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.linkedin_oauth_states enable row level security;
alter table public.linkedin_accounts enable row level security;
alter table public.linkedin_share_logs enable row level security;

-- No public policies. Access is only via service role API routes.
