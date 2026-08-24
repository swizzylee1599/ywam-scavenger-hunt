const API = 'https://zarxbmmnfmaorwjfopuu.supabase.co/functions/v1/hunt-admin-api';
const $ = (id) => document.getElementById(id);

let token = localStorage.getItem('hunt_admin_token') || '';
let mode = 'login';
let state = null;
let timer = null;
let editingChallenge = null;
let selectedAdminTab = 'overview';
let reviewStatus = 'pending';
let reviewCursor = null;
let reviewItems = [];
let reviewLoading = false;
let displayFeed = [];
let adminLiveLoading = false;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function safeTeamColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : '#0f172a';
}

async function api(action, body = {}, method = 'POST', auth = true) {
  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (auth && token) options.headers['x-admin-token'] = token;
  if (method !== 'GET') options.body = JSON.stringify(body);

  const response = await fetch(`${API}?action=${encodeURIComponent(action)}`, options);
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The admin service returned an invalid response.');
  }
  if (!response.ok || data.error) throw new Error(data.error || 'Request failed');
  return data;
}

function showMessage(element, message, type = 'error') {
  element.innerHTML = message
    ? `<div class="notice ${type}">${escapeHtml(message)}</div>`
    : '';
}

const authMessage = (message, type = 'error') => showMessage($('authMsg'), message, type);
const adminMessage = (message, type = 'success') => showMessage($('adminNotice'), message, type);
const formMessage = (message, type = 'error') => showMessage($('challengeFormMsg'), message, type);
const reviewMessage = (message, type = 'error') => showMessage($('reviewNotice'), message, type);

function setBusy(button, busy, busyText) {
  if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
  button.disabled = busy;
  button.textContent = busy ? busyText : button.dataset.defaultText;
}

async function init() {
  if (token) {
    try {
      await loadDashboard();
      return;
    } catch {
      localStorage.removeItem('hunt_admin_token');
      token = '';
    }
  }

  try {
    const data = await api('bootstrap-status', {}, 'GET', false);
    mode = data.needs_setup ? 'setup' : 'login';
    $('authIntro').textContent = mode === 'setup'
      ? 'Create the organizer password for this scavenger hunt.'
      : 'Enter your organizer password.';
    $('authBtn').textContent = mode === 'setup' ? 'Create Admin Password' : 'Log In';
  } catch (error) {
    authMessage(error.message);
  }
}

async function authenticate() {
  const password = $('adminPassword').value;
  if (password.length < 8) return authMessage('Use at least 8 characters.');

  setBusy($('authBtn'), true, mode === 'setup' ? 'Creating…' : 'Logging in…');
  try {
    if (mode === 'setup') {
      await api('setup', { password }, 'POST', false);
      mode = 'login';
      $('authIntro').textContent = 'Password created. Log in to continue.';
      $('authBtn').dataset.defaultText = 'Log In';
      authMessage('Admin password created.', 'success');
    } else {
      const data = await api('login', { password }, 'POST', false);
      token = data.token;
      localStorage.setItem('hunt_admin_token', token);
      await loadDashboard();
    }
  } catch (error) {
    authMessage(error.message);
  } finally {
    setBusy($('authBtn'), false, '');
  }
}

async function loadDashboard() {
  state = await api('state', {}, 'GET');
  try {
    const live = await api('live-feed', {}, 'GET');
    displayFeed = live.feed || [];
  } catch {
    displayFeed = [];
  }
  $('authView').classList.add('hidden');
  $('dashboardView').classList.remove('hidden');
  renderDashboard();
  setAdminTab(selectedAdminTab, false);
}

