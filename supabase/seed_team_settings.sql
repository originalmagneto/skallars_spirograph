insert into public.team_settings (show_linkedin, show_icon, show_bio, columns_desktop, columns_tablet, columns_mobile)
values (true, true, true, 4, 2, 1)
on conflict do nothing;
