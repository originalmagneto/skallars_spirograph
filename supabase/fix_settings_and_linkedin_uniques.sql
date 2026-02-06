-- Idempotent data integrity repair for settings/linkedin_accounts.
-- Safe to run multiple times.

-- 1) SETTINGS: keep one row per key (prefer newest when updated_at exists)
DO $$
DECLARE
  has_updated_at boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'settings'
      AND column_name = 'updated_at'
  ) INTO has_updated_at;

  IF has_updated_at THEN
    EXECUTE $sql$
      WITH ranked AS (
        SELECT
          ctid,
          key,
          row_number() OVER (
            PARTITION BY key
            ORDER BY updated_at DESC NULLS LAST, ctid DESC
          ) AS rn
        FROM public.settings
      )
      DELETE FROM public.settings s
      USING ranked r
      WHERE s.ctid = r.ctid
        AND r.rn > 1;
    $sql$;
  ELSE
    EXECUTE $sql$
      WITH ranked AS (
        SELECT
          ctid,
          key,
          row_number() OVER (
            PARTITION BY key
            ORDER BY ctid DESC
          ) AS rn
        FROM public.settings
      )
      DELETE FROM public.settings s
      USING ranked r
      WHERE s.ctid = r.ctid
        AND r.rn > 1;
    $sql$;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS settings_key_uidx
  ON public.settings (key);

-- 2) LINKEDIN_ACCOUNTS: keep one row per user_id
DO $$
DECLARE
  has_updated_at boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'linkedin_accounts'
      AND column_name = 'updated_at'
  ) INTO has_updated_at;

  IF has_updated_at THEN
    EXECUTE $sql$
      WITH ranked AS (
        SELECT
          ctid,
          user_id,
          row_number() OVER (
            PARTITION BY user_id
            ORDER BY updated_at DESC NULLS LAST, ctid DESC
          ) AS rn
        FROM public.linkedin_accounts
      )
      DELETE FROM public.linkedin_accounts a
      USING ranked r
      WHERE a.ctid = r.ctid
        AND r.rn > 1;
    $sql$;
  ELSE
    EXECUTE $sql$
      WITH ranked AS (
        SELECT
          ctid,
          user_id,
          row_number() OVER (
            PARTITION BY user_id
            ORDER BY ctid DESC
          ) AS rn
        FROM public.linkedin_accounts
      )
      DELETE FROM public.linkedin_accounts a
      USING ranked r
      WHERE a.ctid = r.ctid
        AND r.rn > 1;
    $sql$;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS linkedin_accounts_user_id_uidx
  ON public.linkedin_accounts (user_id);
