-- Media library for reusable images across content fields

CREATE TABLE IF NOT EXISTS public.media_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  file_path text NOT NULL UNIQUE,
  public_url text NOT NULL,
  bucket text NOT NULL DEFAULT 'images',
  tags text[] NOT NULL DEFAULT '{}',
  alt_text text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_library_created_at_idx
  ON public.media_library (created_at DESC);

CREATE INDEX IF NOT EXISTS media_library_tags_idx
  ON public.media_library USING GIN (tags);