function renderDashboard() {
  const settings = state.settings;
  $('adminStatus').textContent = settings.status;
  $('participantCount').textContent = state.participant_count;
  $('teamCount').textContent = state.team_count;
  const medals = ['🥇', '🥈', '🥉'];
  $('adminLeaders').innerHTML = (state.leaders || []).map((team, index) => `
    <div class="leader-row ${index < 3 ? 'top-three' : ''}">
      <div class="leader-team">
        <span class="leader-icon" style="color:${safeTeamColor(team.color)}">${escapeHtml(team.icon || '⭐')}</span>
        <span class="leader-details">
          <span class="leader-name">${medals[index] || `#${index + 1}`} ${escapeHtml(team.name)}</span>
          <small>${Number(team.challenges_completed) || 0} challenges · ${Number(team.member_count) || 0} members</small>
        </span>
      </div>
      <b>${Number(team.score) || 0} pts</b>
    </div>
  `).join('') || '<p class="muted">No scores yet.</p>';
  renderReviewCounts();
  renderChallenges();
  renderLiveDisplay();
  startAdminTimer(settings);
}

function renderReviewCounts() {
  const counts = state.submission_counts || { pending: 0, approved: 0, rejected: 0 };
  $('pendingReviewCount').textContent = counts.pending || 0;
  $('approvedReviewCount').textContent = counts.approved || 0;
  $('rejectedReviewCount').textContent = counts.rejected || 0;
  $('reviewTabCount').textContent = counts.pending || 0;
  $('reviewTabCount').classList.toggle('hidden', !counts.pending);
}

function startAdminTimer(settings) {
  if (timer) clearInterval(timer);
  const tick = () => {
    if (settings.status !== 'open' || !settings.ends_at) {
      const value = settings.status === 'closed' ? '0:00:00' : '3:00:00';
      $('adminTimer').textContent = value;
      $('displayTimer').textContent = value;
      return;
    }
    const milliseconds = Math.max(0, new Date(settings.ends_at) - Date.now());
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const value = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    $('adminTimer').textContent = value;
    $('displayTimer').textContent = value;
  };
  tick();
  timer = setInterval(tick, 1000);
}

function renderLiveDisplay() {
  if (!state) return;
  const medals = ['🥇', '🥈', '🥉'];
  $('displayLeaders').innerHTML = (state.leaders || []).slice(0, 10).map((team, index) => `
    <div class="display-leader">
      <span class="display-rank">${medals[index] || `#${index + 1}`}</span>
      <span class="display-team">
        <span class="display-team-icon">${escapeHtml(team.icon || '⭐')}</span>
        <span class="display-team-name">${escapeHtml(team.name)}</span>
      </span>
      <span class="display-score">${Number(team.score) || 0} pts</span>
    </div>
  `).join('') || '<div class="display-empty">The leaderboard will appear when teams earn approved points.</div>';

  $('displayFeed').innerHTML = displayFeed.map((item) => {
    const media = item.media_type === 'video'
      ? `<video src="${escapeHtml(item.media_url || '')}" muted autoplay loop playsinline preload="metadata"></video>`
      : `<img src="${escapeHtml(item.media_url || '')}" alt="Approved race moment">`;
    return `
      <article class="display-moment">
        ${media}
        <div class="display-moment-caption">
          <b>🏁 ${escapeHtml(item.team_name || 'Team')}</b>
          <span>${escapeHtml(item.challenge_title || 'Challenge')} · ${Number(item.points_awarded) || 0} pts</span>
        </div>
      </article>
    `;
  }).join('') || '<div class="display-empty">Approved photos and videos will appear here live.</div>';

  $('displayParticipants').textContent = `${Number(state.participant_count) || 0} racers · ${Number(state.team_count) || 0} teams`;
}

async function loadDisplayFeed() {
  const live = await api('live-feed', {}, 'GET');
  displayFeed = live.feed || [];
  renderLiveDisplay();
}

async function refreshAdminLive() {
  if (!token || adminLiveLoading || document.hidden || !$('challengeOverlay').classList.contains('hidden')) return;
  adminLiveLoading = true;
  try {
    const previousActivityId = state?.latest_activity_id || null;
    state = await api('state', {}, 'GET');
    if (state.latest_activity_id !== previousActivityId) await loadDisplayFeed();
    renderDashboard();
    if (selectedAdminTab === 'reviews') await loadSubmissions(true, true);
    $('displayUpdated').textContent = `Updated ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`;
  } catch (error) {
    $('displayUpdated').textContent = 'Live update paused — use Refresh';
  } finally {
    adminLiveLoading = false;
  }
}

function renderChallenges() {
  const challenges = state.challenges || [];
  const activeCount = challenges.filter((challenge) => challenge.is_active).length;
  $('challengeSummary').textContent = `${activeCount} active · ${challenges.length - activeCount} inactive · ${challenges.length} total`;

  const categories = [...new Set(challenges.map((challenge) => challenge.category).filter(Boolean))].sort();
  $('challengeCategories').innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category)}"></option>`)
    .join('');

  $('challengeList').innerHTML = challenges.map((challenge) => {
    const bonus = challenge.bonus_points_per_unit > 0 && challenge.max_bonus_units > 0
      ? `+${challenge.bonus_points_per_unit}/unit · max ${challenge.max_bonus_units}`
      : 'No bonus';
    const media = challenge.media_kind === 'either' ? 'Photo or video' : challenge.media_kind;
    const stateLabel = challenge.is_active ? 'Active' : 'Inactive';
    return `
      <article class="challenge-row ${challenge.is_active ? '' : 'inactive'}">
        <div>
          <div class="challenge-title-line">
            <h3>${escapeHtml(challenge.title)}</h3>
            <span class="state-pill ${challenge.is_active ? 'active' : 'inactive'}">${stateLabel}</span>
          </div>
          <div class="challenge-meta">
            <span class="meta-pill">#${challenge.sort_order}</span>
            <span class="meta-pill">${escapeHtml(challenge.category)}</span>
            <span class="meta-pill">${challenge.base_points} base pts</span>
            <span class="meta-pill">${escapeHtml(media)}</span>
            <span class="meta-pill">${escapeHtml(bonus)}</span>
          </div>
        </div>
        <button class="secondary" type="button" data-edit-challenge="${challenge.id}">Edit</button>
      </article>
    `;
  }).join('') || '<p class="muted">No challenges yet. Create the first one.</p>';

  document.querySelectorAll('[data-edit-challenge]').forEach((button) => {
    button.addEventListener('click', () => openChallengeEditor(button.dataset.editChallenge));
  });
}

