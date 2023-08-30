const { CharactersView } = require('./characters-view.js');
const { WindowNames } = require('../scripts/constants/window-names.js');

class CharactersController {
  constructor() {
    this.charactersView = new CharactersView(this);

    this._eventListener = this._eventListener.bind(this);

    this.displayMode = null;
    this.raidType = null;

    this.currentCharacter = '';
    window.loadCharacter = this.loadCharacter;

    const mainWindow = window;
    if (mainWindow.game.supportsGear()) {
      document.getElementById('rankings-tab').style.display = '';
      document.getElementById('gear-tab').style.display = '';

      let displayMode = mainWindow.storage.getVersionedStoredItem(
        'characterDisplayMode'
      );
      if (!displayMode) displayMode = 'rankings';
      else this.displayMode = displayMode;

      $('#' + displayMode + '-tab').addClass('selected');
    }

    if (
      mainWindow.game.prefix() == 'warcraft' &&
      mainWindow.storage.version() != 'classic'
    ) {
      document.getElementById('raids-tab').style.display = '';
      document.getElementById('dungeons-tab').style.display = '';

      let raidType =
        mainWindow.storage.getVersionedStoredItem('characterRaidType');
      if (!raidType) raidType = 'raids';
      else this.raidType = raidType;

      $('#' + raidType + '-tab').addClass('selected');
    }

    if (window.isLoggedIn === 'true') this.charactersView.onLoginSuccessful();
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

  loadCharacter(link) {
    this.currentCharacter = link;

    let src = link + '?';
    if (this.displayMode) src += 'displayMode=' + this.displayMode + '&';
    if (this.raidType == 'dungeons') src += 'zone=20';

    document.getElementById('character-frame').setAttribute('src', src);
  }

  loadCharacterById(id) {
    let link = mainWindow.game.origin() + '/character/id/' + id;
    this.currentCharacter = link;

    let src = link + '?';
    if (this.displayMode) src += 'displayMode=' + this.displayMode + '&';
    if (this.raidType == 'dungeons') src += 'zone=20';

    document.getElementById('character-frame').setAttribute('src', src);
  }

  _eventListener(eventName, data) {
    switch (eventName) {
      case 'windowClosed': {
        if (
          data == WindowNames.CHARACTERS ||
          data == WindowNames.CHARACTERS_IN_GAME
        )
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
        this.charactersView.onLoginSuccessful();
        break;
      }

      case 'loggedOut': {
        this.charactersView.loggedOut();
        break;
      }

      case 'reportsUpdated': {
        this.charactersView.reportsUpdated(data);
        break;
      }

      case 'charactersUpdated': {
        this.charactersView.charactersUpdated(data);
        break;
      }
    }
  }
}

module.exports = {
  CharactersController,
};
