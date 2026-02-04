-- Article audit logs

CREATE TABLE IF NOT EXISTS public.article_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL,
  action text NOT NULL,
  status text,
  performed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS article_audit_logs_article_idx
  ON public.article_audit_logs (article_id);
