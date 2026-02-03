insert into public.countries_settings (show_stats, show_connections, show_labels, show_controls, default_focus)
values (true, true, true, true, 'centralEurope')
on conflict do nothing;
