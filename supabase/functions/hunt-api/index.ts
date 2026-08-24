import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type,x-hunt-session',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function hash(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function sessionToken() {
  return crypto.randomUUID() + crypto.randomUUID();
}

function publicStatus(status: string) {
  return status === 'flagged' ? 'pending' : status;
}

function extensionFor(mediaType: string, mime: string) {
  if (mediaType === 'video') {
    if (mime === 'video/quicktime') return 'mov';
    if (mime === 'video/webm') return 'webm';
    return 'mp4';
  }
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/heic' || mime === 'image/heif') return 'heic';
  return 'jpg';
}

function allowedMime(mediaType: string, mime: string) {
  const photoTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
  const videoTypes = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
  return mediaType === 'photo' ? photoTypes.has(mime) : videoTypes.has(mime);
}

async function signRows(rows: Array<Record<string, any>>) {
  if (!rows.length) return [];
  const paths = rows.map((row) => row.media_path);
  const { data, error } = await db.storage.from('hunt-media').createSignedUrls(paths, 3600);
  if (error) throw error;
  const urls = new Map((data || []).map((item: any) => [item.path, item.signedUrl]));
  return rows.map((row) => ({ ...row, media_url: urls.get(row.media_path) || null }));
}

function requireMethod(request: Request, expected: 'GET' | 'POST') {
  if (request.method !== expected) throw new Error(`${expected} required`);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || '';
    let body: Record<string, any> = {};
    if (request.method === 'POST') body = await request.json();

    if (action === 'join') {
      requireMethod(request, 'POST');
      const rawSession = body.session || sessionToken();
      const sessionHash = await hash(rawSession);
      const { data, error } = await db.rpc('join_guest_hunt', {
        p_session_hash: sessionHash,
        p_display_name: body.name,
        p_base_name: body.base,
      });
      if (error) throw error;
      const { data: team, error: teamError } = await db.from('teams').select('*').eq('id', data.team_id).single();
      if (teamError) throw teamError;
      return Response.json({ session: rawSession, participant: data, team }, { headers });
    }

    const rawSession = request.headers.get('x-hunt-session') || body.session;
    if (!rawSession) throw new Error('Session required');
    const sessionHash = await hash(rawSession);
    const { data: participant, error: participantError } = await db
      .from('participants')
      .select('*')
      .eq('session_hash', sessionHash)
      .maybeSingle();
    if (participantError) throw participantError;
    if (!participant) throw new Error('Session not found');

    if (action === 'state') {
      requireMethod(request, 'GET');
      const [teamResult, membersResult, challengesResult, submissionsResult, leadersResult, feedResult, settingsResult] = await Promise.all([
        db.from('teams').select('*').eq('id', participant.team_id).single(),
        db.from('participants').select('display_name,base_name').eq('team_id', participant.team_id),
        db.from('challenges').select('*').eq('is_active', true).order('sort_order'),
        db.from('submissions').select('challenge_id,status,note,created_at').eq('team_id', participant.team_id),
        db.from('leaderboard').select('*').order('score', { ascending: false }).order('challenges_completed', { ascending: false }),
        db.from('activity_feed').select('*').order('created_at', { ascending: false }).limit(20),
        db.from('hunt_settings').select('*').eq('id', true).single(),
      ]);
      for (const result of [teamResult, membersResult, challengesResult, submissionsResult, leadersResult, feedResult, settingsResult]) {
        if (result.error) throw result.error;
      }

      const submissionStatuses: Record<string, string> = {};
      const submissionNotes: Record<string, string> = {};
      for (const submission of submissionsResult.data || []) {
        submissionStatuses[submission.challenge_id] = publicStatus(submission.status);
        if (submission.status === 'rejected' && submission.note) {
          submissionNotes[submission.challenge_id] = submission.note;
        }
      }
      const feed = await signRows((feedResult.data || []) as Array<Record<string, any>>);
      const completed = (submissionsResult.data || [])
        .filter((submission: any) => submission.status === 'approved')
        .map((submission: any) => submission.challenge_id);

      return Response.json({
        participant,
        team: teamResult.data,
        members: membersResult.data || [],
        challenges: challengesResult.data || [],
        completed,
        submission_statuses: submissionStatuses,
        submission_notes: submissionNotes,
        leaders: leadersResult.data || [],
        feed,
        settings: settingsResult.data,
      }, { headers });
    }

    if (action === 'live') {
      requireMethod(request, 'GET');
      const [submissionsResult, leadersResult, feedResult, settingsResult] = await Promise.all([
        db.from('submissions').select('challenge_id,status,note,created_at').eq('team_id', participant.team_id),
        db.from('leaderboard').select('*').order('score', { ascending: false }).order('challenges_completed', { ascending: false }),
        db.from('activity_feed').select('id').order('created_at', { ascending: false }).limit(20),
        db.from('hunt_settings').select('*').eq('id', true).single(),
      ]);
      for (const result of [submissionsResult, leadersResult, feedResult, settingsResult]) {
        if (result.error) throw result.error;
      }

      const submissionStatuses: Record<string, string> = {};
      const submissionNotes: Record<string, string> = {};
      for (const submission of submissionsResult.data || []) {
        submissionStatuses[submission.challenge_id] = publicStatus(submission.status);
        if (submission.status === 'rejected' && submission.note) {
          submissionNotes[submission.challenge_id] = submission.note;
        }
      }
      const completed = (submissionsResult.data || [])
        .filter((submission: any) => submission.status === 'approved')
        .map((submission: any) => submission.challenge_id);

      return Response.json({
        completed,
        submission_statuses: submissionStatuses,
        submission_notes: submissionNotes,
        leaders: leadersResult.data || [],
        feed_ids: (feedResult.data || []).map((item: any) => item.id),
        settings: settingsResult.data,
      }, { headers });
    }

    if (action === 'update-team') {
      requireMethod(request, 'POST');
      const { data, error } = await db.rpc('update_guest_team_profile', {
        p_session_hash: sessionHash,
        p_new_name: body.name,
        p_icon: body.icon,
        p_color: body.color,
      });
      if (error) throw error;
      return Response.json({ ok: true, team: data }, { headers });
    }

    if (action === 'upload') {
      requireMethod(request, 'POST');
      const challengeId = String(body.challengeId || '');
      const mediaType = String(body.mediaType || '');
      const mime = String(body.mime || '').toLowerCase();
      const bonus = Number(body.bonus || 0);

      if (!uuidPattern.test(challengeId)) throw new Error('Invalid challenge');
      if (mediaType !== 'photo' && mediaType !== 'video') throw new Error('Invalid media type');
      if (!allowedMime(mediaType, mime)) throw new Error(`Unsupported ${mediaType} format`);
      if (!Number.isInteger(bonus) || bonus < 0 || bonus > 100) throw new Error('Invalid bonus amount');
      if (!body.data) throw new Error('Missing media');

      let bytes: Uint8Array;
      try {
        bytes = Uint8Array.from(atob(body.data), (char) => char.charCodeAt(0));
      } catch {
        throw new Error('Invalid media data');
      }
      if (bytes.length > 12 * 1024 * 1024) {
        throw new Error('File is too large. Please choose a photo/video under 12 MB.');
      }

      const extension = extensionFor(mediaType, mime);
      const path = `guest/${participant.id}/${Date.now()}-${challengeId}.${extension}`;
      const { error: uploadError } = await db.storage.from('hunt-media').upload(path, bytes, { contentType: mime });
      if (uploadError) throw uploadError;

      const { data, error } = await db.rpc('guest_submit_challenge', {
        p_session_hash: sessionHash,
        p_challenge_id: challengeId,
        p_media_path: path,
        p_media_type: mediaType,
        p_bonus_units: bonus,
        p_note: null,
      });
      if (error) {
        await db.storage.from('hunt-media').remove([path]);
        throw error;
      }
      return Response.json({ ok: true, submission: { ...data, status: publicStatus(data.status) } }, { headers });
    }

    throw new Error('Unknown action');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 400, headers });
  }
});
