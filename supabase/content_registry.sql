-- Content Registry table for admin-friendly content definitions
-- This table is not required at runtime yet, but will drive the improved Content Manager UI.

CREATE TABLE IF NOT EXISTS public.content_registry (
  key text PRIMARY KEY,
  section text NOT NULL DEFAULT 'general',
  label text NOT NULL,
  content_type text NOT NULL DEFAULT 'text',
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_registry_section_order_idx
  ON public.content_registry (section, sort_order);

-- Optional: enable RLS and add policies to match your auth model.
-- ALTER TABLE public.content_registry ENABLE ROW LEVEL SECURITY;
-- Example policy (adjust to your roles):
-- CREATE POLICY "content registry read" ON public.content_registry
--   FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "content registry manage" ON public.content_registry
--   FOR ALL TO authenticated
--   USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
