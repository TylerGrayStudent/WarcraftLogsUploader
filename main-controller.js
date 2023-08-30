class MainController {
  constructor(backgroundController) {
    this._mainWindow = window;
    this._backgroundController = backgroundController;
    this._eventListener = this._eventListener.bind(this);
    this.run = this.run.bind(this);
  }

  _eventListener(eventName, data) {
    switch (eventName) {
      case 'autoLoginFailed': {
        this.mainView.fillInLoginForm();
        break;
      }

      case 'loginFailed': {
        this.mainView.onLoginFailed(data);
        break;
      }

      case 'loggedIn': {
        this.mainView.onLoginSuccessful(data);
        window.isLoggedIn = 'true';
        break;
      }

      case 'cancelOrFinish': {
        this.mainView.onCancelOrFinish(data);
        break;
      }

      case 'logFileReadyForDisposal': {
        this.mainView.onLogFileReadyForDisposal(data);
        break;
      }

      case 'loggedOut': {
        this.mainView.loggedOut();
        window.isLoggedIn = 'false';
        break;
      }

      case 'reload': {
        this._mainWindow.eventBus.removeListener(this._eventListener);
        window.location.reload();
        break;
      }

      case 'setWarningText': {
        this.mainView.setWarningText(data);
        break;
      }

      case 'setErrorText': {
        this.mainView.setErrorText(data);
        break;
      }

      case 'updateProgress': {
        const { pct, id } = data;
        this.mainView.updateProgress(pct, id);
        break;
      }

      case 'setProgressStatusText': {
        const { text, id } = data;
        this.mainView.setProgressStatusText(text, id);
        break;
      }

      case 'setUploadProgressContainer': {
        this.mainView.setUploadProgressContainer(data);
        break;
      }

      case 'setCancelButtonVisible': {
        this.mainView.setCancelButtonVisible(data);
        break;
      }

      case 'showLogPage': {
        this.mainView.showLogPage(data);
        break;
      }

      case 'setLastReportCode': {
        this.mainView.setLastReportCode(data);
        break;
      }

      case 'logScanCompleted': {
        const { collectedScannedRaids, logVersion } = data;
        this.mainView.onLogScanCompleted(collectedScannedRaids, logVersion);
        break;
      }

      case 'deletionSucceeded': {
        this.mainView.showDeletionSucceededMessage();
        break;
      }

      case 'deletionFailed': {
        this.mainView.showDeletionFailedMessage();
        break;
      }

      case 'archivalSucceeded': {
        this.mainView.showArchivalSucceededMessage();
        break;
      }

      case 'archivalFailed': {
        this.mainView.showArchivalFailedMessage();
        break;
      }

      case 'setLogDirectory': {
        this.mainView
          .setLogDirectory(data.directoryUploadName, data.updateFileInputs)
          .catch(console.warn);
        break;
      }
    }
  }

  run() {
    this.mainView = new MainView(this._mainWindow, this._backgroundController);
    this._mainWindow.eventBus.addListener(this._eventListener);
    if (loggedIn === 1) {
      this.mainView.onLoginSuccessful(guildsAndCharacters);
    } else if (loggedIn === 0) {
      this.mainView.fillInLoginForm();
    }
  }
}

module.exports = { MainController: MainController };
