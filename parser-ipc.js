const { ipcRenderer } = require('electron');

ipcRenderer.on(
  'parse-lines',
  (event, id, lines, scanning, selectedRegion, raidsToUpload) => {
    ipcParseLines(event, id, lines, scanning, selectedRegion, raidsToUpload);
  }
);

ipcRenderer.on(
  'collect-fights',
  (event, id, pushFightIfNeeded, scanningOnly) => {
    ipcCollectFights(event, id, pushFightIfNeeded, scanningOnly);
  }
);

ipcRenderer.on('collect-in-progress-fight', (event, id) => {
  ipcCollectInProgressFight(event, id);
});

ipcRenderer.on('collect-scanned-raids', (event, id) => {
  ipcCollectScannedRaids(event, id);
});

ipcRenderer.on('collect-master-info', (event, id) => {
  ipcCollectMasterInfo(event, id);
});

ipcRenderer.on('clear-fights', (event, id) => {
  ipcClearFights(event, id);
});

ipcRenderer.on('get-parser-version', (event) => {
  ipcRenderer.sendToHost('get-parser-version-completed', parserVersion);
});

ipcRenderer.on('clear-state', (event, id) => {
  ipcClearState(event, id);
});

ipcRenderer.on('set-start-date', (event, id, startDate) => {
  ipcSetStartDate(event, id, startDate);
});

ipcRenderer.on('set-live-logging-start-time', (event, id, startTime) => {
  ipcSetLiveLoggingStartTime(event, id, startTime);
});

window.setWarningText = (text) => {
  ipcRenderer.sendToHost('set-warning-text', text);
};

window.setErrorText = (text) => {
  ipcRenderer.sendToHost('set-error-text', text);
};

window.sendToHost = (msg, id, event, obj = undefined) => {
  if (!obj) {
    ipcRenderer.sendToHost(msg, id);
    return;
  }
  ipcRenderer.sendToHost(msg, id, obj);
};
