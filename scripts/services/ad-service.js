let adsEnabled = false;

const resumeAds = () => {
  const adContainer = document.getElementById('electron-ad-container');
  if (!adsEnabled || !adContainer || adContainer.style.display !== 'none')
    return;
  adContainer.style.display = 'flex';
  adContainer.innerHTML =
    "<webview allowpopups httpreferrer='" +
    window.game.host() +
    "' style='flex:1' id='electron-ad-view' src='" +
    window.game.scheme() +
    '://' +
    window.game.host() +
    "/client/ad'></webview>";
};

const pauseAds = () => {
  const adContainer = document.getElementById('electron-ad-container');
  if (!adContainer || adContainer.style.display === 'none') return;
  adContainer.style.display = 'none';
  adContainer.innerHTML = '';
};

const enableAds = () => {
  adsEnabled = true;
  resumeAds();
};

const disableAds = () => {
  adsEnabled = false;
  pauseAds();
};

const AdService = {
  enableAds,
  disableAds,
  resumeAds,
  pauseAds,
};

module.exports = {
  AdService,
};
