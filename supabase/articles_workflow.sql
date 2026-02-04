-- Article workflow columns for approvals + scheduling

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

CREATE INDEX IF NOT EXISTS articles_status_idx
  ON public.articles (status);

CREATE INDEX IF NOT EXISTS articles_published_at_idx
  ON public.articles (published_at DESC);

CREATE INDEX IF NOT EXISTS articles_scheduled_at_idx
  ON public.articles (scheduled_at DESC);
