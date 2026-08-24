const $ = (id) => document.getElementById(id);
const tr = (key, values) => window.t(key, values);

window.appState = null;
let currentChallenge = null;
let previewUrl = null;
let fullStateLoading = false;
let liveStateLoading = false;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function safeColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : '#0f172a';
}

function note(element, message, type = 'error') {
  element.innerHTML = message
    ? `<div class="notice ${type}">${escapeHtml(message)}</div>`
    : '';
}

function setButtonBusy(button, busy, busyText) {
  if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
  button.disabled = busy;
  button.textContent = busy
    ? busyText
    : button.dataset.i18n ? tr(button.dataset.i18n) : button.dataset.defaultText;
}

async function join() {
  const name = $('name').value.trim();
  const base = $('base').value.trim();
  if (!name || !base) return note($('joinMsg'), tr('join.missing'));

  const button = $('joinBtn');
  setButtonBusy(button, true, tr('join.finding'));
  note($('joinMsg'), '');
  try {
    const data = await window.huntApi('join', { name, base, session: window.huntSession });
    window.huntSession = data.session;
    localStorage.setItem('hunt_session', window.huntSession);
    await window.loadState(true);
  } catch (error) {
    note($('joinMsg'), error.message);
  } finally {
    setButtonBusy(button, false, '');
  }
}

window.loadState = async function loadState(first = false) {
  if (fullStateLoading) return;
  fullStateLoading = true;
  try {
    window.appState = await window.huntApi('state', {}, 'GET');
    $('joinView').classList.add('hidden');
    $('appView').classList.remove('hidden');
    $('tabs').classList.remove('hidden');
    renderAll();
    window.renderParticipantTimer(window.appState.settings);
    $('syncText').textContent = tr('sync.updated');
    if (first) celebrate();
  } catch (error) {
    if (String(error.message).includes('Session')) {
      localStorage.removeItem('hunt_session');
      window.huntSession = '';
      location.reload();
      return;
    }
    $('syncText').textContent = tr('sync.failed');
  } finally {
    fullStateLoading = false;
  }
};

window.refreshLiveState = async function refreshLiveState() {
  if (!window.huntSession || !window.appState || liveStateLoading || fullStateLoading || document.hidden) return;
  liveStateLoading = true;
  try {
    const live = await window.huntApi('live', {}, 'GET');
    const currentFeedIds = (window.appState.feed || []).map((item) => item.id);
    const feedChanged = JSON.stringify(currentFeedIds) !== JSON.stringify(live.feed_ids || []);
    if (feedChanged) {
      liveStateLoading = false;
      await window.loadState();
      return;
    }
    window.appState.completed = live.completed || [];
    window.appState.submission_statuses = live.submission_statuses || {};
    window.appState.submission_notes = live.submission_notes || {};
    window.appState.leaders = live.leaders || [];
    window.appState.settings = live.settings;
    renderAll();
    window.renderParticipantTimer(window.appState.settings);
    $('syncText').textContent = tr('sync.updated');
  } catch (error) {
    if (String(error.message).includes('Session')) {
      localStorage.removeItem('hunt_session');
      window.huntSession = '';
      location.reload();
      return;
    }
    $('syncText').textContent = tr('sync.failed');
  } finally {
    liveStateLoading = false;
  }
};

function renderAll() {
  const app = window.appState;
  const team = app.team;
  const myLeaderboardEntry = app.leaders?.find((entry) => entry.team_id === team.id);
  $('teamName').textContent = team.name;
  $('teamIcon').textContent = team.icon || '⭐';
  $('teamIdentity').style.color = safeColor(team.color);
  $('teamScore').textContent = tr('points.base', { points: myLeaderboardEntry?.score || 0 });
  $('members').innerHTML = (app.members || []).map((member) => (
    `<span class="member">${escapeHtml(member.display_name)} · ${escapeHtml(member.base_name)}</span>`
  )).join('');

  const total = app.challenges?.length || 0;
  const approved = app.completed?.length || 0;
  $('progressBar').style.width = total ? `${Math.round((approved / total) * 100)}%` : '0%';
  $('progressText').textContent = tr('progress.approved', { approved, total });
  renderChallenges();
  renderLeaderboard();
  renderFeed();
}

function challengePoints(challenge) {
  if (challenge.base_points > 0 && challenge.bonus_points_per_unit > 0) {
    return tr('points.bonus', { points: challenge.base_points });
  }
  if (challenge.base_points > 0) return tr('points.base', { points: challenge.base_points });
  return tr('points.each', { points: challenge.bonus_points_per_unit });
}

