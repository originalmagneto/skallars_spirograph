-- RLS policies for articles (public can read published articles)
alter table public.articles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'articles'
      and policyname = 'articles_public_read'
  ) then
    create policy "articles_public_read"
      on public.articles
      for select
      to anon, authenticated
      using (is_published = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'articles'
      and policyname = 'articles_manage_editor'
  ) then
    create policy "articles_manage_editor"
      on public.articles
      for all
      to authenticated
      using (public.is_profile_editor(auth.uid()))
      with check (public.is_profile_editor(auth.uid()));
  end if;
end $$;
