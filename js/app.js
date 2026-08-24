const $ = (id) => document.getElementById(id);

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
  button.textContent = busy ? busyText : button.dataset.defaultText;
}

async function join() {
  const name = $('name').value.trim();
  const base = $('base').value.trim();
  if (!name || !base) return note($('joinMsg'), 'Please enter your name and select your province.');

  const button = $('joinBtn');
  setButtonBusy(button, true, 'Finding your team…');
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
    $('syncText').textContent = 'Updated just now';
    if (first) celebrate();
  } catch (error) {
    if (String(error.message).includes('Session')) {
      localStorage.removeItem('hunt_session');
      window.huntSession = '';
      location.reload();
      return;
    }
    $('syncText').textContent = 'Could not refresh — tap Refresh';
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
    window.appState.leaders = live.leaders || [];
    window.appState.settings = live.settings;
    renderAll();
    window.renderParticipantTimer(window.appState.settings);
    $('syncText').textContent = 'Live · updated just now';
  } catch (error) {
    if (String(error.message).includes('Session')) {
      localStorage.removeItem('hunt_session');
      window.huntSession = '';
      location.reload();
      return;
    }
    $('syncText').textContent = 'Live update paused — tap Refresh';
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
  $('teamScore').textContent = `${myLeaderboardEntry?.score || 0} pts`;
  $('members').innerHTML = (app.members || []).map((member) => (
    `<span class="member">${escapeHtml(member.display_name)} · ${escapeHtml(member.base_name)}</span>`
  )).join('');

  const total = app.challenges?.length || 0;
  const approved = app.completed?.length || 0;
  $('progressBar').style.width = total ? `${Math.round((approved / total) * 100)}%` : '0%';
  $('progressText').textContent = `${approved} of ${total} challenges approved`;
  renderChallenges();
  renderLeaderboard();
  renderFeed();
}

function challengePoints(challenge) {
  if (challenge.base_points > 0 && challenge.bonus_points_per_unit > 0) {
    return `${challenge.base_points} pts + bonus`;
  }
  if (challenge.base_points > 0) return `${challenge.base_points} pts`;
  return `${challenge.bonus_points_per_unit} pts each`;
}

function challengeAction(challenge, status, closed) {
  if (status === 'approved') {
    return '<div class="notice success">Approved — points added 🎉</div>';
  }
  if (status === 'pending') {
    return '<div class="notice pending">Submitted — awaiting organizer review ⏳</div>';
  }
  if (closed) return '<div class="notice error">The race has ended.</div>';
  const icon = challenge.media_kind === 'video' ? '🎥' : challenge.media_kind === 'either' ? '📷' : '📷';
  const label = status === 'rejected' ? `${icon} Submit a new attempt` : `${icon} Complete Challenge`;
  const rejected = status === 'rejected'
    ? '<div class="notice error">Not approved — your team can try again.</div>'
    : '';
  return `${rejected}<button onclick="openChallenge('${challenge.id}')">${label}</button>`;
}

