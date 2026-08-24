(function enableChallengeBonuses() {
  const originalOpenChallenge = window.openChallenge;
  if (typeof originalOpenChallenge !== 'function') return;

  window.openChallenge = function openChallengeWithBonus(id) {
    originalOpenChallenge(id);

    const challenge = window.appState?.challenges?.find((item) => item.id === id);
    const bonusWrap = document.getElementById('bonusWrap');
    const bonusInput = document.getElementById('bonusInput');
    const bonusLabel = document.getElementById('bonusLabel');
    const bonusHint = document.getElementById('bonusHint');
    if (!challenge || !bonusWrap || !bonusInput || !bonusLabel || !bonusHint) return;

    const bonusEnabled = challenge.bonus_points_per_unit > 0 && challenge.max_bonus_units > 0;
    bonusWrap.classList.toggle('hidden', !bonusEnabled);
    bonusInput.value = '0';
    bonusInput.max = String(challenge.max_bonus_units || 0);
    bonusLabel.textContent = challenge.bonus_label || 'Bonus units';
    bonusHint.textContent = bonusEnabled
      ? `+${challenge.bonus_points_per_unit} points each · maximum ${challenge.max_bonus_units}`
      : '';
  };
})();
