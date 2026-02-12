-- Security hardening for tables flagged by Supabase linter:
-- rls_disabled_in_public on public.content_history, public.image_generations,
-- public.article_audit_logs, public.article_views, public.media_library,
-- public.analytics_events, public.article_tags, public.tags.
--
-- This script is idempotent and safe to re-run.
-- It assumes role helper functions already exist:
--   public.is_profile_admin(uuid)
--   public.is_profile_editor(uuid)

do $$
begin
  if to_regprocedure('public.is_profile_admin(uuid)') is null
     or to_regprocedure('public.is_profile_editor(uuid)') is null then
    raise exception 'Missing helper functions public.is_profile_admin(uuid) / public.is_profile_editor(uuid). Run supabase/rls_profiles_role.sql first.';
  end if;
end $$;

-- 1) Enable RLS on all flagged tables
alter table public.content_history enable row level security;
alter table public.image_generations enable row level security;
alter table public.article_audit_logs enable row level security;
alter table public.article_views enable row level security;
alter table public.media_library enable row level security;
alter table public.analytics_events enable row level security;
alter table public.article_tags enable row level security;
alter table public.tags enable row level security;

do $$
begin
  -- content_history: admin/editor can read; admin/editor can insert own actor_id (or null).
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'content_history'
      and policyname = 'content_history_select_editor_v1'
  ) then
    create policy "content_history_select_editor_v1"
      on public.content_history
      for select
      to authenticated
      using (coalesce(public.is_profile_editor(auth.uid()), false));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'content_history'
      and policyname = 'content_history_insert_editor_v1'
  ) then
    create policy "content_history_insert_editor_v1"
      on public.content_history
      for insert
      to authenticated
      with check (
        coalesce(public.is_profile_editor(auth.uid()), false)
        and (
          actor_id is null
          or actor_id = auth.uid()
          or coalesce(public.is_profile_admin(auth.uid()), false)
        )
      );
  end if;

  -- image_generations: admin/editor can read; admin/editor can insert own created_by (or null).
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'image_generations'
      and policyname = 'image_generations_select_editor_v1'
  ) then
    create policy "image_generations_select_editor_v1"
      on public.image_generations
      for select
      to authenticated
      using (coalesce(public.is_profile_editor(auth.uid()), false));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'image_generations'
      and policyname = 'image_generations_insert_editor_v1'
  ) then
    create policy "image_generations_insert_editor_v1"
      on public.image_generations
      for insert
      to authenticated
      with check (
        coalesce(public.is_profile_editor(auth.uid()), false)
        and (
          created_by is null
          or created_by = auth.uid()
          or coalesce(public.is_profile_admin(auth.uid()), false)
        )
      );
  end if;

  -- article_audit_logs: admin/editor can read; admin/editor can insert own performed_by (or null).
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'article_audit_logs'
      and policyname = 'article_audit_logs_select_editor_v1'
  ) then
    create policy "article_audit_logs_select_editor_v1"
      on public.article_audit_logs
      for select
      to authenticated
      using (coalesce(public.is_profile_editor(auth.uid()), false));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'article_audit_logs'
      and policyname = 'article_audit_logs_insert_editor_v1'
  ) then
    create policy "article_audit_logs_insert_editor_v1"
      on public.article_audit_logs
      for insert
      to authenticated
      with check (
        coalesce(public.is_profile_editor(auth.uid()), false)
        and (
          performed_by is null
          or performed_by = auth.uid()
          or coalesce(public.is_profile_admin(auth.uid()), false)
        )
      );
  end if;

  -- article_views:
  -- - public insert is required for anonymous article tracking endpoint fallback.
  -- - admin/editor can read in analytics dashboard.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'article_views'
      and policyname = 'article_views_select_editor_v1'
  ) then
    create policy "article_views_select_editor_v1"
      on public.article_views
      for select
      to authenticated
      using (coalesce(public.is_profile_editor(auth.uid()), false));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'article_views'
      and policyname = 'article_views_insert_public_v1'
  ) then
    create policy "article_views_insert_public_v1"
      on public.article_views
      for insert
      to anon, authenticated
      with check (
        exists (
          select 1
          from public.articles a
          where a.id = article_views.article_id
            and a.is_published = true
            and (a.published_at is null or a.published_at <= now())
        )
      );
  end if;

  -- media_library: admin/editor full management from admin UI.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'media_library'
      and policyname = 'media_library_select_editor_v1'
  ) then
    create policy "media_library_select_editor_v1"
      on public.media_library
      for select
      to authenticated
      using (coalesce(public.is_profile_editor(auth.uid()), false));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'media_library'
      and policyname = 'media_library_insert_editor_v1'
  ) then
    create policy "media_library_insert_editor_v1"
      on public.media_library
      for insert
      to authenticated
      with check (
        coalesce(public.is_profile_editor(auth.uid()), false)
        and (
          uploaded_by is null
          or uploaded_by = auth.uid()
          or coalesce(public.is_profile_admin(auth.uid()), false)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'media_library'
      and policyname = 'media_library_update_editor_v1'
  ) then
    create policy "media_library_update_editor_v1"
      on public.media_library
      for update
      to authenticated
      using (coalesce(public.is_profile_editor(auth.uid()), false))
      with check (
        coalesce(public.is_profile_editor(auth.uid()), false)
        and (
          uploaded_by is null
          or uploaded_by = auth.uid()
          or coalesce(public.is_profile_admin(auth.uid()), false)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'media_library'
      and policyname = 'media_library_delete_editor_v1'
  ) then
    create policy "media_library_delete_editor_v1"
      on public.media_library
      for delete
      to authenticated
      using (coalesce(public.is_profile_editor(auth.uid()), false));
  end if;

  -- analytics_events:
  -- - public insert is required for anonymous frontend event tracking endpoint fallback.
  -- - admin/editor read is allowed for internal analytics diagnostics.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analytics_events'
      and policyname = 'analytics_events_select_editor_v1'
  ) then
    create policy "analytics_events_select_editor_v1"
      on public.analytics_events
      for select
      to authenticated
      using (coalesce(public.is_profile_editor(auth.uid()), false));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analytics_events'
      and policyname = 'analytics_events_insert_public_v1'
  ) then
    create policy "analytics_events_insert_public_v1"
      on public.analytics_events
      for insert
      to anon, authenticated
      with check (coalesce(length(trim(event_type)), 0) > 0);
  end if;

  -- tags + article_tags: admin/editor-only taxonomy management from AILab.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tags'
      and policyname = 'tags_select_editor_v1'
  ) then
    create policy "tags_select_editor_v1"
      on public.tags
      for select
      to authenticated
      using (coalesce(public.is_profile_editor(auth.uid()), false));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tags'
      and policyname = 'tags_insert_editor_v1'
  ) then
    create policy "tags_insert_editor_v1"
      on public.tags
      for insert
      to authenticated
      with check (coalesce(public.is_profile_editor(auth.uid()), false));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'article_tags'
      and policyname = 'article_tags_select_editor_v1'
  ) then
    create policy "article_tags_select_editor_v1"
      on public.article_tags
      for select
      to authenticated
      using (coalesce(public.is_profile_editor(auth.uid()), false));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'article_tags'
      and policyname = 'article_tags_insert_editor_v1'
  ) then
    create policy "article_tags_insert_editor_v1"
      on public.article_tags
      for insert
      to authenticated
      with check (coalesce(public.is_profile_editor(auth.uid()), false));
  end if;
end $$;

-- Optional verification query:
-- select schemaname, tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public'
--   and tablename in (
--     'content_history', 'image_generations', 'article_audit_logs', 'article_views',
--     'media_library', 'analytics_events', 'article_tags', 'tags'
--   )
-- order by tablename;
