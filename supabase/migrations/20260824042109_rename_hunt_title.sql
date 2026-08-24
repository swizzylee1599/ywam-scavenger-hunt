-- Correct the official event title without changing timer or hunt state.
update public.hunt_settings
set hunt_title = 'The Amazing Race- Siem Reap Edition',
    updated_at = now()
where id = true;
