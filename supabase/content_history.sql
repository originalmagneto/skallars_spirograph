-- Content history for published site_content changes

CREATE TABLE IF NOT EXISTS public.content_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key text NOT NULL,
  section text,
  value_sk text,
  value_en text,
  value_de text,
  value_cn text,
  actor_id uuid,
  actor_email text,
  action text NOT NULL DEFAULT 'publish',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_history_key_idx
  ON public.content_history (content_key, created_at DESC);