function renderChallenges() {
  const app = window.appState;
  const statuses = app.submission_statuses || {};
  const completed = new Set(app.completed || []);
  const closed = app.settings?.status === 'closed';

  $('challengesView').innerHTML = '<h2>Challenges</h2>' + (app.challenges || []).map((challenge) => {
    const status = statuses[challenge.id] || (completed.has(challenge.id) ? 'approved' : '');
    const headingIcon = status === 'approved' ? '✅ ' : status === 'pending' ? '⏳ ' : status === 'rejected' ? '↻ ' : '';
    return `
      <article class="card challenge ${escapeHtml(status)}">
        <div class="row between">
          <div>
            <div class="eyebrow dark">${escapeHtml(challenge.category || 'challenge')}</div>
            <h3>${headingIcon}${escapeHtml(challenge.title)}</h3>
          </div>
          <span class="pill">${escapeHtml(challengePoints(challenge))}</span>
        </div>
        <p>${escapeHtml(challenge.description || '')}</p>
        ${challengeAction(challenge, status, closed)}
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
        <h2>Live Leaderboard</h2>
        <p class="muted small">Scores update after organizer approval.</p>
      </div>
    </div>
    ${leaders.map((team, index) => `
      <article class="card leader polished ${team.team_id === myTeamId ? 'my-team' : ''} ${index < 3 ? 'top-team' : ''}">
        <div class="leader-main">
          <span class="leader-rank">${medals[index] || `#${index + 1}`}</span>
          <span class="leader-avatar" style="color:${safeColor(team.color)}">${escapeHtml(team.icon || '⭐')}</span>
          <span class="leader-copy">
            <b>${escapeHtml(team.name)}</b>
            <small>${Number(team.challenges_completed) || 0} challenges · ${Number(team.member_count) || 0} members${team.team_id === myTeamId ? ' · Your team' : ''}</small>
          </span>
        </div>
        <b class="leader-score">${Number(team.score) || 0} pts</b>
      </article>
    `).join('') || '<div class="card">No scores yet.</div>'}
  `;
}

function renderFeed() {
  const leaders = new Map((window.appState.leaders || []).map((team) => [team.team_id, team]));
  $('feedView').innerHTML = '<h2>Live Feed</h2>' + ((window.appState.feed || []).map((item) => {
    const team = leaders.get(item.team_id) || {};
    const media = item.media_url
      ? item.media_type === 'video'
        ? `<video class="feed-video" controls playsinline preload="metadata" src="${escapeHtml(item.media_url)}"></video>`
        : `<img class="feed-img" loading="lazy" src="${escapeHtml(item.media_url)}" alt="${escapeHtml(item.challenge_title)}">`
      : '';
    return `
      <article class="card feed-card">
        <div><b>${escapeHtml(team.icon || '⭐')} ${escapeHtml(item.team_name)}</b> completed <b>${escapeHtml(item.challenge_title)}</b></div>
        <div class="feed-points">+${Number(item.points_awarded) || 0} pts</div>
        ${media}
      </article>
    `;
  }).join('') || '<div class="card">Approved submissions will appear here.</div>');
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
  $('uploadTitle').textContent = currentChallenge.title;
  $('uploadDesc').textContent = currentChallenge.description || '';
  $('mediaInput').value = '';
  $('mediaInput').accept = currentChallenge.media_kind === 'video'
    ? 'video/*'
    : currentChallenge.media_kind === 'photo' ? 'image/*' : 'image/*,video/*';
  clearPreview();
  note($('uploadMsg'), '');

  const bonusEnabled = currentChallenge.bonus_points_per_unit > 0 && currentChallenge.max_bonus_units > 0;
  $('bonusWrap').classList.toggle('hidden', !bonusEnabled);
  $('bonusInput').value = '0';
  $('bonusInput').max = String(currentChallenge.max_bonus_units || 0);
  $('bonusLabel').textContent = currentChallenge.bonus_label || 'Bonus units';
  $('bonusHint').textContent = bonusEnabled
    ? `+${currentChallenge.bonus_points_per_unit} points each · maximum ${currentChallenge.max_bonus_units}`
    : '';
  $('uploadOverlay').classList.remove('hidden');
};

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

async function submitChallenge() {
  const file = $('mediaInput').files[0];
  if (!file) return note($('uploadMsg'), 'Please choose a photo or video.');
  if (file.size > 12 * 1024 * 1024) return note($('uploadMsg'), 'File is too large. Choose one under 12 MB.');

  const mediaType = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'photo' : '';
  if (!mediaType) return note($('uploadMsg'), 'Please choose a supported photo or video.');
  if (currentChallenge.media_kind !== 'either' && currentChallenge.media_kind !== mediaType) {
    return note($('uploadMsg'), `This challenge requires a ${currentChallenge.media_kind}.`);
  }

  const bonus = Number($('bonusInput').value || 0);
  if (!Number.isInteger(bonus) || bonus < 0 || bonus > currentChallenge.max_bonus_units) {
    return note($('uploadMsg'), `Bonus units must be from 0 to ${currentChallenge.max_bonus_units}.`);
  }

  const button = $('submitUpload');
  setButtonBusy(button, true, 'Submitting…');
  note($('uploadMsg'), '');
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    await window.huntApi('upload', {
      challengeId: currentChallenge.id,
      mediaType,
      mime: file.type,
      data: dataUrl.split(',')[1],
      bonus,
    });
    $('uploadOverlay').classList.add('hidden');
    clearPreview();
    celebrate();
    await window.loadState();
  } catch (error) {
    note($('uploadMsg'), error.message);
  } finally {
    setButtonBusy(button, false, '');
  }
}

function setTab(tab) {
  ['challenges', 'leaderboard', 'feed'].forEach((name) => {
    $(`${name}View`).classList.toggle('hidden', name !== tab);
  });
  document.querySelectorAll('.tabs button').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });
}

function celebrate() {
  const container = $('confetti');
  for (let index = 0; index < 20; index += 1) {
    const piece = document.createElement('span');
    piece.textContent = '🎉';
    piece.style.left = `${Math.random() * 100}vw`;
    container.appendChild(piece);
  }
  setTimeout(() => { container.innerHTML = ''; }, 1800);
}

$('joinBtn').addEventListener('click', join);
$('editTeamBtn').addEventListener('click', window.openTeamSettings);
$('saveTeamBtn').addEventListener('click', window.saveTeamSettings);
$('closeTeam').addEventListener('click', () => $('teamOverlay').classList.add('hidden'));
$('closeUpload').addEventListener('click', () => {
  $('uploadOverlay').classList.add('hidden');
  clearPreview();
});
$('mediaInput').addEventListener('change', previewMedia);
$('submitUpload').addEventListener('click', submitChallenge);
$('refreshBtn').addEventListener('click', () => window.loadState());
document.querySelectorAll('.tabs button').forEach((button) => {
  button.addEventListener('click', () => setTab(button.dataset.tab));
});

if (window.huntSession) window.loadState();
setInterval(() => {
  window.refreshLiveState();
}, 7000);