function nextSortOrder() {
  const highest = Math.max(0, ...(state.challenges || []).map((challenge) => Number(challenge.sort_order) || 0));
  return highest + 10;
}

function openChallengeEditor(id = '') {
  editingChallenge = id
    ? (state.challenges || []).find((challenge) => challenge.id === id)
    : null;
  if (id && !editingChallenge) return adminMessage('That challenge could not be found.', 'error');

  $('challengeForm').reset();
  formMessage('');
  $('challengeId').value = editingChallenge?.id || '';
  $('challengeEditorTitle').textContent = editingChallenge ? 'Edit Challenge' : 'New Challenge';
  $('challengeTitle').value = editingChallenge?.title || '';
  $('challengeDescription').value = editingChallenge?.description || '';
  $('challengeCategory').value = editingChallenge?.category || '';
  $('challengeMediaKind').value = editingChallenge?.media_kind || 'photo';
  $('challengeBasePoints').value = editingChallenge?.base_points ?? 0;
  $('challengeSortOrder').value = editingChallenge?.sort_order ?? nextSortOrder();
  $('challengeBonusPoints').value = editingChallenge?.bonus_points_per_unit ?? 0;
  $('challengeMaxBonusUnits').value = editingChallenge?.max_bonus_units ?? 0;
  $('challengeBonusLabel').value = editingChallenge?.bonus_label || '';
  $('challengeActive').checked = editingChallenge?.is_active ?? true;

  const toggleButton = $('toggleChallengeBtn');
  toggleButton.classList.toggle('hidden', !editingChallenge);
  toggleButton.classList.toggle('danger-btn', editingChallenge?.is_active !== false);
  toggleButton.classList.toggle('success-btn', editingChallenge?.is_active === false);
  toggleButton.textContent = editingChallenge?.is_active === false ? 'Re-enable' : 'Disable';

  $('challengeOverlay').classList.remove('hidden');
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => $('challengeTitle').focus());
}

function closeChallengeEditor() {
  $('challengeOverlay').classList.add('hidden');
  document.body.classList.remove('modal-open');
  editingChallenge = null;
  formMessage('');
}

function challengePayload() {
  return {
    title: $('challengeTitle').value,
    description: $('challengeDescription').value,
    category: $('challengeCategory').value,
    media_kind: $('challengeMediaKind').value,
    base_points: Number($('challengeBasePoints').value),
    sort_order: Number($('challengeSortOrder').value),
    bonus_points_per_unit: Number($('challengeBonusPoints').value),
    max_bonus_units: Number($('challengeMaxBonusUnits').value),
    bonus_label: $('challengeBonusLabel').value,
    is_active: $('challengeActive').checked,
  };
}

async function saveChallenge(event) {
  event.preventDefault();
  if (!$('challengeForm').reportValidity()) return;

  const wasEditing = Boolean(editingChallenge);
  const button = $('saveChallengeBtn');
  setBusy(button, true, 'Saving…');
  formMessage('');
  try {
    const action = wasEditing ? 'update-challenge' : 'create-challenge';
    const body = challengePayload();
    if (wasEditing) body.id = editingChallenge.id;
    await api(action, body);
    closeChallengeEditor();
    await loadDashboard();
    setAdminTab('challenges');
    adminMessage(wasEditing ? 'Challenge updated.' : 'Challenge created.');
  } catch (error) {
    formMessage(error.message);
  } finally {
    setBusy(button, false, '');
  }
}

