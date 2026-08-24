(() => {
  const joinUrl = new URL('./', window.location.href).href;
  const urlLabel = document.getElementById('joinUrl');
  const openLink = document.getElementById('openJoinLink');
  const status = document.getElementById('copyStatus');

  urlLabel.textContent = joinUrl;
  openLink.href = joinUrl;

  if (window.QRCode) {
    new window.QRCode(document.getElementById('joinQr'), {
      text: joinUrl,
      width: 360,
      height: 360,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.M,
    });
  } else {
    document.getElementById('joinQr').textContent = 'QR code could not load. Use the link below.';
  }

  document.getElementById('copyJoinLink').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      status.textContent = 'Join link copied.';
    } catch (_) {
      window.prompt('Copy this join link:', joinUrl);
    }
  });
})();
