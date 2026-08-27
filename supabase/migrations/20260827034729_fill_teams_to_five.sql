create or replace function private.join_guest_hunt_impl(
  p_session_hash text,
  p_display_name text,
  p_base_name text
)
returns public.participants
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_team_id uuid;
  v_participant public.participants;
begin
  if coalesce(length(trim(p_session_hash)), 0) < 32 then
    raise exception 'Invalid session';
  end if;

  if coalesce(length(trim(p_display_name)), 0) = 0
     or length(trim(p_display_name)) > 80 then
    raise exception 'Invalid display name';
  end if;

  if coalesce(length(trim(p_base_name)), 0) = 0
     or length(trim(p_base_name)) > 100 then
    raise exception 'Invalid base name';
  end if;

  select * into v_participant
  from public.participants
  where session_hash = p_session_hash;

  if found then
    return v_participant;
  end if;

  -- Serialize joins so two simultaneous requests cannot claim the fifth spot.
  perform pg_catalog.pg_advisory_xact_lock(73194201);

  select t.id into v_team_id
  from public.teams t
  left join public.participants p on p.team_id = t.id
  group by t.id, t.team_number
  having count(p.id) < 5
  order by
    -- Fill the fullest available team before opening an empty one.
    count(p.id) desc,
    case
      when bool_or(lower(coalesce(p.base_name, '')) = lower(trim(p_base_name))) then 1
      else 0
    end asc,
    t.team_number asc
  limit 1;

  if v_team_id is null then
    raise exception 'All teams are full';
  end if;

  insert into public.participants(
    user_id,
    session_hash,
    display_name,
    base_name,
    team_id
  )
  values (
    null,
    p_session_hash,
    trim(p_display_name),
    trim(p_base_name),
    v_team_id
  )
  returning * into v_participant;

  return v_participant;
end;
$function$;

comment on function private.join_guest_hunt_impl(text, text, text) is
  'Assigns guest participants by filling the fullest available team to five before opening another team.';
