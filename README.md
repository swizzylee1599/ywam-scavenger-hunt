# YWAM Siem Reap Scavenger Hunt v0.3

Participant app: `/`
Admin dashboard: `/admin.html`

## Participant features
- Join by name + YWAM base
- Automatic team assignment
- Rename team
- Choose team icon
- Choose team color
- Challenge list
- Photo/video uploads
- Live leaderboard
- Live feed
- Shared hunt timer

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

## Supabase Edge Functions

The authenticated admin function source is tracked at
`supabase/functions/hunt-admin-api/`. Challenge mutations use the existing
`challenges` table; v0.3 does not require a database migration.

The function keeps the existing custom admin-session authentication and must be
deployed with JWT verification disabled because it authenticates requests using
the separate `x-admin-token` session. The Supabase service-role key remains an
Edge Function secret and is never included in browser code.

## Test

```sh
node --test
```

## Deploy
Static site on Vercel. No build command needed.
