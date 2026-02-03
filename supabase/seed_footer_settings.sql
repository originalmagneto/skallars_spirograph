insert into public.footer_settings (show_newsletter, show_social, show_solutions, show_contact)
values (true, true, true, true)
on conflict do nothing;