function challengeAction(challenge, status, closed, reasonCode) {
  if (status === 'approved') {
    return `<div class="notice success">${escapeHtml(tr('challenge.approved'))}</div>`;
  }
  if (status === 'pending') {
    return `<div class="notice pending">${escapeHtml(tr('challenge.pending'))}</div>`;
  }
  if (closed) return `<div class="notice error">${escapeHtml(tr('challenge.closed'))}</div>`;
  const icon = challenge.media_kind === 'video' ? '🎥' : challenge.media_kind === 'either' ? '📷' : '📷';
  const label = status === 'rejected' ? `${icon} ${tr('challenge.retry')}` : `${icon} ${tr('challenge.complete')}`;
  const reason = tr(`reason.${reasonCode || 'other_retry'}`);
  const rejected = status === 'rejected'
    ? `<div class="notice error">${escapeHtml(tr('challenge.rejected', { reason }))}</div>`
    : '';
  return `${rejected}<button onclick="openChallenge('${challenge.id}')">${label}</button>`;
}

function renderChallenges() {
  const app = window.appState;
  const statuses = app.submission_statuses || {};
  const notes = app.submission_notes || {};
  const completed = new Set(app.completed || []);
  const closed = app.settings?.status === 'closed';

  $('challengesView').innerHTML = `<h2>${escapeHtml(tr('challenge.heading'))}</h2>` + (app.challenges || []).map((originalChallenge) => {
    const challenge = window.translateChallenge(originalChallenge);
    const status = statuses[challenge.id] || (completed.has(challenge.id) ? 'approved' : '');
    const headingIcon = status === 'approved' ? '✅ ' : status === 'pending' ? '⏳ ' : status === 'rejected' ? '↻ ' : '';
    return `
      <article class="card challenge ${escapeHtml(status)}">
        <div class="row between">
          <div>
            <div class="eyebrow dark">${escapeHtml(window.translateCategory(challenge.category || 'challenge'))}</div>
            <h3>${headingIcon}${escapeHtml(challenge.title)}</h3>
          </div>
          <span class="pill">${escapeHtml(challengePoints(challenge))}</span>
        </div>
        <p>${escapeHtml(challenge.description || '')}</p>
        ${challengeAction(challenge, status, closed, notes[challenge.id])}
      </article>
    `;
  }).join('');
}

function renderLeaderboard() {
  const leaders = window.appState.leaders || [];
  const myTeamId = window.appState.team.id;
  const medals = ['🥇', '🥈', '🥉'];
  $('leaderboardView').innerHTML = `
    <div class="leaderboard-heading">
      <div>
        <h2>${escapeHtml(tr('leaderboard.heading'))}</h2>
      </div>
    </div>
    ${leaders.map((team, index) => `
      <article class="card leader polished ${team.team_id === myTeamId ? 'my-team' : ''} ${index < 3 ? 'top-team' : ''}">
        <div class="leader-main">
          <span class="leader-rank">${medals[index] || `#${index + 1}`}</span>
          <span class="leader-avatar" style="color:${safeColor(team.color)}">${escapeHtml(team.icon || '⭐')}</span>
          <span class="leader-copy">
            <b>${escapeHtml(team.name)}</b>
            <small>${escapeHtml(tr('leaderboard.details', { challenges: Number(team.challenges_completed) || 0, members: Number(team.member_count) || 0 }))}</small>
          </span>
        </div>
        <b class="leader-score">${escapeHtml(tr('points.base', { points: Number(team.score) || 0 }))}</b>
      </article>
    `).join('') || `<div class="card">${escapeHtml(tr('leaderboard.empty'))}</div>`}
  `;
}

function renderFeed() {
  const leaders = new Map((window.appState.leaders || []).map((team) => [team.team_id, team]));
  $('feedView').innerHTML = `<h2>${escapeHtml(tr('feed.heading'))}</h2>` + ((window.appState.feed || []).map((item) => {
    const team = leaders.get(item.team_id) || {};
    const challenge = window.translateChallenge({ title: item.challenge_title, description: '' });
    const media = item.media_url
      ? item.media_type === 'video'
        ? `<video class="feed-video" controls playsinline preload="metadata" src="${escapeHtml(item.media_url)}"></video>`
        : `<img class="feed-img" loading="lazy" src="${escapeHtml(item.media_url)}" alt="${escapeHtml(challenge.title)}">`
      : '';
    return `
      <article class="card feed-card">
        <div>${escapeHtml(tr('feed.completed', { team: `${team.icon || '⭐'} ${item.team_name}`, challenge: challenge.title }))}</div>
        <div class="feed-points">+${escapeHtml(tr('points.base', { points: Number(item.points_awarded) || 0 }))}</div>
        ${media}
      </article>
    `;
  }).join('') || `<div class="card">${escapeHtml(tr('feed.empty'))}</div>`);
}

