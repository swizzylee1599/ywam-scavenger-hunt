-- Live race announcements and timed mystery challenges.
-- Existing challenges remain ordinary, active challenges and keep their scores.

alter table public.challenges
  add column if not exists is_mystery boolean not null default false,
  add column if not exists released_at timestamp with time zone,
  add column if not exists expires_at timestamp with time zone;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'challenges_mystery_release_times_check'
  ) then
    alter table public.challenges
      add constraint challenges_mystery_release_times_check check (
        (released_at is null and expires_at is null)
        or (is_mystery = true and released_at is not null and expires_at > released_at)
      );
  end if;
end
$$;

create index if not exists challenges_mystery_release_idx
  on public.challenges (is_active, is_mystery, released_at, expires_at);

create table if not exists public.hunt_announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(message) between 1 and 240),
  message_km text check (message_km is null or char_length(message_km) <= 240),
  kind text not null default 'announcement'
    check (kind in ('announcement', 'mystery')),
  challenge_id uuid references public.challenges(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone
);

create index if not exists hunt_announcements_created_at_idx
  on public.hunt_announcements (created_at desc);

alter table public.hunt_announcements enable row level security;
revoke all on table public.hunt_announcements from public, anon, authenticated;
grant select, insert, delete on table public.hunt_announcements to service_role;

comment on table public.hunt_announcements is
  'Organizer-authenticated race announcements returned through hunt-api; no direct browser access.';

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
  where id = p_challenge_id
    and is_active = true
    and (
      is_mystery = false
      or (released_at <= now() and expires_at > now())
    );

  if not found then
    raise exception 'Challenge is unavailable or its timer has ended';
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
      team_id, participant_id, challenge_id, media_path, media_type,
      bonus_units, points_awarded, status, note
    ) values (
      v_participant.team_id, v_participant.id, v_challenge.id,
      p_media_path, p_media_type, v_bonus, v_points,
      'flagged'::public.submission_status, nullif(trim(p_note), '')
    )
    returning * into v_submission;
  end if;

  return v_submission;
exception
  when unique_violation then
    raise exception 'Your team already submitted this challenge';
end;
$function$;
