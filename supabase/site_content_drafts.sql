-- Add draft fields to site_content for draft/publish workflow
ALTER TABLE public.site_content
  ADD COLUMN IF NOT EXISTS draft_value_sk text,
  ADD COLUMN IF NOT EXISTS draft_value_en text,
  ADD COLUMN IF NOT EXISTS draft_value_de text,
  ADD COLUMN IF NOT EXISTS draft_value_cn text,
  ADD COLUMN IF NOT EXISTS draft_updated_at timestamptz;