function clearPreview() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  $('imagePreview').classList.add('hidden');
  $('videoPreview').classList.add('hidden');
  $('imagePreview').removeAttribute('src');
  $('videoPreview').removeAttribute('src');
}

window.openChallenge = function openChallenge(id) {
  currentChallenge = window.appState.challenges.find((challenge) => challenge.id === id);
  if (!currentChallenge) return;
  localizeCurrentChallenge();
  $('mediaInput').value = '';
  $('mediaInput').accept = currentChallenge.media_kind === 'video'
    ? 'video/*'
    : currentChallenge.media_kind === 'photo' ? 'image/*' : 'image/*,video/*';
  clearPreview();
  note($('uploadMsg'), '');
  hideUploadProgress();

  const bonusEnabled = currentChallenge.bonus_points_per_unit > 0 && currentChallenge.max_bonus_units > 0;
  $('bonusWrap').classList.toggle('hidden', !bonusEnabled);
  $('bonusInput').value = '0';
  $('bonusInput').max = String(currentChallenge.max_bonus_units || 0);
  $('uploadOverlay').classList.remove('hidden');
};

function localizeCurrentChallenge() {
  if (!currentChallenge) return;
  const translated = window.translateChallenge(currentChallenge);
  $('uploadTitle').textContent = translated.title;
  $('uploadDesc').textContent = translated.description || '';
  const bonusEnabled = currentChallenge.bonus_points_per_unit > 0 && currentChallenge.max_bonus_units > 0;
  $('bonusLabel').textContent = window.currentLanguage === 'km' ? tr('upload.bonusUnits') : currentChallenge.bonus_label || tr('upload.bonusUnits');
  $('bonusHint').textContent = bonusEnabled
    ? tr('upload.bonusHint', { points: currentChallenge.bonus_points_per_unit, max: currentChallenge.max_bonus_units })
    : '';
}

function previewMedia() {
  clearPreview();
  const file = $('mediaInput').files[0];
  if (!file) return;
  previewUrl = URL.createObjectURL(file);
  if (file.type.startsWith('video/')) {
    $('videoPreview').src = previewUrl;
    $('videoPreview').classList.remove('hidden');
  } else {
    $('imagePreview').src = previewUrl;
    $('imagePreview').classList.remove('hidden');
  }
}

function setUploadProgress(percent, message, indeterminate = false) {
  $('uploadProgress').classList.remove('hidden');
  $('uploadProgress').classList.toggle('indeterminate', indeterminate);
  $('uploadProgressBar').style.width = indeterminate ? '' : `${Math.max(0, Math.min(100, percent))}%`;
  $('uploadProgressText').textContent = message;
}

function hideUploadProgress() {
  $('uploadProgress').classList.add('hidden');
  $('uploadProgress').classList.remove('indeterminate');
  $('uploadProgressBar').style.width = '0%';
  $('uploadProgressText').textContent = '';
}

function readFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      setUploadProgress(Math.round(percent * 0.4), tr('upload.preparing', { percent }));
    };
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function submitChallenge() {
  const file = $('mediaInput').files[0];
  if (!file) return note($('uploadMsg'), tr('upload.choose'));
  if (file.size > 12 * 1024 * 1024) return note($('uploadMsg'), tr('upload.tooLarge'));
  if (!navigator.onLine) return note($('uploadMsg'), tr('connection.offline'));

  const mediaType = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'photo' : '';
  if (!mediaType) return note($('uploadMsg'), tr('upload.unsupported'));
  if (currentChallenge.media_kind !== 'either' && currentChallenge.media_kind !== mediaType) {
    const kind = tr(`challenge.${currentChallenge.media_kind}`);
    return note($('uploadMsg'), tr('upload.requires', { kind }));
  }

  const bonus = Number($('bonusInput').value || 0);
  if (!Number.isInteger(bonus) || bonus < 0 || bonus > currentChallenge.max_bonus_units) {
    return note($('uploadMsg'), tr('upload.bonusRange', { max: currentChallenge.max_bonus_units }));
  }

  const button = $('submitUpload');
  setButtonBusy(button, true, tr('upload.submitting'));
  note($('uploadMsg'), '');
  try {
    setUploadProgress(0, tr('upload.preparing', { percent: 0 }));
    const dataUrl = await readFileDataUrl(file);
    setUploadProgress(45, tr('upload.uploading'), true);
    await window.huntApi('upload', {
      challengeId: currentChallenge.id,
      mediaType,
      mime: file.type,
      data: dataUrl.split(',')[1],
      bonus,
    });
    setUploadProgress(100, tr('upload.review'));
    $('uploadOverlay').classList.add('hidden');
    clearPreview();
    celebrate('big');
    await window.loadState();
  } catch (error) {
    hideUploadProgress();
    note($('uploadMsg'), tr('upload.failed', { detail: error.message }));
  } finally {
    setButtonBusy(button, false, '');
  }
}

