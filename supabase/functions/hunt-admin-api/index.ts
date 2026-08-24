import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { slugForTitle, validateChallenge, validateChallengeId } from './challenge-validation.mjs';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type,x-admin-token',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
};

const encoder = new TextEncoder();

function base64(bytes: Uint8Array) {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

function unbase64(value: string) {
  const raw = atob(value);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function passwordHash(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    key,
    256,
  );
  return base64(new Uint8Array(bits));
}

async function requireAdmin(request: Request) {
  const token = request.headers.get('x-admin-token');
  if (!token) throw new Error('Admin login required');
  const tokenHash = await sha256(token);
  const { data, error } = await db
    .from('admin_sessions')
    .select('id')
    .eq('token_hash', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Admin session expired');
}

async function getSettings() {
  const { data, error } = await db.from('hunt_settings').select('*').eq('id', true).single();
  if (error) throw error;
  return data;
}

function databaseSubmissionStatus(value: unknown) {
  const status = String(value || 'pending');
  if (status === 'pending') return 'flagged';
  if (status === 'approved' || status === 'rejected') return status;
  throw new Error('Submission status must be pending, approved, or rejected');
}

function publicSubmissionStatus(value: string) {
  return value === 'flagged' ? 'pending' : value;
}

const rejectionReasons = new Set([
  'unclear',
  'wrong_challenge',
  'missing_people',
  'requirements',
  'other_retry',
]);

function paginationCursor(value: unknown) {
  if (value == null || value === '') return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error('Invalid submission cursor');
  return date.toISOString();
}

async function withSignedMedia(rows: Array<Record<string, any>>) {
  if (!rows.length) return [];
  const paths = rows.map((row) => row.media_path);
  const { data, error } = await db.storage.from('hunt-media').createSignedUrls(paths, 3600);
  if (error) throw error;
  const urls = new Map((data || []).map((item: any) => [item.path, item.signedUrl]));
  return rows.map((row) => ({
    ...row,
    status: publicSubmissionStatus(row.status),
    media_url: urls.get(row.media_path) || null,
  }));
}

function requireMethod(request: Request, expected: 'GET' | 'POST') {
  if (request.method !== expected) throw new Error(`${expected} required`);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || '';
    let body: Record<string, unknown> = {};
    if (request.method === 'POST') body = await request.json();

    if (action === 'bootstrap-status') {
      requireMethod(request, 'GET');
      const { data, error } = await db.from('admin_auth').select('password_hash').eq('id', true).single();
      if (error) throw error;
      return Response.json({ needs_setup: !data.password_hash }, { headers });
    }

    if (action === 'setup') {
      requireMethod(request, 'POST');
      const password = String(body.password || '');
      if (password.length < 8) throw new Error('Use an admin password with at least 8 characters');
      const { data: auth, error: authError } = await db.from('admin_auth').select('*').eq('id', true).single();
      if (authError) throw authError;
      if (auth.password_hash) throw new Error('Admin password has already been set');

      const salt = crypto.getRandomValues(new Uint8Array(16));
      const hash = await passwordHash(password, salt);
      const { error } = await db.from('admin_auth').update({
        password_salt: base64(salt),
        password_hash: hash,
        updated_at: new Date().toISOString(),
      }).eq('id', true);
      if (error) throw error;
      return Response.json({ ok: true }, { headers });
    }

    if (action === 'login') {
      requireMethod(request, 'POST');
      const password = String(body.password || '');
      const { data: auth, error: authError } = await db.from('admin_auth').select('*').eq('id', true).single();
      if (authError) throw authError;
      if (!auth.password_hash) throw new Error('Admin password has not been set yet');

      const hash = await passwordHash(password, unbase64(auth.password_salt));
      if (hash !== auth.password_hash) throw new Error('Incorrect password');

      const rawToken = crypto.randomUUID() + crypto.randomUUID();
      const tokenHash = await sha256(rawToken);
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
      const { error } = await db.from('admin_sessions').insert({ token_hash: tokenHash, expires_at: expiresAt });
      if (error) throw error;
      return Response.json({ token: rawToken, expires_at: expiresAt }, { headers });
    }

    if (action === 'logout') {
      requireMethod(request, 'POST');
      const token = request.headers.get('x-admin-token');
      if (token) {
        const tokenHash = await sha256(token);
        await db.from('admin_sessions').delete().eq('token_hash', tokenHash);
      }
      return Response.json({ ok: true }, { headers });
    }

    await requireAdmin(request);

    if (action === 'state') {
      requireMethod(request, 'GET');
      const [settings, participants, teams, leaders, challenges, pending, approved, rejected, latestActivity] = await Promise.all([
        getSettings(),
        db.from('participants').select('id', { count: 'exact', head: true }),
        db.from('teams').select('id', { count: 'exact', head: true }),
        db.from('leaderboard').select('*').order('score', { ascending: false }).limit(10),
        db.from('challenges').select('*').order('sort_order').order('created_at'),
        db.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'flagged'),
        db.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        db.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
        db.from('activity_feed').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (participants.error) throw participants.error;
      if (teams.error) throw teams.error;
      if (leaders.error) throw leaders.error;
      if (challenges.error) throw challenges.error;
      if (pending.error) throw pending.error;
      if (approved.error) throw approved.error;
      if (rejected.error) throw rejected.error;
      if (latestActivity.error) throw latestActivity.error;
      return Response.json({
        settings,
        participant_count: participants.count || 0,
        team_count: teams.count || 0,
        leaders: leaders.data || [],
        challenges: challenges.data || [],
        submission_counts: {
          pending: pending.count || 0,
          approved: approved.count || 0,
          rejected: rejected.count || 0,
        },
        latest_activity_id: latestActivity.data?.id || null,
      }, { headers });
    }

    if (action === 'live-feed') {
      requireMethod(request, 'GET');
      const { data, error } = await db.from('activity_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return Response.json({
        feed: await withSignedMedia((data || []) as Array<Record<string, any>>),
      }, { headers });
    }

    if (action === 'clear-gameplay') {
      requireMethod(request, 'POST');
      if (body.confirm !== 'CLEAR GAMEPLAY DATA') {
        throw new Error('Exact cleanup confirmation is required');
      }

      const { error: storageError } = await db.storage.emptyBucket('hunt-media');
      if (storageError) throw storageError;

      const { error: submissionError } = await db.from('submissions').delete().not('id', 'is', null);
      if (submissionError) throw submissionError;
      const { error: participantDeleteError } = await db.from('participants').delete().not('id', 'is', null);
      if (participantDeleteError) throw participantDeleteError;

      const { data: teams, error: teamReadError } = await db.from('teams').select('id,team_number');
      if (teamReadError) throw teamReadError;
      const resetTeams = (teams || []).map((team) => ({
        id: team.id,
        team_number: team.team_number,
        name: `Team ${team.team_number}`,
        icon: '⭐',
        color: '#0f172a',
      }));
      if (resetTeams.length) {
        const { error: teamResetError } = await db.from('teams').upsert(resetTeams, { onConflict: 'id' });
        if (teamResetError) throw teamResetError;
      }

      const { data: settings, error: settingsError } = await db.from('hunt_settings').update({
        status: 'draft',
        starts_at: null,
        ends_at: null,
        updated_at: new Date().toISOString(),
      }).eq('id', true).select('*').single();
      if (settingsError) throw settingsError;

      return Response.json({
        ok: true,
        participants_removed: true,
        submissions_removed: true,
        media_removed: true,
        teams_reset: resetTeams.length,
        settings,
      }, { headers });
    }

    if (action === 'list-submissions') {
      requireMethod(request, 'POST');
      const status = databaseSubmissionStatus(body.status);
      const before = paginationCursor(body.before);
      let query = db.from('submissions').select(`
        id,
        created_at,
        reviewed_at,
        status,
        media_path,
        media_type,
        bonus_units,
        points_awarded,
        note,
        teams(name,icon,color),
        participants(display_name,base_name),
        challenges(title,base_points,bonus_points_per_unit,bonus_label)
      `).eq('status', status).order('created_at', { ascending: false }).limit(31);
      if (before) query = query.lt('created_at', before);
      const { data, error } = await query;
      if (error) throw error;
      const rows = data || [];
      const hasMore = rows.length > 30;
      const page = rows.slice(0, 30);
      const submissions = await withSignedMedia(page as Array<Record<string, any>>);
      return Response.json({
        submissions,
        has_more: hasMore,
        next_cursor: hasMore ? page[page.length - 1]?.created_at || null : null,
      }, { headers });
    }

    if (action === 'review-submission') {
      requireMethod(request, 'POST');
      const id = validateChallengeId(body.id);
      const decision = String(body.decision || '');
      if (decision !== 'approved' && decision !== 'rejected') {
        throw new Error('Review decision must be approved or rejected');
      }
      const reason = decision === 'rejected' ? String(body.reason || '') : null;
      if (decision === 'rejected' && !rejectionReasons.has(reason!)) {
        throw new Error('A valid rejection reason is required');
      }
      const { data, error } = await db.from('submissions').update({
        status: decision,
        reviewed_at: new Date().toISOString(),
        note: reason,
      }).eq('id', id).select('id,status,reviewed_at,note').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Submission not found');
      return Response.json({ submission: data }, { headers });
    }

    if (action === 'create-challenge') {
      requireMethod(request, 'POST');
      const challenge = validateChallenge(body);
      const { data, error } = await db.from('challenges').insert({
        ...challenge,
        slug: slugForTitle(challenge.title),
      }).select('*').single();
      if (error) throw error;
      return Response.json({ challenge: data }, { headers });
    }

    if (action === 'update-challenge') {
      requireMethod(request, 'POST');
      const id = validateChallengeId(body.id);
      const challenge = validateChallenge(body);
      const { data, error } = await db.from('challenges').update(challenge).eq('id', id).select('*').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Challenge not found');
      return Response.json({ challenge: data }, { headers });
    }

    if (action === 'set-challenge-active') {
      requireMethod(request, 'POST');
      const id = validateChallengeId(body.id);
      if (typeof body.is_active !== 'boolean') throw new Error('Active status must be true or false');
      const { data, error } = await db.from('challenges')
        .update({ is_active: body.is_active })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Challenge not found');
      return Response.json({ challenge: data }, { headers });
    }

    if (action === 'start') {
      requireMethod(request, 'POST');
      const now = new Date();
      const endsAt = new Date(now.getTime() + 3 * 60 * 60 * 1000);
      const { data, error } = await db.from('hunt_settings').update({
        status: 'open',
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        updated_at: now.toISOString(),
      }).eq('id', true).select('*').single();
      if (error) throw error;
      return Response.json({ settings: data }, { headers });
    }

    if (action === 'end') {
      requireMethod(request, 'POST');
      const now = new Date();
      const { data, error } = await db.from('hunt_settings').update({
        status: 'closed',
        ends_at: now.toISOString(),
        updated_at: now.toISOString(),
      }).eq('id', true).select('*').single();
      if (error) throw error;
      return Response.json({ settings: data }, { headers });
    }

    if (action === 'reset') {
      requireMethod(request, 'POST');
      const { data, error } = await db.from('hunt_settings').update({
        status: 'draft',
        starts_at: null,
        ends_at: null,
        updated_at: new Date().toISOString(),
      }).eq('id', true).select('*').single();
      if (error) throw error;
      return Response.json({ settings: data }, { headers });
    }

    throw new Error('Unknown action');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 400, headers });
  }
});
