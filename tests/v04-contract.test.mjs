import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('submission workflow defaults to review and preserves approved-only scoring', async () => {
  const migration = await read('supabase/migrations/20260824041647_submission_review_flow.sql');
  assert.match(migration, /alter column status set default 'flagged'/);
  assert.match(migration, /when s\.status = 'approved'/);
  assert.match(migration, /v_existing\.status <> 'rejected'/);
  assert.match(migration, /reviewed_at = null/);
});

test('browser code contains no Supabase service-role secret', async () => {
  const browserFiles = await Promise.all([
    'index.html', 'admin.html', 'join.html', 'js/api.js', 'js/app.js', 'js/admin.js', 'js/i18n.js', 'js/join.js',
  ].map(read));
  for (const source of browserFiles) assert.doesNotMatch(source, /service[_-]?role/i);
});

test('QR page targets its own deployment root', async () => {
  const source = await read('js/join.js');
  assert.match(source, /new URL\('\.\/', window\.location\.href\)\.href/);
});

test('all public pages use the official event title', async () => {
  const pages = await Promise.all(['index.html', 'admin.html', 'join.html'].map(read));
  for (const source of pages) assert.match(source, /The Amazing Race- Siem Reap Edition/);
});

test('event cleanup is authenticated, explicitly confirmed, and empties media', async () => {
  const source = await read('supabase/functions/hunt-admin-api/index.ts');
  assert.match(source, /await requireAdmin\(request\)/);
  assert.match(source, /body\.confirm !== 'CLEAR GAMEPLAY DATA'/);
  assert.match(source, /storage\.emptyBucket\('hunt-media'\)/);
  assert.match(source, /status: 'draft'/);
});

test('team UI and server validation expose expanded choices', async () => {
  const [html, migration] = await Promise.all([
    read('index.html'),
    read('supabase/migrations/20260824041647_submission_review_flow.sql'),
  ]);
  assert.equal((html.match(/data-icon=/g) || []).length, 24);
  assert.equal((html.match(/data-color=/g) || []).length, 16);
  assert.match(migration, /'🏁'/);
  assert.match(migration, /'#e11d48'/);
});

test('participant leaderboard, feed, and review status refresh automatically', async () => {
  const [app, api] = await Promise.all([
    read('js/app.js'),
    read('supabase/functions/hunt-api/index.ts'),
  ]);
  assert.match(app, /huntApi\('live', \{\}, 'GET'\)/);
  assert.match(app, /setInterval[\s\S]*7000/);
  assert.match(app, /submission_statuses = live\.submission_statuses/);
  assert.match(api, /action === 'live'/);
  assert.match(api, /feed_ids/);
});

test('admin live screen and review queue poll without exposing pending media', async () => {
  const [html, admin, api] = await Promise.all([
    read('admin.html'),
    read('js/admin.js'),
    read('supabase/functions/hunt-admin-api/index.ts'),
  ]);
  assert.match(html, /data-admin-tab="display"/);
  assert.match(html, /Latest approved/i);
  assert.match(admin, /setInterval\(refreshAdminLive, 3000\)/);
  assert.match(admin, /selectedAdminTab === 'reviews'/);
  assert.match(api, /action === 'live-feed'/);
  assert.match(api, /from\('activity_feed'\)/);
});

test('join form offers every Cambodia province and municipality', async () => {
  const html = await read('index.html');
  const provinceSelect = html.match(/<select id="base"[\s\S]*?<\/select>/)?.[0] || '';
  assert.match(provinceSelect, /Select your province/);
  assert.equal((provinceSelect.match(/<option value="[^\"]+"[^>]*>/g) || []).length, 25);
  assert.match(provinceSelect, /value="Phnom Penh"/);
  assert.match(provinceSelect, /value="Tboung Khmum"/);
});

test('participant UI provides Khmer language, instructions, and resilient upload feedback', async () => {
  const [html, i18n, app] = await Promise.all([
    read('index.html'),
    read('js/i18n.js'),
    read('js/app.js'),
  ]);
  assert.match(html, /data-language="km"/);
  assert.match(html, /id="howToOverlay"/);
  assert.match(html, /id="uploadProgress"/);
  assert.match(i18n, /បន្ទាយមានជ័យ/);
  assert.match(i18n, /'how\.safety'/);
  assert.match(app, /window\.addEventListener\('offline'/);
  assert.match(app, /reader\.onprogress/);
});

test('rejection reasons are validated by admin API and returned to participants', async () => {
  const [admin, participantApi, adminApi] = await Promise.all([
    read('js/admin.js'),
    read('supabase/functions/hunt-api/index.ts'),
    read('supabase/functions/hunt-admin-api/index.ts'),
  ]);
  assert.match(admin, /Choose a rejection reason first/);
  assert.match(admin, /api\('review-submission', \{ id, decision, reason \}\)/);
  assert.match(adminApi, /const rejectionReasons = new Set/);
  assert.match(adminApi, /A valid rejection reason is required/);
  assert.match(adminApi, /note: reason/);
  assert.match(participantApi, /submission_notes: submissionNotes/);
});

test('three-hour race seed adds the requested challenges with safe instructions', async () => {
  const [migration, i18n] = await Promise.all([
    read('supabase/migrations/20260824091935_add_three_hour_race_challenges.sql'),
    read('js/i18n.js'),
  ]);
  const proposedRows = migration.match(/^\+?  \('[0-9a-f-]+'::uuid/gm) || [];
  assert.equal(proposedRows.length, 14);
  assert.match(migration, /Angkor Botanical Garden/);
  assert.match(migration, /Royal Residence/);
  assert.match(migration, /red tuk tuk/);
  assert.match(migration, /Ask everyone for permission first/);
  assert.match(migration, /Do not sit on it or ride overcrowded/);
  assert.match(migration, /never touch or disturb a live animal/);
  assert.match(i18n, /សួនរុក្ខជាតិអង្គរ/);
  assert.match(i18n, /Five International Friends/);
});

test('race accepts photo or video while keeping video challenges explicit and celebrates submissions', async () => {
  const [migration, app, css] = await Promise.all([
    read('supabase/migrations/20260824101429_allow_photo_or_video_challenges.sql'),
    read('js/app.js'),
    read('css/app.css'),
  ]);
  assert.match(migration, /set media_kind = 'either'/);
  assert.match(migration, /where media_kind = 'photo'/);
  assert.match(migration, /one parked moto/);
  assert.match(app, /celebrate\('big'\)/);
  assert.match(app, /intensity === 'big' \? 90 : 30/);
  assert.match(app, /image\/\*,video\/\*/);
  assert.match(css, /--drift/);
});