function setConnectionStatus(isOnline, announce = true) {
  const banner = $('connectionBanner');
  if (!isOnline) {
    banner.textContent = tr('connection.offline');
    banner.classList.remove('hidden', 'online');
    return;
  }
  if (!announce) {
    banner.classList.add('hidden');
    return;
  }
  banner.textContent = tr('connection.online');
  banner.classList.add('online');
  banner.classList.remove('hidden');
  setTimeout(() => banner.classList.add('hidden'), 2500);
}

window.renderLocalizedApp = function renderLocalizedApp() {
  if (window.appState) {
    renderAll();
    window.renderParticipantTimer(window.appState.settings);
  }
  if (currentChallenge && !$('uploadOverlay').classList.contains('hidden')) localizeCurrentChallenge();
  if (!navigator.onLine) setConnectionStatus(false);
};

function setTab(tab) {
  ['challenges', 'leaderboard', 'feed'].forEach((name) => {
    $(`${name}View`).classList.toggle('hidden', name !== tab);
  });
  document.querySelectorAll('.tabs button').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });
}

function celebrate(intensity = 'normal') {
  const container = $('confetti');
  const symbols = ['🎉', '🎊', '✨', '⭐', '🟠', '🟡', '🟢', '🔵', '🟣'];
  const count = intensity === 'big' ? 90 : 30;
  container.innerHTML = '';
  for (let index = 0; index < count; index += 1) {
    const piece = document.createElement('span');
    piece.textContent = symbols[index % symbols.length];
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.fontSize = `${14 + Math.random() * 18}px`;
    piece.style.animationDelay = `${Math.random() * 0.65}s`;
    piece.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
    piece.style.setProperty('--drift', `${-18 + Math.random() * 36}vw`);
    container.appendChild(piece);
  }
  setTimeout(() => { container.innerHTML = ''; }, intensity === 'big' ? 3900 : 3200);
}

$('joinBtn').addEventListener('click', join);
$('editTeamBtn').addEventListener('click', window.openTeamSettings);
$('saveTeamBtn').addEventListener('click', window.saveTeamSettings);
$('closeTeam').addEventListener('click', () => $('teamOverlay').classList.add('hidden'));
$('closeUpload').addEventListener('click', () => {
  $('uploadOverlay').classList.add('hidden');
  clearPreview();
  hideUploadProgress();
});
$('mediaInput').addEventListener('change', previewMedia);
$('submitUpload').addEventListener('click', submitChallenge);
$('refreshBtn').addEventListener('click', () => window.loadState());
document.querySelectorAll('.tabs button').forEach((button) => {
  button.addEventListener('click', () => setTab(button.dataset.tab));
});

document.querySelectorAll('[data-language]').forEach((button) => {
  button.addEventListener('click', () => window.setLanguage(button.dataset.language));
});
$('howToBtn').addEventListener('click', () => $('howToOverlay').classList.remove('hidden'));
$('closeHowTo').addEventListener('click', () => $('howToOverlay').classList.add('hidden'));
$('understandHowTo').addEventListener('click', () => $('howToOverlay').classList.add('hidden'));
$('howToOverlay').addEventListener('click', (event) => {
  if (event.target === $('howToOverlay')) $('howToOverlay').classList.add('hidden');
});
window.addEventListener('offline', () => setConnectionStatus(false));
window.addEventListener('online', () => setConnectionStatus(true));

window.applyI18n();
setConnectionStatus(navigator.onLine, false);

if (window.huntSession) window.loadState();
setInterval(() => {
  window.refreshLiveState();
}, 7000);
