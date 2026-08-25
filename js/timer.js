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
  const box = time.closest('.countdown-box');

  if (window.timerInterval) clearInterval(window.timerInterval);

  if (!settings || settings.status === 'draft') {
    box.classList.remove('final-countdown');
    status.textContent = window.t('timer.waitingStatus');
    time.textContent = '3:00:00';
    subtitle.textContent = window.t('timer.waiting');
    return;
  }

  if (settings.status === 'closed') {
    box.classList.remove('final-countdown');
    status.textContent = window.t('timer.finished');
    time.textContent = '0:00:00';
    subtitle.textContent = window.t('timer.final');
    return;
  }

  status.textContent = window.t('timer.live');
  const tick = () => {
    const remaining = new Date(settings.ends_at) - Date.now();
    time.textContent = window.formatRemaining(remaining);
    box.classList.toggle('final-countdown', remaining > 0 && remaining <= 10 * 60 * 1000);
    subtitle.textContent = remaining <= 0
      ? window.t('timer.timesUp')
      : remaining <= 60 * 1000
        ? window.t('timer.finalMinute')
        : remaining <= 5 * 60 * 1000
          ? window.t('timer.finalFive')
          : remaining <= 10 * 60 * 1000
            ? window.t('timer.finalTen')
            : window.t('timer.go');
  };
  tick();
  window.timerInterval = setInterval(tick, 1000);
};
