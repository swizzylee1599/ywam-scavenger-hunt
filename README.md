# The Amazing Race- Siem Reap Edition v0.4

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
- Shared hunt timer

The database has 90 team slots with five participants per team, enough for 450
participants. Assignment is serialized in Postgres so concurrent joins cannot
overfill a team.

## Admin features
- First-time password setup
- Login
- Participant/team counts
- Top leaderboard
- Start 3-hour hunt
- End hunt
- Reset to Draft
- View, create, edit, disable, and re-enable challenges
- Manage challenge points, media requirements, bonuses, categories, and order
- Paginated submission review with pending, approved, and rejected filters
- QR join page link and polished leaderboard
- Auto-refreshing review queue and full-screen live event display

The participant app checks for leaderboard, feed, timer, approval, and rejection
changes every seven seconds while visible. The admin dashboard updates every
three seconds. The public feed and Live Screen show approved media only;
pending evidence remains private in Reviews until an organizer approves it.

## Submission review

New submissions use the existing `flagged` database enum value, which the APIs
expose as `pending`. Only `approved` submissions count toward participant
progress, scoring, or the live feed. A rejected team can submit a new attempt
without deleting its submission record.

## Supabase Edge Functions

- Participant function: `supabase/functions/hunt-api/`
- Admin function: `supabase/functions/hunt-admin-api/`
- Migration: `supabase/migrations/20260824041647_submission_review_flow.sql`

Both functions keep their existing custom session authentication and must be
deployed with platform JWT verification disabled. The Supabase service-role key
remains an Edge Function secret and is never included in browser code.

## Event reset

The authenticated admin Edge Function exposes the maintenance action
`clear-gameplay`. It requires an active organizer session and the exact
confirmation phrase `CLEAR GAMEPLAY DATA`. The action empties hunt media,
removes participants and submissions, resets team names/icons/colors, and puts
the hunt back in Draft without deleting challenges or changing the organizer
password. The organizer dashboard exposes this as **Reset Game for New Play**
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
