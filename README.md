# The Amazing Race- Siem Reap Edition v0.5.2

Static scavenger hunt app for the YWAM National Staff Conference.

- Participant app: `/`
- Organizer dashboard: `/admin.html`
- Projector/print QR join page: `/join.html`

## Participant features
- Join by name + Cambodia province/municipality dropdown
- Automatic team assignment
- Rename teams with 24 icon and 16 color choices
- Photo/video submissions with pending and rejected states
- Approved-only progress, scoring, leaderboard, and community feed
- Automatic live leaderboard, feed, timer, and review-status updates
- Bilingual in-app celebration when a different team takes first place
- Bilingual team celebrations at 5, 10, 15, 20, and all completed challenges
- Live organizer announcements and timed mystery-challenge alerts
- Final 10-minute countdown mode on phones and the Live Screen
- Shared hunt timer

The database has 90 team slots with five participants per team, enough for 450
participants. New racers fill the fullest available team to five before another
team is opened. Assignment is serialized in Postgres so concurrent joins cannot
overfill a team.

## Admin features
- First-time password setup
- Login
- Participant/team counts
- Top leaderboard
- Start 3-hour hunt
- End hunt
- Reset Game for New Play
- View, create, edit, disable, and re-enable challenges
- Manage challenge points, media requirements, bonuses, categories, and order
- Paginated submission review with pending, approved, and rejected filters
- QR join page link and polished leaderboard
- Auto-refreshing review queue and full-screen live event display
- Participant names shown beneath each team on the Live Screen leaderboard
- Race Control for announcements and timed mystery-challenge releases

The participant app checks for leaderboard, feed, timer, approval, and rejection
changes every seven seconds while visible. The admin dashboard updates every
three seconds. The public feed and Live Screen show approved media only;
pending evidence remains private in Reviews until an organizer approves it.
The dashboard team count includes occupied teams only; the 90 empty-capacity
slots are not presented as active teams.

## Race Control

The organizer can send a 240-character announcement, with an optional Khmer
translation, while the hunt is open. Messages appear on participant phones and
the Live Screen. Challenges marked **Timed mystery challenge** remain hidden
until the organizer releases them from Race Control for 10–60 minutes. The
admin API accepts durations from 5–180 minutes and never extends a mystery
beyond the hunt end time. Expired mystery uploads are rejected server-side.

## Submission review

New submissions use the existing `flagged` database enum value, which the APIs
expose as `pending`. Only `approved` submissions count toward participant
progress, scoring, or the live feed. A rejected team can submit a new attempt
without deleting its submission record.

## Supabase Edge Functions

- Participant function: `supabase/functions/hunt-api/`
- Admin function: `supabase/functions/hunt-admin-api/`
- Migration: `supabase/migrations/20260824041647_submission_review_flow.sql`
- Migration: `supabase/migrations/20260825041220_add_live_race_interactions.sql`
- Migration: `supabase/migrations/20260825041252_index_announcement_challenge.sql`
- Migration: `supabase/migrations/20260827034729_fill_teams_to_five.sql`

Both functions keep their existing custom session authentication and must be
deployed with platform JWT verification disabled. The Supabase service-role key
remains an Edge Function secret and is never included in browser code.

## Event reset

The authenticated admin Edge Function exposes the maintenance action
`clear-gameplay`. It requires an active organizer session and the exact
confirmation phrase `CLEAR GAMEPLAY DATA`. The action empties hunt media,
removes participants and submissions, resets team names/icons/colors, and puts
the hunt back in Draft without deleting challenges or changing the organizer
password. It also clears announcements and resets mystery release timers. The
organizer dashboard exposes this as **Reset Game for New Play**
with a destructive-action warning, then verifies that participants,
submissions, leaderboard rows, and activity are empty. Keep this action out of
participant-facing code and run it only when an event-data reset is
intentional.

## Test

```sh
node --test tests/*.test.mjs
```

## Deploy
Static site on Vercel. No build command needed.
