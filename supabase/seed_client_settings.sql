insert into public.client_settings (autoplay, autoplay_interval_ms, visible_count)
values (true, 3000, 3)
on conflict do nothing;
