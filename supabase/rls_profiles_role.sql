-- Align RLS with profiles.role used by the app
-- Run after supabase/content_registry.sql

-- Ensure profiles.role exists for app checks
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- Helper functions for role checks (profiles.role)
CREATE OR REPLACE FUNCTION public.is_profile_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_profile_editor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.role IN ('admin', 'editor')
  )
$$;

-- Content registry policies (admin/editor read, admin write)
ALTER TABLE public.content_registry ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'content_registry'
      AND policyname = 'content_registry_read_profiles_role'
  ) THEN
    CREATE POLICY "content_registry_read_profiles_role"
      ON public.content_registry
      FOR SELECT
      TO authenticated
      USING (public.is_profile_editor(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'content_registry'
      AND policyname = 'content_registry_manage_profiles_role'
  ) THEN
    CREATE POLICY "content_registry_manage_profiles_role"
      ON public.content_registry
      FOR ALL
      TO authenticated
      USING (public.is_profile_admin(auth.uid()));
  END IF;
END $$;

-- Site content policies (public read, admin write)
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_content_public_read_v2"
  ON public.site_content
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "site_content_manage_profiles_role"
  ON public.site_content
  FOR ALL
  TO authenticated
  USING (public.is_profile_admin(auth.uid()));
