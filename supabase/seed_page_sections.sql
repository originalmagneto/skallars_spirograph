insert into public.page_sections (page, section_key, label, enabled, sort_order)
values
  ('home', 'hero', 'Hero', true, 1),
  ('home', 'services', 'Services', true, 2),
  ('home', 'countries', 'Countries', true, 3),
  ('home', 'team', 'Team', true, 4),
  ('home', 'clients', 'Clients', true, 5),
  ('home', 'news', 'News', true, 6),
  ('home', 'contact', 'Contact', true, 7),
  ('home', 'footer', 'Footer', true, 8)
on conflict (page, section_key) do update set
  label = excluded.label,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order;
