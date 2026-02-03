insert into public.footer_links (section, label_sk, label_en, label_de, label_cn, url, is_external, enabled, sort_order)
values
  ('solutions', 'IT a ochrana osobných údajov', 'IT & Data Protection', 'IT & Datenschutz', 'IT 与数据保护', '#', false, true, 1),
  ('solutions', 'Duševné vlastníctvo', 'Intellectual Property', 'Geistiges Eigentum', '知识产权', '#', false, true, 2),
  ('solutions', 'Umelá inteligencia', 'Artificial Intelligence', 'Künstliche Intelligenz', '人工智能', '#', false, true, 3),
  ('solutions', 'Nehnuteľnosti', 'Real Estate', 'Immobilien', '房地产', '#', false, true, 4)
on conflict do nothing;
