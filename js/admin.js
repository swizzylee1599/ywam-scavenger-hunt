const API = 'https://zarxbmmnfmaorwjfopuu.supabase.co/functions/v1/hunt-admin-api';
const $ = (id) => document.getElementById(id);

let token = localStorage.getItem('hunt_admin_token') || '';
let mode = 'login';
let state = null;
let timer = null;
let editingChallenge = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
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
  $('authView').classList.add('hidden');
  $('dashboardView').classList.remove('hidden');
  renderDashboard();
}

function renderDashboard() {
  const settings = state.settings;
  $('adminStatus').textContent = settings.status;
  $('participantCount').textContent = state.participant_count;
  $('teamCount').textContent = state.team_count;
  $('adminLeaders').innerHTML = (state.leaders || []).map((team, index) => `
    <div class="leader-row">
      <span class="leader-name">#${index + 1} ${escapeHtml(team.name)}</span>
      <b>${Number(team.score) || 0} pts</b>
    </div>
  `).join('') || '<p class="muted">No scores yet.</p>';
  renderChallenges();
  startAdminTimer(settings);
}

function startAdminTimer(settings) {
  if (timer) clearInterval(timer);
  const tick = () => {
    if (settings.status !== 'open' || !settings.ends_at) {
      $('adminTimer').textContent = settings.status === 'closed' ? '0:00:00' : '3:00:00';
      return;
    }
    const milliseconds = Math.max(0, new Date(settings.ends_at) - Date.now());
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    $('adminTimer').textContent = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };
  tick();
  timer = setInterval(tick, 1000);
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

function setAdminTab(tab) {
  const selected = tab === 'challenges' ? 'challenges' : 'overview';
  $('overviewPanel').classList.toggle('hidden', selected !== 'overview');
  $('challengesPanel').classList.toggle('hidden', selected !== 'challenges');
  document.querySelectorAll('[data-admin-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.adminTab === selected);
  });
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
