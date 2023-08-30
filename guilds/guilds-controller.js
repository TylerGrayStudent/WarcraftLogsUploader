const { GuildsView } = require('./guilds-view.js');
const { WindowNames } = require('../scripts/constants/window-names.js');

class GuildsController {
  constructor() {
    this.guildsView = new GuildsView(this);

    this._eventListener = this._eventListener.bind(this);

    this.currentGuild = '';

    window.loadGuild = this.loadGuild;

    if (window.isLoggedIn === 'true') this.guildsView.onLoginSuccessful();
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

  loadGuild(link) {
    this.currentGuild = link;
    document.getElementById('guild-frame').setAttribute('src', link);
  }

  loadGuildById(id) {
    let link = mainWindow.game.origin() + '/guild/id/' + id;
    document.getElementById('guild-frame').setAttribute('src', link);
  }

  _eventListener(eventName, data) {
    switch (eventName) {
      case 'windowClosed': {
        if (data == WindowNames.GUILDS || data == WindowNames.GUILDS_IN_GAME)
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
        this.guildsView.onLoginSuccessful();
        break;
      }

      case 'loggedOut': {
        this.guildsView.loggedOut();
        break;
      }
    }
  }
}

module.exports = {
  GuildsController,
};
