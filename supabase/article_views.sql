-- Article view tracking

CREATE TABLE IF NOT EXISTS public.article_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  viewer_id uuid,
  ip_hash text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS article_views_article_idx
  ON public.article_views (article_id);

CREATE INDEX IF NOT EXISTS article_views_viewed_at_idx
  ON public.article_views (viewed_at DESC);
