const { BaseAppView } = require('../base-app-view.js');

class CharactersView extends BaseAppView {
  constructor(controller) {
    super();
    this.onSearchSubmit = this.onSearchSubmit.bind(this);
    this._controller = controller;

    this._mainWindow = window;

    this._selectedVersion = this._mainWindow.storage.version();
    this._selectedLanguage = this._mainWindow.lang.language();

    document
      .getElementById('user-characters')
      .addEventListener('click', this.loadUserCharacterByTarget.bind(this));
    document
      .getElementById('recent-characters')
      .addEventListener('click', this.loadRecentCharacterByTarget.bind(this));
    document
      .getElementById('rankings-tab')
      .addEventListener('click', this.rankingsClicked.bind(this));
    document
      .getElementById('gear-tab')
      .addEventListener('click', this.gearClicked.bind(this));
    document
      .getElementById('raids-tab')
      .addEventListener('click', this.raidsClicked.bind(this));
    document
      .getElementById('dungeons-tab')
      .addEventListener('click', this.dungeonsClicked.bind(this));
    document
      .getElementById('search-form')
      .addEventListener('submit', this.onSearchSubmit, true);
    document
      .getElementById('searchbutton-mini')
      .addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('search-form').requestSubmit();
      });
  }

  onSearchSubmit(e) {
    e.preventDefault();
    document.getElementById('character-frame').src =
      this._mainWindow.game.origin() +
      `/search?type=characters&term=${e.target.elements[0].value}`;
  }

  onLoginSuccessful() {
    document.getElementById('user-characters').innerHTML =
      this._mainWindow._controller.buildCharacterListFromJSON();
    this._mainWindow.loadRecentReports();
  }

  loggedOut() {
    document.getElementById('user-characters').innerHTML = '';
  }

  loadUserCharacterByTarget(event) {
    let node = event.target;
    let charAttr = node.getAttribute('characterid');
    while (charAttr === null && node) {
      node = node.parentNode;
      if (!node) break;
      charAttr = node.getAttribute('characterid');
    }
    if (charAttr !== null) {
      this._controller.loadCharacterById(charAttr);
    }
  }

  loadRecentCharacterByTarget(event) {
    let node = event.target;
    let charAttr = node.getAttribute('linkid');
    while (charAttr === null && node) {
      node = node.parentNode;
      if (!node) break;
      charAttr = node.getAttribute('linkid');
    }
    if (charAttr !== null) {
      this._controller.loadCharacter(charAttr);
    }
  }

  reportsUpdated(reports) {
    if (reports.length)
      this._mainWindow.loadCharactersForReport(reports[0].code);
  }

  charactersUpdated(data) {
    let characters = data.characters.sort((a, b) => {
      return ('' + a.name).localeCompare(b.name);
    });
    if (!characters || !characters.length) return;
    let charResult = '';

    for (let i = 0; i < characters.length; ++i) {
      let character = characters[i];
      charResult += '<div id="recent-character" class="';
      charResult += character.className + '" linkid="';
      let link =
        mainWindow.game.origin() +
        '/character/' +
        data.region +
        '/' +
        (character.slug ? character.slug : character.server) +
        '/' +
        character.name;

      charResult += link + '">';
      charResult += character.name + '</div>';
    }
    document.getElementById('recent-characters-contents').innerHTML =
      charResult;
  }

  rankingsClicked(evt) {
    $('#rankings-tab').addClass('selected');
    $('#gear-tab').removeClass('selected');
    this._controller.displayMode = 'rankings';
    if (this._controller.currentCharacter)
      this._controller.loadCharacter(this._controller.currentCharacter);
    let mainWindow = overwolf.windows.getMainWindow();
    mainWindow.storage.setVersionedStoredItem(
      'characterDisplayMode',
      'rankings'
    );
  }

  gearClicked(evt) {
    $('#gear-tab').addClass('selected');
    $('#rankings-tab').removeClass('selected');
    this._controller.displayMode = 'gear';
    if (this._controller.currentCharacter)
      this._controller.loadCharacter(this._controller.currentCharacter);
    let mainWindow = overwolf.windows.getMainWindow();
    mainWindow.storage.setVersionedStoredItem('characterDisplayMode', 'gear');
  }

  raidsClicked(evt) {
    $('#raids-tab').addClass('selected');
    $('#dungeons-tab').removeClass('selected');
    this._controller.raidType = 'raids';
    if (this._controller.currentCharacter)
      this._controller.loadCharacter(this._controller.currentCharacter);
    let mainWindow = overwolf.windows.getMainWindow();
    mainWindow.storage.setVersionedStoredItem('characterRaidType', 'raids');
  }

  dungeonsClicked(evt) {
    $('#dungeons-tab').addClass('selected');
    $('#raids-tab').removeClass('selected');
    this._controller.raidType = 'dungeons';
    if (this._controller.currentCharacter)
      this._controller.loadCharacter(this._controller.currentCharacter);
    let mainWindow = overwolf.windows.getMainWindow();
    mainWindow.storage.setVersionedStoredItem('characterRaidType', 'dungeons');
  }
}

module.exports = {
  CharactersView,
};
