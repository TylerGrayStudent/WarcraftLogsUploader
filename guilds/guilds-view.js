const { BaseAppView } = require('../base-app-view.js');

class GuildsView extends BaseAppView {
  constructor(controller) {
    super();

    this.onSearchSubmit = this.onSearchSubmit.bind(this);
    this._controller = controller;

    this._mainWindow = window;

    this._selectedVersion = this._mainWindow.storage.version();
    this._selectedLanguage = this._mainWindow.lang.language();

    document
      .getElementById('user-guilds')
      .addEventListener('click', this.loadUserGuildByTarget.bind(this));
    document
      .getElementById('search-form')
      .addEventListener('submit', this.onSearchSubmit);
    document
      .getElementById('searchbutton-mini')
      .addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('search-form').requestSubmit();
      });
  }

  onSearchSubmit(e) {
    e.preventDefault();
    document.getElementById('guild-frame').src =
      this._mainWindow.game.origin() +
      `/search?type=guilds&term=${e.target.elements[0].value}`;
  }

  onLoginSuccessful() {
    document.getElementById('user-guilds').innerHTML =
      this._mainWindow._controller.buildGuildsViewList();
  }

  loggedOut() {
    document.getElementById('user-guilds').innerHTML = '';
  }

  loadUserGuildByTarget(event) {
    let node = event.target;
    let guildAttr = node.getAttribute('guildid');
    while (guildAttr === null && node) {
      node = node.parentNode;
      if (!node) break;
      guildAttr = node.getAttribute('guildid');
    }
    if (guildAttr !== null) {
      this._controller.loadGuildById(guildAttr);
    }
  }
}

module.exports = {
  GuildsView,
};
