-- Compliance and fact-check metadata for articles

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS compliance_disclaimer_sk text,
  ADD COLUMN IF NOT EXISTS compliance_disclaimer_en text,
  ADD COLUMN IF NOT EXISTS compliance_disclaimer_de text,
  ADD COLUMN IF NOT EXISTS compliance_disclaimer_cn text,
  ADD COLUMN IF NOT EXISTS fact_checklist jsonb DEFAULT '{}'::jsonb;
