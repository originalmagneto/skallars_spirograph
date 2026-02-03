alter table public.team_members
  add column if not exists bio_sk text,
  add column if not exists bio_en text,
  add column if not exists icon text;