async function toggleChallenge() {
  if (!editingChallenge) return;
  const nextActive = !editingChallenge.is_active;
  const verb = nextActive ? 're-enable' : 'disable';
  if (!confirm(`${verb[0].toUpperCase()}${verb.slice(1)} “${editingChallenge.title}”?`)) return;

  const button = $('toggleChallengeBtn');
  setBusy(button, true, nextActive ? 'Enabling…' : 'Disabling…');
  formMessage('');
  try {
    await api('set-challenge-active', { id: editingChallenge.id, is_active: nextActive });
    closeChallengeEditor();
    await loadDashboard();
    setAdminTab('challenges');
    adminMessage(nextActive ? 'Challenge re-enabled.' : 'Challenge disabled.');
  } catch (error) {
    formMessage(error.message);
  } finally {
    setBusy(button, false, '');
  }
}

function relation(value) {
  return Array.isArray(value) ? value[0] || {} : value || {};
}

function submissionMedia(submission) {
  if (!submission.media_url) return '<div class="submission-media"></div>';
  const url = escapeHtml(submission.media_url);
  if (submission.media_type === 'video') {
    return `<video class="submission-media" src="${url}" controls playsinline preload="metadata"></video>`;
  }
  return `<img class="submission-media" src="${url}" alt="Submission evidence" loading="lazy">`;
}

function renderSubmissions() {
  if (!reviewItems.length) {
    $('submissionList').innerHTML = `<div class="submission-empty">No ${escapeHtml(reviewStatus)} submissions.</div>`;
  } else {
    $('submissionList').innerHTML = reviewItems.map((submission) => {
      const team = relation(submission.teams);
      const participant = relation(submission.participants);
      const challenge = relation(submission.challenges);
      const submittedAt = new Date(submission.created_at).toLocaleString([], {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });
      const bonus = submission.bonus_units > 0
        ? `<span class="meta-pill">${submission.bonus_units} ${escapeHtml(challenge.bonus_label || 'bonus units')}</span>`
        : '';
      const approveButton = submission.status !== 'approved'
        ? `<button class="success-btn" type="button" data-review-id="${submission.id}" data-decision="approved">Approve</button>`
        : '';
      const rejectButton = submission.status !== 'rejected'
        ? `<button class="danger-btn" type="button" data-review-id="${submission.id}" data-decision="rejected">Reject</button>`
        : '';

      return `
        <article class="submission-card">
          ${submissionMedia(submission)}
          <div class="submission-body">
            <span class="submission-status ${escapeHtml(submission.status)}">${escapeHtml(submission.status)}</span>
            <h3>${escapeHtml(challenge.title || 'Challenge')}</h3>
            <div class="submission-byline">
              <b>${escapeHtml(team.icon || '⭐')} ${escapeHtml(team.name || 'Team')}</b><br>
              <span class="muted small">Submitted by ${escapeHtml(participant.display_name || 'Participant')} · ${escapeHtml(participant.base_name || '')}</span>
            </div>
            <div class="submission-points">
              <span class="meta-pill">${Number(submission.points_awarded) || 0} pts if approved</span>
              ${bonus}
              <span class="meta-pill">${escapeHtml(submittedAt)}</span>
            </div>
            <div class="submission-actions">${approveButton}${rejectButton}</div>
          </div>
        </article>
      `;
    }).join('');
  }

  document.querySelectorAll('[data-review-id]').forEach((button) => {
    button.addEventListener('click', () => reviewSubmission(button.dataset.reviewId, button.dataset.decision, button));
  });
}

async function loadSubmissions(reset = true, silent = false) {
  if (reviewLoading) return;
  reviewLoading = true;
  if (!silent) reviewMessage('');
  if (reset) {
    reviewCursor = null;
    reviewItems = [];
    if (!silent) $('submissionList').innerHTML = '<div class="submission-empty">Loading submissions…</div>';
  }

  try {
    const data = await api('list-submissions', { status: reviewStatus, before: reviewCursor });
    reviewItems = reset ? data.submissions : [...reviewItems, ...data.submissions];
    reviewCursor = data.next_cursor;
    renderSubmissions();
    $('loadMoreSubmissions').classList.toggle('hidden', !data.has_more);
  } catch (error) {
    reviewMessage(error.message);
    if (reset) $('submissionList').innerHTML = '';
  } finally {
    reviewLoading = false;
  }
}

