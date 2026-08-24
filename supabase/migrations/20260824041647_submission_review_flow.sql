-- v0.4 submission review flow and team customization expansion.
-- Existing approved submissions keep their status and awarded score.

alter table public.submissions
  alter column status set default 'flagged'::public.submission_status;

alter table public.submissions
  add column if not exists reviewed_at timestamp with time zone;

comment on column public.submissions.status is
  'flagged = pending organizer review; approved = scored; rejected = may be resubmitted';

create index if not exists submissions_status_created_at_idx
  on public.submissions (status, created_at desc);

create index if not exists submissions_participant_id_idx
  on public.submissions (participant_id);

create or replace function private.guest_submit_challenge_impl(
  p_session_hash text,
  p_challenge_id uuid,
  p_media_path text,
  p_media_type text,
  p_bonus_units integer default 0,
  p_note text default null
)
returns public.submissions
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_catalog'
as $function$
declare
  v_participant public.participants;
  v_challenge public.challenges;
  v_submission public.submissions;
  v_existing public.submissions;
  v_has_existing boolean := false;
  v_bonus integer;
  v_points integer;
begin
  select * into v_participant
  from public.participants
  where session_hash = p_session_hash;

  if not found then
    raise exception 'Invalid session';
  end if;

  select * into v_challenge
  from public.challenges
  where id = p_challenge_id and is_active = true;

  if not found then
    raise exception 'Challenge not found';
  end if;

  if p_media_type not in ('photo', 'video') then
    raise exception 'Invalid media type';
  end if;

  if v_challenge.media_kind <> 'either'
     and v_challenge.media_kind::text <> p_media_type then
    raise exception 'Wrong media type for challenge';
  end if;

  v_bonus := greatest(0, least(coalesce(p_bonus_units, 0), v_challenge.max_bonus_units));
  v_points := v_challenge.base_points + (v_bonus * v_challenge.bonus_points_per_unit);

  select * into v_existing
  from public.submissions
  where team_id = v_participant.team_id
    and challenge_id = v_challenge.id
  for update;
  v_has_existing := found;

  if v_has_existing and v_existing.status <> 'rejected'::public.submission_status then
    raise exception 'Your team already submitted this challenge';
  end if;

  if v_has_existing then
    update public.submissions
    set participant_id = v_participant.id,
        media_path = p_media_path,
        media_type = p_media_type,
        bonus_units = v_bonus,
        points_awarded = v_points,
        status = 'flagged'::public.submission_status,
        note = nullif(trim(p_note), ''),
        reviewed_at = null,
        created_at = now()
    where id = v_existing.id
    returning * into v_submission;
  else
    insert into public.submissions (
      team_id,
      participant_id,
      challenge_id,
      media_path,
      media_type,
      bonus_units,
      points_awarded,
      status,
      note
    ) values (
      v_participant.team_id,
      v_participant.id,
      v_challenge.id,
      p_media_path,
      p_media_type,
      v_bonus,
      v_points,
      'flagged'::public.submission_status,
      nullif(trim(p_note), '')
    )
    returning * into v_submission;
  end if;

  return v_submission;
exception
  when unique_violation then
    raise exception 'Your team already submitted this challenge';
end;
$function$;

create or replace function public.update_guest_team_profile(
  p_session_hash text,
  p_new_name text,
  p_icon text,
  p_color text
)
returns public.teams
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_participant public.participants;
  v_team public.teams;
  v_name text := trim(p_new_name);
  v_icon text := trim(p_icon);
  v_color text := lower(trim(p_color));
begin
  if coalesce(length(v_name), 0) < 2 or length(v_name) > 32 then
    raise exception 'Team name must be between 2 and 32 characters';
  end if;

  if v_name ~ '[<>]' then
    raise exception 'Team name contains invalid characters';
  end if;

  if v_icon not in (
    '🐘','🐅','🐒','🦜','🥥','🌴','⭐','🛺',
    '🐬','🦎','🦚','🐉','🦁','🐼','🐸','🦋',
    '🌺','🔥','⚡','🚀','🏆','🎯','🗺️','🏁'
  ) then
    raise exception 'Invalid team icon';
  end if;

  if v_color not in (
    '#0f172a','#2563eb','#16a34a','#eab308',
    '#f97316','#dc2626','#9333ea','#db2777',
    '#0d9488','#0891b2','#0284c7','#4f46e5',
    '#7c3aed','#65a30d','#d97706','#e11d48'
  ) then
    raise exception 'Invalid team color';
  end if;

  select * into v_participant
  from public.participants
  where session_hash = p_session_hash;

  if not found then
    raise exception 'Invalid session';
  end if;

  update public.teams
  set name = v_name,
      icon = v_icon,
      color = v_color
  where id = v_participant.team_id
  returning * into v_team;

  return v_team;
exception
  when unique_violation then
    raise exception 'That team name is already taken';
end;
$function$;

create or replace view public.leaderboard
with (security_invoker = true)
as
select
  t.id as team_id,
  t.team_number,
  t.name,
  count(distinct p.id)::integer as member_count,
  coalesce(sum(
    case when s.status = 'approved'::public.submission_status
      then s.points_awarded else 0 end
  ), 0)::integer as score,
  count(distinct case
    when s.status = 'approved'::public.submission_status then s.challenge_id
    else null::uuid
  end)::integer as challenges_completed,
  t.icon,
  t.color
from public.teams t
join public.participants p on p.team_id = t.id
left join public.submissions s on s.team_id = t.id
where t.id in (select participants.team_id from public.participants)
group by t.id, t.team_number, t.name, t.icon, t.color;

update public.hunt_settings
set hunt_title = 'Amazing Race – Siem Reap Edition',
    updated_at = now()
where id = true;
