-- Image generation history for AI Image Studio

CREATE TABLE IF NOT EXISTS public.image_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid,
  prompt text NOT NULL,
  negative_prompt text,
  style_preset text,
  model text,
  engine text,
  aspect_ratio text,
  width int,
  height int,
  seed int,
  image_url text,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS image_generations_created_at_idx
  ON public.image_generations (created_at DESC);

CREATE INDEX IF NOT EXISTS image_generations_batch_idx
  ON public.image_generations (batch_id);