async function reviewSubmission(id, decision, button) {
  if (decision === 'rejected' && !confirm('Reject this submission? The team will be able to submit it again.')) return;
  setBusy(button, true, decision === 'approved' ? 'Approving…' : 'Rejecting…');
  reviewMessage('');
  try {
    await api('review-submission', { id, decision });
    state = await api('state', {}, 'GET');
    renderDashboard();
    await loadSubmissions(true);
    setAdminTab('reviews', false);
    reviewMessage(decision === 'approved' ? 'Submission approved and score updated.' : 'Submission rejected.', 'success');
  } catch (error) {
    reviewMessage(error.message);
  } finally {
    setBusy(button, false, '');
  }
}

function setAdminTab(tab, loadReviews = true) {
  const selected = ['overview', 'challenges', 'reviews', 'display'].includes(tab) ? tab : 'overview';
  selectedAdminTab = selected;
  $('overviewPanel').classList.toggle('hidden', selected !== 'overview');
  $('challengesPanel').classList.toggle('hidden', selected !== 'challenges');
  $('reviewsPanel').classList.toggle('hidden', selected !== 'reviews');
  $('displayPanel').classList.toggle('hidden', selected !== 'display');
  document.querySelectorAll('[data-admin-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.adminTab === selected);
  });
  if (selected === 'reviews' && loadReviews) loadSubmissions(true);
}

async function huntAction(action) {
  try {
    await api(action);
    await loadDashboard();
    adminMessage(`Hunt ${action === 'start' ? 'started' : action === 'end' ? 'ended' : 'reset to Draft'}.`);
  } catch (error) {
    adminMessage(error.message, 'error');
  }
}

$('authBtn').addEventListener('click', authenticate);
$('adminPassword').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') authenticate();
});
$('startBtn').addEventListener('click', () => confirm('Start the 3-hour hunt now?') && huntAction('start'));
$('endBtn').addEventListener('click', () => confirm('End the hunt now?') && huntAction('end'));
$('resetBtn').addEventListener('click', () => confirm('Reset the hunt to Draft?') && huntAction('reset'));
$('refreshAdmin').addEventListener('click', async () => {
  try {
    await loadDashboard();
    adminMessage('Dashboard refreshed.');
  } catch (error) {
    adminMessage(error.message, 'error');
  }
});
$('logoutBtn').addEventListener('click', async () => {
  try { await api('logout'); } catch { /* Clear the local token even if the request fails. */ }
  localStorage.removeItem('hunt_admin_token');
  location.reload();
});
document.querySelectorAll('[data-admin-tab]').forEach((button) => {
  button.addEventListener('click', () => setAdminTab(button.dataset.adminTab));
});
document.querySelectorAll('[data-review-status]').forEach((button) => {
  button.addEventListener('click', () => {
    reviewStatus = button.dataset.reviewStatus;
    document.querySelectorAll('[data-review-status]').forEach((item) => {
      item.classList.toggle('active', item === button);
    });
    loadSubmissions(true);
  });
});
$('refreshReviews').addEventListener('click', async () => {
  try {
    state = await api('state', {}, 'GET');
    renderDashboard();
    await loadSubmissions(true);
  } catch (error) {
    reviewMessage(error.message);
  }
});
$('loadMoreSubmissions').addEventListener('click', () => loadSubmissions(false));
$('fullscreenDisplay').addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) await $('liveDisplay').requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    adminMessage('Full Screen is unavailable in this browser. You can still project this tab.', 'error');
  }
});
$('newChallengeBtn').addEventListener('click', () => openChallengeEditor());
$('challengeForm').addEventListener('submit', saveChallenge);
$('cancelChallengeBtn').addEventListener('click', closeChallengeEditor);
$('closeChallengeEditor').addEventListener('click', closeChallengeEditor);
$('toggleChallengeBtn').addEventListener('click', toggleChallenge);
$('challengeOverlay').addEventListener('click', (event) => {
  if (event.target === $('challengeOverlay')) closeChallengeEditor();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !$('challengeOverlay').classList.contains('hidden')) closeChallengeEditor();
});

init();
setInterval(refreshAdminLive, 3000);
