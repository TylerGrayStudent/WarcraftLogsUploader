const UIDelegate = {
  trans: (txt) => window.lang.trans(txt),
  setErrorText: (txt) => window.eventBus.trigger('setErrorText', txt),
  setWarningText: (txt) => window.eventBus.trigger('setWarningText', txt),
  logToDebugPanel: (txt) => console.log(txt),
  setStatusText: (txt) => {}, // noop per original
  updateProgress: (pct, id) =>
    window.eventBus.trigger('updateProgress', { pct, id }),
  setProgressStatusText: (text, id) =>
    window.eventBus.trigger('setProgressStatusText', { text, id }),
  setUploadProgressContainer: (b) =>
    window.eventBus.trigger('setUploadProgressContainer', b),
  setCancelButtonVisible: (visible) =>
    window.eventBus.trigger('setCancelButtonVisible', visible),
  showLogPage: (page) => window.eventBus.trigger('showLogPage', page),
  cancelOrFinish: (reportPage) =>
    window.eventBus.trigger('cancelOrFinish', reportPage),
  logFileReadyForDisposal: (file) =>
    window.eventBus.trigger('logFileReadyForDisposal', file),
  setLastReportCode: (reportCode) =>
    window.eventBus.trigger('setLastReportCode', reportCode),
  logScanCompleted: (collectedScannedRaids, logVersion) =>
    window.eventBus.trigger('logScanCompleted', {
      collectedScannedRaids,
      logVersion,
    }),
  doneProcessing: () => window.doneProcessing(),
};

module.exports = { UIDelegate };
