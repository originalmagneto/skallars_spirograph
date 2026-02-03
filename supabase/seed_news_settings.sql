insert into public.news_settings (limit_count, show_view_all, autoplay, autoplay_interval_ms, scroll_step)
values (9, true, true, 50, 1)
on conflict do nothing;
