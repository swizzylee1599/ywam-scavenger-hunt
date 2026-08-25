-- Cover the optional mystery-challenge relationship used for cleanup and review.
create index if not exists hunt_announcements_challenge_id_idx
  on public.hunt_announcements (challenge_id);
