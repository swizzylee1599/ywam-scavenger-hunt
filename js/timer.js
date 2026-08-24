window.timerInterval = null;

window.formatRemaining = function formatRemaining(milliseconds) {
  const remaining = Math.max(0, milliseconds);
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

window.renderParticipantTimer = function renderParticipantTimer(settings) {
  const status = document.getElementById('huntStatus');
  const time = document.getElementById('countdown');
  const subtitle = document.getElementById('countdownSub');

  if (window.timerInterval) clearInterval(window.timerInterval);

  if (!settings || settings.status === 'draft') {
    status.textContent = window.t('timer.waitingStatus');
    time.textContent = '3:00:00';
    subtitle.textContent = window.t('timer.waiting');
    return;
  }

  if (settings.status === 'closed') {
    status.textContent = window.t('timer.finished');
    time.textContent = '0:00:00';
    subtitle.textContent = window.t('timer.final');
    return;
  }

  status.textContent = window.t('timer.live');
  const tick = () => {
    const remaining = new Date(settings.ends_at) - Date.now();
    time.textContent = window.formatRemaining(remaining);
    subtitle.textContent = remaining > 0 ? window.t('timer.go') : window.t('timer.timesUp');
  };
  tick();
  window.timerInterval = setInterval(tick, 1000);
};
