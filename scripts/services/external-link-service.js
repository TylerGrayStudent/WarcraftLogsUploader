class ExternalLinkService {
  openInBrowser(url, inGame) {
    require('electron').shell.openExternal(url);
  }
}

module.exports = { ExternalLinkService };
