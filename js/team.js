window.teamSelection = { icon: '⭐', color: '#0f172a' };

function teamEscapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

window.openTeamSettings = function openTeamSettings() {
  const team = window.appState.team;
  document.getElementById('teamNameInput').value = team.name || '';
  document.getElementById('teamMsg').innerHTML = '';
  window.teamSelection.icon = team.icon || '⭐';
  window.teamSelection.color = team.color || '#0f172a';
  document.querySelectorAll('#iconPicker button').forEach((button) => {
    button.classList.toggle('selected', button.dataset.icon === window.teamSelection.icon);
  });
  document.querySelectorAll('#colorPicker button').forEach((button) => {
    button.classList.toggle('selected', button.dataset.color === window.teamSelection.color);
  });
  document.getElementById('teamOverlay').classList.remove('hidden');
};

window.saveTeamSettings = async function saveTeamSettings() {
  const name = document.getElementById('teamNameInput').value.trim();
  const message = document.getElementById('teamMsg');
  const button = document.getElementById('saveTeamBtn');
  button.disabled = true;
  button.textContent = window.t('team.saving');
  message.innerHTML = '';
  try {
    await window.huntApi('update-team', {
      name,
      icon: window.teamSelection.icon,
      color: window.teamSelection.color,
    });
    document.getElementById('teamOverlay').classList.add('hidden');
    await window.loadState();
  } catch (error) {
    message.innerHTML = `<div class="notice error">${teamEscapeHtml(error.message)}</div>`;
  } finally {
    button.disabled = false;
    button.textContent = window.t('team.save');
  }
};

document.querySelectorAll('#iconPicker button').forEach((button) => {
  button.addEventListener('click', () => {
    window.teamSelection.icon = button.dataset.icon;
    document.querySelectorAll('#iconPicker button').forEach((item) => {
      item.classList.toggle('selected', item === button);
    });
  });
});

document.querySelectorAll('#colorPicker button').forEach((button) => {
  button.addEventListener('click', () => {
    window.teamSelection.color = button.dataset.color;
    document.querySelectorAll('#colorPicker button').forEach((item) => {
      item.classList.toggle('selected', item === button);
    });
  });
});
