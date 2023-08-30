const { ReportsView } = require('./reports-view.js');
const { WindowNames } = require('../scripts/constants/window-names.js');

class ReportsController {
  constructor() {
    window._controller = this;

    this.reportsView = new ReportsView(this);

    this._eventListener = this._eventListener.bind(this);

    if (window.isLoggedIn === 'true') this.reportsView.onLoginSuccessful();
  }

  windowClosed() {
    const mainWindow = window;
    if (mainWindow) mainWindow.eventBus.removeListener(this._eventListener);
  }

  run() {
    // listen to events from the event bus from the main window,
    // the callback will be run in the context of the current window
    const mainWindow = window;
    mainWindow.eventBus.addListener(this._eventListener);
  }

  loadReport(code) {
    let link = mainWindow.game.origin() + '/reports/' + code + '#fight=last"';

    if (this._selectedReport == code) {
      setTimeout(() => {
        document.getElementById('report-frame').src = link;
      }, 10);
      return;
    }

    this._selectedReport = code;
    document.getElementById('report-frame').src = link;
  }

  _eventListener(eventName, data) {
    switch (eventName) {
      case 'windowClosed': {
        if (data == WindowNames.REPORTS || data == WindowNames.REPORTS_IN_GAME)
          this.windowClosed();
        break;
      }

      case 'reload': {
        const mainWindow = window;
        if (mainWindow) mainWindow.eventBus.removeListener(this._eventListener);
        window.location.reload();
        break;
      }

      case 'loggedIn': {
        this.reportsView.onLoginSuccessful();
        break;
      }

      case 'loggedOut': {
        this.reportsView.loggedOut();
        break;
      }

      case 'reportsUpdated': {
        this.reportsView.reportsUpdated(data);
        break;
      }
    }
  }
}

module.exports = {
  ReportsController,
};
