const { dialog } = require('@electron/remote');
const { BaseAppView } = require('./base-app-view');
const { AdService } = require('./scripts/services/ad-service');
const {
  ExternalLinkService,
} = require('./scripts/services/external-link-service');
const path = require('path');

function MainViewBuilder() {
   
function printDuration(duration) {
  duration = Math.floor(duration / 1000);
  var result = '';
  var hours = Math.floor(duration / 3600);
  var minutes = Math.floor((duration % 3600) / 60);
  var seconds = duration % 60;
  var putZeroInMinutes = false;
  if (hours > 0) {
    putZeroInMinutes = true;
    result += hours + ':';
  }
  result +=
    (putZeroInMinutes && minutes < 10 ? '0' : '') +
    minutes +
    ':' +
    (seconds < 10 ? '0' : '') +
    seconds;
  return result;
}

function printDate(time) {
  var date = new Date(time);
  return date.toLocaleString();
}

function shortenPathString(pathString) {
  return pathString.split('\\').pop().split('/').pop();
}

function optionHovered(lang, collectedScannedRaids, evt) {
  var raid = collectedScannedRaids[evt.target.value];
  var details = document.getElementById('fight-details');
  var result = '<b>' + htmlEntities(raid.name) + '</b><br>';
  result +=
    '<b>' + lang.trans('date_label') + '</b> ' + printDate(raid.start) + '<br>';
  result +=
    '<b>' +
    lang.trans('duration_label') +
    '</b> ' +
    printDuration(raid.end - raid.start) +
    '<br>';

  result += '<b>' + lang.trans('friendlies_label') + '</b> ';
  for (var i = 0; i < raid.friendlies.length; ++i) {
    if (i > 0) result += ', ';
    result += htmlEntities(raid.friendlies[i]);
  }
  result += '<br>';
  result += '<b>' + lang.trans('enemies_label') + '</b> ';
  for (var i = 0; i < raid.enemies.length; ++i) {
    if (i > 0) result += ', ';
    result += htmlEntities(raid.enemies[i]);
  }
  result += '<br>';
  details.innerHTML = result;
}

function htmlEntities(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function optionUnhovered(lang, evt) {
  var details = document.getElementById('fight-details');
  details.innerHTML = lang.trans('fight_details');
}

class MainView extends BaseAppView {
  constructor(mainWindow) {
    super();
    this.debugMode = false;

    this._mainWindow = mainWindow;

    this._adService = AdService;
    this._externalLinkService = new ExternalLinkService();

    this._mainWindow.game.desktopContentLoaded?.(document);

    this._selectedVersion = this._mainWindow.storage.version();
    this._appVersion = this._mainWindow.storage.getStoredItem('appVersion');
    this._onboarded =
      this._mainWindow.storage.getStoredItem('onboarded') || !window.overwolf;
    const storedRegion = this._mainWindow.getRegion();
    if (storedRegion) {
      this._selectedRegion = storedRegion;
    }

    this._selectedTeam = 0;

    document.getElementById('help-link').addEventListener('click', (event) => {
      event.preventDefault();
      this._externalLinkService.openInBrowser(
        this._mainWindow.game.scheme() +
          '://' +
          this._mainWindow.game.host() +
          '/companion/help',
        window.inGame
      );
    });

    document
      .getElementById('livelog-link')
      ?.addEventListener('click', this.liveLogLinkClicked);
    document
      .getElementById('uploadlog-link')
      ?.addEventListener('click', this.uploadLogLinkClicked);
    document
      .getElementById('splitlog-link')
      ?.addEventListener('click', this.splitLogLinkClicked);

    document
      .getElementById('reports-link')
      ?.addEventListener('click', this.reportsLinkClicked);
    document
      .getElementById('characters-link')
      ?.addEventListener('click', this.charactersLinkClicked);
    document
      .getElementById('guilds-link')
      ?.addEventListener('click', this.guildsLinkClicked);

    document
      .getElementById('home-link')
      .addEventListener('click', this.homeButtonClicked);
    document
      .getElementById('settings-link')
      .addEventListener('click', this.settingsButtonClicked);
    document
      .getElementById('logout-link')
      .addEventListener('click', this.logOutButtonClicked);
    document
      .getElementById('logo-container')
      .addEventListener('click', this.homeButtonClicked);

    if (!window.overwolf) {
      $('#character-viewer-link').remove();
      $('#settings-link').remove(); // Maybe bring back if we get wipe calling working.
      $('#help-link').remove(); // Remove until we do an actual Electron help page.
      $('#viewliveloginappbutton')?.remove();
      $('#viewloginappbutton')?.remove();
      $('#reports-link').remove();
      $('#characters-link').remove();
      $('#guilds-link').remove();
      document.body.classList.add('electron');
    } else {
      const isGameRunning = this._mainWindow.isGameRunning;
      document.getElementById('app-version').style.display = isGameRunning
        ? ''
        : 'none';
      this._state = mainWindow.uiState;
      document
        .getElementById('explore-app-btn')
        ?.addEventListener('click', this.hideOnboarding);
      document
        .getElementById('return-to-game-btn')
        ?.addEventListener('click', this.returnToGame);
      document.body.classList.add('overwolf');
    }

    document
      .getElementById('login-form')
      .addEventListener('submit', this.loginFormSubmitted);

    document
      .getElementById('forgot-password-link')
      .addEventListener('click', (event) => {
        event.preventDefault();
        this._externalLinkService.openInBrowser(
          this._mainWindow.game.scheme() +
            '://' +
            this._mainWindow.game.host() +
            '/password/reset/',
          window.inGame
        );
      });
    document
      .getElementById('register-link')
      .addEventListener('click', (event) => {
        event.preventDefault();
        this._externalLinkService.openInBrowser(
          this._mainWindow.game.scheme() +
            '://' +
            this._mainWindow.game.host() +
            '/register/',
          window.inGame
        );
      });

    document
      .getElementById('versions-container')
      .addEventListener('click', this.selectVersionByTarget);
    document
      .getElementById('app-version')
      .addEventListener('click', this.selectAppVersionByTarget);

    document
      .getElementById('language-submenu')
      .addEventListener('click', this.selectLanguageByTarget, true);

    document
      .getElementById('file-chooser')
      .addEventListener('click', this.browseForFile);
    document
      .getElementById('directory-chooser')
      .addEventListener('click', this.browseForLiveLogLocation);
    document
      .getElementById('livelog-realtime-chooser')
      .addEventListener('change', (e) => {
        this._mainWindow.setUseRealTimeLiveLogging(e.target.checked);
      });
    document
      .getElementById('livelog-entirefile-chooser')
      .addEventListener('change', (e) => {
        this._mainWindow.setLiveLogEntireFile(e.target.checked);
      });
    document.getElementById('include-trash').addEventListener('change', (e) => {
      this._mainWindow.setIncludeTrashFights(e.target.checked);
    });
    document.getElementById('fight-chooser').addEventListener('change', (e) => {
      this._mainWindow.setChooseFightsToUpload(e.target.checked);
    });

    $('.privacy-option').on('click', this.setPrivacyByTarget);

    document
      .getElementById('guilds-teams-and-regions-container')
      .addEventListener('click', this.selectGuildOrRegionByTarget);

    document
      .getElementById('upload-button')
      .addEventListener('click', this.goButtonClicked);
    document
      .getElementById('cancelbutton')
      .addEventListener('click', this.cancelButtonClicked);

    document
      .getElementById('endlivelogbutton')
      .addEventListener('click', this.stopLiveLoggingSession);
    document
      .getElementById('viewlivelogbutton')
      .addEventListener('click', this.viewLog);
    document
      .getElementById('viewliveloginappbutton')
      ?.addEventListener('click', this.viewLogInApp);
    document
      .getElementById('viewloginappbutton')
      ?.addEventListener('click', this.viewLogInApp);
    document
      .getElementById('viewlogbutton')
      .addEventListener('click', this.viewLog);
    document
      .getElementById('deletelogbutton')
      .addEventListener('click', this.deleteLogFile);
    document
      .getElementById('archivelogbutton')
      .addEventListener('click', this.archiveLogFile);
    document
      .getElementById('donebutton')
      .addEventListener('click', this.doneButtonClicked);
    document
      .getElementById('confirm-deletion-button')
      .addEventListener('click', this.confirmDeletion);
    document
      .getElementById('cancel-deletion-button')
      .addEventListener('click', this.cancelDeletion);
    document
      .getElementById('confirm-archival-button')
      .addEventListener('click', this.confirmArchival);
    document
      .getElementById('cancel-archival-button')
      .addEventListener('click', this.cancelArchival);
    this._deletionArchivalUIOptions = document.getElementById(
      'deletion-archival-ui-options'
    );
    this._deletionArchivalUIOptionsDescription = document.getElementById(
      'deletion-archival-ui-options-description'
    );
    this._deletionArchivalUIDeletionOptions = document.getElementById(
      'deletion-archival-ui-deletion-options'
    );
    this._deletionArchivalUIArchivalOptions = document.getElementById(
      'deletion-archival-ui-archival-options'
    );
    this._deletionArchivalUIDeletionSuccessMessage = document.getElementById(
      'deletion-archival-ui-deletion-success-message'
    );
    this._deletionArchivalUIArchivalSuccessMessage = document.getElementById(
      'deletion-archival-ui-archival-success-message'
    );

    document
      .getElementById('fights-button')
      .addEventListener('click', this.fightsButtonClicked);
    document
      .getElementById('include-trash')
      .addEventListener('click', this.includeTrashChanged);

    const multipleVersions =
      Object.keys(this._mainWindow.game.versions()).length > 1;
    if (multipleVersions) {
      document.getElementById('versions-container').style.display = '';
    }

    window.updateProgress = this.updateProgress;
  }

  updateProgress = (percent, bar) => {
    const el = document.getElementById(bar);
    if (!el) return;

    const barInterior = el.firstChild;
    if (barInterior) barInterior.style.width = percent + '%';

    const barNumber = document.getElementById(bar + '-number');
    if (barNumber) barNumber.innerHTML = '(' + percent + '%)';
  };

  setUploadProgressContainer = (visible) => {
    const container = document.getElementById('upload-progress-container');
    if (!container) {
      return;
    }
    container.style.visibility = visible ? '' : 'hidden';
  };

  onLoginFailed = (error) => {
    this.resetLoginButton();
    this._mainWindow.setErrorText(error);
  };

  onLoginSuccessful = (user) => {
    this.resetLoginButton();

    this._guildHTML = this._mainWindow._controller.buildGuildListFromJSON();

    if (user.regions.length === 1) {
      this.selectRegion(user.regions[0].id, true);
    }

    const regionHasAlreadyBeenSaved =
      this._mainWindow.storage.getVersionedStoredItem('region') !== null;
    if (!regionHasAlreadyBeenSaved && user.preferredRegion) {
      this.selectRegion(user.preferredRegion.id, true);
    }

    if (user && user.isSubscribed) {
      this._adService.disableAds();
    } else {
      this._adService.enableAds();
    }

    this._mainWindow.canUseRealTimeLiveLogging = user.canUseRealTimeLiveLogging;

    if (this._onboarded) {
      this.setTabbedViewVisibility(true);
    } else {
      this.showOnboarding();
    }

    if (this._mainWindow._shouldLoadUiState) {
      this.loadUiState();
      this._mainWindow._shouldLoadUiState = false;
    } else {
      this._state?.clear();
    }
    this.setActiveTab(this._mainWindow.activeTab);
  };

  setLastReportCode = (reportCode) => {
    this._mainWindow.lastReportCode = reportCode;
  };

  setLogPage = (logPage) => {
    this.debugMode && console.log('setLogPage', logPage);
    this._mainWindow.setCurrentLogPage(logPage);
    this.showLogPage(logPage);
  };

  showLogPage = (logPage) => {
    this.debugMode && console.log('showLogPage', logPage);
    const reportPages = ['upload', 'progress', 'fights', 'deletion-archival'];
    reportPages.forEach((page) => {
      const e = document.getElementById('report-' + page + '-page');
      if (!e) return;
      e.style.display = logPage === page ? 'block' : 'none';
    });
    document.getElementById('upload-button').disabled = false;
    document.getElementById('reportcontent').style.display = '';
    document.getElementById('upload-button').innerHTML =
      this._mainWindow.lang.trans('go_button');
    document.getElementById('fights-button').innerHTML =
      this._mainWindow.lang.trans('go_button');

    if (logPage === 'fights') {
      this.rebuildFights();
    }

    if (logPage === 'deletion-archival') {
      this.showLogDeletionAndArchivalControls();
    }
  };

  showLogPageControls = (reportTab) => {
    this.debugMode && console.log('showLogPageControls', reportTab);

    const isUpload = reportTab === 'uploadlog';
    const isLiveLog = reportTab === 'livelog';
    const isSplit = reportTab === 'splitlog';
    if (!(isUpload || isLiveLog || isSplit)) return;

    this.buildGuilds();

    let visibility = parseInt(
      this._mainWindow.defaultReportVisibility || '0',
      10
    );
    this.selectPrivacy(visibility);

    const checkboxes = {
      'fight-chooser': this._mainWindow.chooseFightsToUpload,
      'include-trash': this._mainWindow.includeTrashFights,
      'livelog-entirefile-chooser': this._mainWindow.liveLogEntireFile,
      'livelog-realtime-chooser': this._mainWindow.useRealTimeLiveLogging,
    };
    for (const [k, v] of Object.entries(checkboxes)) {
      const e = document.getElementById(k);
      if (!e) continue;
      e.checked = Boolean(v === '1');
    }

    let regionID = this._mainWindow.getRegion();
    if (regionID > 0 && !this._mainWindow.game.defaultRegion())
      this.selectRegion(regionID, false);

    $('#guilds-and-privacy-menu').smartmenus('refresh');

    const elements = {
      'description-container': isLiveLog || isUpload,
      'directory-chooser-description': isLiveLog,
      'directory-chooser-row': isLiveLog,
      endlivelogbutton: isLiveLog,
      'fight-chooser-container': isUpload,
      'file-chooser-description': isUpload,
      'file-chooser-row': isUpload || isSplit,
      'guild-chooser-description': isLiveLog || isUpload,
      'guilds-and-privacy-menu': isLiveLog || isUpload,
      'livelog-entirefile-container': isLiveLog,
      'livelog-progress-status': isLiveLog,
      'livelog-realtime-container':
        isLiveLog && this._mainWindow.canUseRealTimeLiveLogging,
      'logfile-progress-container': isUpload || isSplit,
      'split-file-chooser-description': isSplit,
      'view-report-container': isLiveLog || isUpload,
      'view-report-description': isLiveLog || isUpload,
      viewlivelogbutton: isLiveLog,
      viewliveloginappbutton: isLiveLog,

      // TODO: Need to always hide when switching?
      // 'upload-progress-container': false,
    };

    for (const [k, v] of Object.entries(elements)) {
      const e = document.getElementById(k);
      if (!e) continue;
      e.style.display = v ? '' : 'none';
    }
    this.showLogPage(this._mainWindow.currentLogPage);

    if (isSplit) {
      $('#upload-container').addClass('logs-split-log');
    } else {
      $('#upload-container').removeClass('logs-split-log');
    }
  };

  buildGuilds = () => {
    document.getElementById('guilds-teams-and-regions-container').innerHTML =
      this._guildHTML;

    $('#guilds-and-privacy-menu').smartmenus('refresh');

    let guildID = this._mainWindow.guildID
      ? parseInt(this._mainWindow.guildID)
      : 0;
    let teamID = this._mainWindow.teamID
      ? parseInt(this._mainWindow.teamID)
      : 0;
    this.selectGuild(guildID);
    this.selectTeam(teamID);

    if (!this._selectedRegion) {
      const firstRegion = parseInt($('a[regionid]:first').attr('regionid'));
      if (!isNaN(firstRegion)) {
        this._selectedRegion = firstRegion;
      }
    }
    this.selectRegion(this._selectedRegion, false);
  };

  selectPrivacy = (setting) => {
    let privacyElt = document.getElementById('privacy-' + setting);
    if (privacyElt)
      $('#privacy-selection-text').html(
        privacyElt.firstChild.nextSibling.textContent
      );
    this._selectedPrivacy = setting;
  };

  selectRegion = (regionID, persistRegion) => {
    $('#regions-selection-text').html($('#region-' + regionID).html());

    this._selectedRegion = regionID;

    if (persistRegion) this._mainWindow.setRegion(regionID);
  };

  selectTeam = (teamID) => {
    if (this._selectedGuild === 0) return;

    $('#teams-' + this._selectedGuild + ' .team-selection-text').html(
      $('#teams-' + this._selectedGuild + '-' + teamID).html()
    );

    this._mainWindow.storage.setVersionedStoredItem('team', teamID);

    this._selectedTeam = teamID;
  };

  selectGuild = (guildID) => {
    if (this._selectedGuild !== undefined) {
      // Hide that guild's raid teams.
      if (this._selectedGuild > 0) {
        document.getElementById('teams-' + this._selectedGuild).style.display =
          'none';
        this.selectTeam(0);
      }
    }

    if (document.getElementById('guild-' + guildID)) {
      document.getElementById('guild-selection-text').innerHTML =
        document.getElementById('guild-' + guildID).innerHTML;
      this._mainWindow.storage.setVersionedStoredItem('guild', guildID);
      this._selectedGuild = guildID;
    }

    if (this._selectedGuild === 0 && document.getElementById('regions')) {
      document.getElementById('regions').style.display = '';
    } else {
      if (document.getElementById('regions')) {
        document.getElementById('regions').style.display = 'none';
      }

      if (document.getElementById('teams-' + this._selectedGuild)) {
        // Show this guild's teams.
        document.getElementById('teams-' + this._selectedGuild).style.display =
          '';
      }

      this.selectTeam(0);
    }
  };

  selectGuildOrRegionByTarget = (event) => {
    var node = event.target;
    var guildAttr = node.getAttribute('guildid');
    var regionAttr = node.getAttribute('regionid');
    var teamAttr = node.getAttribute('teamid');
    while (
      guildAttr === null &&
      regionAttr === null &&
      teamAttr === null &&
      node
    ) {
      node = node.parentNode;
      // The node can end up being the document
      if (!node || node.getAttribute === undefined) break;
      guildAttr = node.getAttribute('guildid');
      regionAttr = node.getAttribute('regionid');
      teamAttr = node.getAttribute('teamid');
    }
    if (guildAttr !== null) this.selectGuild(parseInt(guildAttr));
    else if (regionAttr !== null) this.selectRegion(parseInt(regionAttr), true);
    else if (teamAttr !== null) this.selectTeam(parseInt(teamAttr));

    $('#guilds-and-privacy-menu').smartmenus('refresh');
  };

  setFileDisplay = (str, id) => {
    if (!str) str = '';

    if (str.length > 70)
      str =
        str.substring(0, 10) +
        '...' +
        str.substring(str.length - 50, str.length);

    document.getElementById(id).innerText = str;
  };

  setProgressStatusText = (text, id) => {
    this._mainWindow.progressStatusText = text;
    this._mainWindow.progressStatusTextElementId = id;

    document.getElementById(id).innerHTML = text;
  };

  setErrorText = (text) => {
    this._mainWindow.errorText = text;
    document.getElementById('upload-button').disabled = false;

    let errorBlock = document.getElementById('errorblock');
    if (text === '') errorBlock.style.display = 'none';
    else errorBlock.style.display = 'block';

    document.getElementById('errortext').innerHTML = text;
    document.body.offsetWidth;
  };

  setWarningText = (text) => {
    this._mainWindow.warningText = text;

    let errorBlock = document.getElementById('warningblock');
    if (text === '') errorBlock.style.display = 'none';
    else errorBlock.style.display = 'block';

    document.getElementById('warningtext').innerHTML = text;
    document.body.offsetWidth;
  };

  includeTrashChanged = () => {
    this.rebuildFights();
  };

  rebuildFights = () => {
    const { logVersion, collectedScannedRaids } = this._mainWindow;
    if (!collectedScannedRaids) {
      console.warn('Missing collectedScannedRaids?');
      return;
    }
    const game = this._mainWindow.game;
    const fightList = document.getElementById('fights-list');
    fightList.innerHTML = '';
    const includeTrash = document.getElementById('include-trash').checked;
    this._mainWindow.setIncludeTrashFights(includeTrash);
    for (let i = 0; i < collectedScannedRaids.length; ++i) {
      if (!includeTrash && collectedScannedRaids[i].boss === 0) continue;
      const option = document.createElement('option');
      option.value = i;
      option.onmouseover = optionHovered.bind({}, lang, collectedScannedRaids);
      option.onmouseout = optionUnhovered.bind({}, lang);
      let name = collectedScannedRaids[i].name;
      if (collectedScannedRaids[i].boss > 0) {
        name +=
          ' ' +
          game.nameForDifficulty(
            collectedScannedRaids[i].difficulty,
            logVersion
          );
        option.setAttribute('class', 'Boss');
        if (game.separatesWipesAndKills()) {
          if (!collectedScannedRaids[i].success)
            name += ' ' + this._mainWindow.lang.trans('wipe');
          else name += ' ' + this._mainWindow.lang.trans('kill');
          if (collectedScannedRaids[i].pulls > 1)
            name += 's (' + collectedScannedRaids[i].pulls + ')';
        } else name += ' (' + collectedScannedRaids[i].pulls + ')';
      } else option.setAttribute('class', 'NPC');
      option.text = htmlEntities(name);
      fightList.add(option, null);
    }
  };

  setCancelButtonVisible = (visible) => {
    let cancelButton = document.getElementById('cancelbutton');
    if (!visible) cancelButton.style.display = 'none';
    else cancelButton.style.display = 'inline-block';
  };

  setStatusText = (text, hideSpinny) => {};

  onLogFileReadyForDisposal = (logFile) => {
    this._mainWindow.setCurrentLogFile(logFile);
    this.setLogPage('deletion-archival');
  };

  onCancelOrFinish = (logPage) => {
    this._mainWindow.doneProcessing();
    this.setStatusText('');
    this.setCancelButtonVisible(false);
    this.setLogPage(logPage);
  };

  onLogScanCompleted = (collectedScannedRaids, logVersion) => {
    this._mainWindow.setCollectedScannedRaids(collectedScannedRaids);
    this._mainWindow.setLogVersion(logVersion);
    this.setLogPage('fights');
  };

  showLogDeletionAndArchivalControls = () => {
    const { currentLogFile } = this._mainWindow;
    this.debugMode &&
      console.log('showLogDeletionAndArchivalControls', currentLogFile);
    document.getElementById('deletion-archival-ui').style.display = 'none';

    if (currentLogFile) {
      const fileName = shortenPathString(currentLogFile);
      document.getElementById('deletion-archival-ui').style.display = '';
      document.getElementById('deletelogbutton').innerHTML =
        'Delete ' + fileName;
      document.getElementById('archivelogbutton').innerHTML =
        'Archive ' + fileName;

      this._deletionArchivalUIDeletionOptions.style.display = 'none';
      this._deletionArchivalUIArchivalOptions.style.display = 'none';
      this._deletionArchivalUIDeletionSuccessMessage.style.display = 'none';
      this._deletionArchivalUIArchivalSuccessMessage.style.display = 'none';
      this._deletionArchivalUIOptions.style.display = 'block';
      this._deletionArchivalUIOptionsDescription.innerText =
        this._mainWindow.lang.trans('delete_or_archive_desc');
    }
  };

  fillInLoginForm = () => {
    this._adService.disableAds();
    document.getElementById('startup-panel').style.display = 'none';
    document.getElementById('logincontent').style.display = '';
    document.getElementById('email').value = this._mainWindow.userName;

    if (!this._mainWindow.userName) {
      document.getElementById('email').focus();
      document.getElementById('email').select();
    } else document.getElementById('password').focus();
  };

  resetLoginButton = () => {
    document.getElementById('login-button').innerHTML =
      this._mainWindow.lang.trans('login');
  };

  loggedOut = () => {
    this.setTabbedViewVisibility(false);
    document.getElementById('logout-link').style.display = 'none';
    document.getElementById('logincontent').style.display = '';
    document.getElementById('reportcontent').style.display = 'none';
    this.fillInLoginForm();

    this._state?.clear();
  };

  homeButtonClicked = async (evt) => {
    this.debugMode && console.log('homeButtonClicked');
    evt.preventDefault();
    await this.cancelOperationInProgress(true);
  };

  doneButtonClicked = async (evt) => {
    this.debugMode && console.log('doneButtonClicked');
    evt.preventDefault();
    await this._mainWindow.cancelUploadOrLiveLog();
    this.setLogPage('upload');
  };

  liveLogLinkClicked = async () => {
    if (
      this._mainWindow.tabWithOperationInProgress !== 'livelog' &&
      !(await this.cancelOperationInProgress(true))
    ) {
      return;
    }
    this.setActiveTab('livelog');
  };

  uploadLogLinkClicked = async () => {
    if (
      this._mainWindow.tabWithOperationInProgress !== 'uploadlog' &&
      !(await this.cancelOperationInProgress(true))
    ) {
      return;
    }
    this.setActiveTab('uploadlog');
  };

  splitLogLinkClicked = async () => {
    if (
      this._mainWindow.tabWithOperationInProgress !== 'splitlog' &&
      !(await this.cancelOperationInProgress(true))
    ) {
      return;
    }
    this.setActiveTab('splitlog');
  };

  settingsButtonClicked = () => {
    if ($('.settings').length || !window.overwolf) return;

    window.overwolf.settings.getExtensionSettings(async (result) => {
      if (!result.success) return;

      const settings = { ...result.settings };

      const settingsElement = $(`
<div class="settings ${window.inGame ? 'ingame' : ''}">
  <div class="settings__options">
    <a href="overwolf://settings/games-overlay?gameId=${this._mainWindow.game.currentOverwolfGameId()}&hotkey=unknown">
      <button name="change-hotkeys">${this._mainWindow.lang.trans(
        'change_hotkeys'
      )}</button>
    </a>
    <label for="change-hotkeys">${this._mainWindow.lang.trans(
      'change_hotkeys_description'
    )}</label>
    <a href="overwolf://settings/games-overlay?gameId=${this._mainWindow.game.currentOverwolfGameId()}&hotkey=unknown">
      <button name="auto-launch">${this._mainWindow.lang.trans(
        'change_auto_launch'
      )}</button>
    </a>
    <span>${this._mainWindow.lang.trans(
      'change_auto_launch_description'
    )}</span>
    <div class="settings__close-overwolf-control">
      <input type="checkbox" name="close-overwolf" ${
        settings.exit_overwolf_on_exit ? 'checked' : ''
      } />
      <label for="close-overwolf"></label>
    </div>
    <span>${this._mainWindow.lang.trans('close_overwolf_description')}</span>
  </div>
  <div>
    <button class="big-button settings__done-button">${this._mainWindow.lang.trans(
      'done_button'
    )}</button>
  </div>
</div>`);

      $('body').append(settingsElement);
      await this._adService.pauseAds();

      const closeOverwolfControlElement = $(
        '.settings__close-overwolf-control'
      );
      closeOverwolfControlElement.on('click', async () => {
        settings.exit_overwolf_on_exit = !settings.exit_overwolf_on_exit;

        window.overwolf.settings.setExtensionSettings(
          { ...settings },
          (result) => {
            if (!result.success) {
              console.error(result);
              return;
            }

            if (settings.exit_overwolf_on_exit) {
              closeOverwolfControlElement.find('input').attr('checked', true);
            } else {
              closeOverwolfControlElement.find('input').removeAttr('checked');
            }
          }
        );
      });

      $('.settings__done-button').on('click', async () => {
        settingsElement.remove();
        await this._adService.resumeAds();
      });
    });
  };

  logOutButtonClicked = async (evt) => {
    evt.preventDefault();
    if (!(await this.cancelOperationInProgress(true))) return;
    await this._mainWindow.logOut();
  };

  loginFormSubmitted = (evt) => {
    this._mainWindow.setErrorText('');

    evt.stopPropagation();
    evt.preventDefault();

    let email = document.getElementById('email').value;
    let password = document.getElementById('password').value;
    if (email === '' || password === '') {
      this._mainWindow.setErrorText(
        this._mainWindow.lang.trans('missing_user_or_password')
      );
      return;
    }

    let spinnyPath = document.getElementById('button-spinny').src;
    document.getElementById('login-button').innerHTML =
      '<img id="button-spinny" src="' + spinnyPath + '">';
    this._mainWindow.logIn(email, password);
  };

  selectVersion = (versionID) => {
    if (this._selectedVersion !== '')
      document
        .getElementById('version-' + this._selectedVersion)
        .removeAttribute('selected');

    document
      .getElementById('version-' + versionID)
      .setAttribute('selected', 'true');

    this._selectedVersion = versionID;
  };

  selectVersionByTarget = async (event) => {
    var node = event.target;
    var versionAttr = node.getAttribute('versionid');
    while (versionAttr === null && node) {
      node = node.parentNode;
      if (node && node.getAttribute)
        versionAttr = node.getAttribute('versionid');
    }
    if (versionAttr !== null) {
      if (!(await this.cancelOperationInProgress(true))) return;
      this.selectVersion(versionAttr);
      this._mainWindow.setVersion(this._selectedVersion);
    }
  };

  selectAppVersion = (appVersion) => {
    this._appVersion = appVersion;
  };

  selectAppVersionByTarget = async (event) => {
    if (window.overwolf) {
      var node = event.target;
      var version = node.getAttribute('appversion');

      if (!version || version === this._appVersion) {
        return;
      }

      this.selectAppVersion(version);
      await this._mainWindow.setAppVersion(this._appVersion);

      this._mainWindow._shouldLoadUiState = true;
      if (version === 'ingame') {
        await WindowsService.restore(WindowNames.IN_GAME);
        await WindowsService.restore(WindowNames.MAIN_IN_GAME);
        await WindowsService.close(WindowNames.MAIN);
      } else if (version === 'desktop') {
        await WindowsService.restore(WindowNames.MAIN);
        await WindowsService.bringToFront(WindowNames.MAIN, true);
        await WindowsService.close(WindowNames.IN_GAME);
        await WindowsService.close(WindowNames.MAIN_IN_GAME);
      }
    }
  };

  selectLanguageByTarget = async (event) => {
    if (
      'undefined' === typeof overwolf &&
      !(await this.cancelOperationInProgress(true))
    ) {
      return;
    }
    let node = event.target;
    let languageAttr = node ? node.getAttribute('languageid') : null;
    while (languageAttr === null && node) {
      node = node.parentNode;
      languageAttr = node ? node.getAttribute('languageid') : null;
    }
    if (languageAttr !== null) {
      this._mainWindow.setLanguage(languageAttr);
    }
  };

  setPrivacyByTarget = (event) => {
    const { id } = event.target.dataset;
    this._mainWindow.defaultReportVisibility = id;
    this._mainWindow.storage.setVersionedStoredItem('visibility', id);

    this.selectPrivacy(id);
  };

  _overwolfUriToPath = (uri) => {
    if (!uri.startsWith('overwolf')) return uri;

    let rest = decodeURI(uri.substring(14));
    let firstSlash = rest.indexOf('/');
    let driveLetter = rest.substring(0, firstSlash);
    let path = rest.substring(firstSlash + 1);

    path = driveLetter + ':\\' + path;
    path = path.replace(/\//g, '\\');

    return path;
  };

  setLogDirectory = async (directoryUploadName, updateFileInputs) => {
    if (updateFileInputs) await this.resetFileUploadName();

    this.updateFileChooserUI('directory', directoryUploadName);
  };

  resetFileUploadName = async () => {
    const fileUploadName = await this._mainWindow.getFileUploadName();
    if (fileUploadName) {
      document.getElementById('logfile').innerText = fileUploadName;
      this.setFileDisplay(fileUploadName, 'logfile-display');
    }
  };

  liveLogLocationSelected = async (data) => {
    if ((data.status != 'success' || !data.path) && !data.filePaths) return;
    const path = data.path || data.filePaths[0];
    this._mainWindow.setLogDirectory(path, true);
  };

  overwolfFileSelected = (data) => {
    if (data.status != 'success' || !data.url) return;

    if (data.file) {
      this.fileSelected(data.file, 'logfile');
      return;
    }

    this.fileSelected(this._overwolfUriToPath(data.url), 'logfile');
  };

  fileSelected = (fileName, id) => {
    let directory = fileName.match(/(.*)[\/\\]/)[1] || '';
    this._mainWindow.setLogDirectory(directory, false);
    this.updateFileChooserUI(id, fileName);
  };

  updateFileChooserUI = (id, fileName) => {
    document.getElementById(id).innerText = fileName;
    this.setFileDisplay(fileName, id + '-display');
  };

  browseForLiveLogLocation = () => {
    let fileName =
      this._mainWindow.storage.getVersionedStoredItem('directory') || 'C:/';
    if ('undefined' !== typeof overwolf) {
      overwolf.utils.openFolderPicker(fileName, this.liveLogLocationSelected);
      return;
    }

    dialog
      .showOpenDialog({ properties: ['openDirectory'] })
      .then((data) => this.liveLogLocationSelected(data));
  };

  browseForFile = async () => {
    let fileName = await this._mainWindow.getFileUploadName();
    let path;
    if (!fileName) {
      path = this._mainWindow.storage.getVersionedStoredItem('directory') || '';
    } else {
      let lastSlashIndex = Math.max(
        fileName.lastIndexOf('\\'),
        fileName.lastIndexOf('/')
      );
      path =
        lastSlashIndex != -1 ? fileName.substring(0, lastSlashIndex) : null;
    }

    if (window.overwolf) {
      overwolf.utils.openFilePicker(
        '.' + this._mainWindow.game.logFileExtension(),
        path,
        this.overwolfFileSelected,
        false
      );
      return;
    }

    const electronFileSelected = (data) => {
      if (!data || !data.filePaths[0]) return;
      const filePath = data.filePaths[0];
      this.fileSelected(filePath, 'logfile');
    };

    if (dialog) {
      dialog
        .showOpenDialog({
          defaultPath: path,
          properties: ['openFile'],
          filters: [
            { name: 'Log Files', extensions: [game.logFileExtension()] },
          ],
        })
        .then((data) => electronFileSelected(data));
    }
  };

  scanLogFileForRaids = (reportMeta, file) => {
    this._mainWindow.scanLogFileForRaids(reportMeta, file);
  };

  processLogFile = (reportMeta, file, raidsToUpload) => {
    this._mainWindow.processLogFile(reportMeta, file, raidsToUpload);
  };

  startLiveLoggingSession = (reportMeta, dir) => {
    this._mainWindow.startLiveLoggingSession(reportMeta, dir);
  };

  splitLogFile = (dir) => {
    this._mainWindow.splitLogFile(dir);
  };

  cancelButtonClicked = async () => {
    this.debugMode && console.log('cancelButtonClicked');
    await this._mainWindow.cancelUploadOrLiveLog();
    await this._mainWindow.cancelOrFinish('upload');
  };

  stopLiveLoggingSession = async () => {
    this.debugMode && console.log('stopLiveLoggingSession');
    await this._mainWindow.stopLiveLoggingSession();
    await this._mainWindow.cancelOrFinish('deletion-archival');
  };

  viewLog = (e) => {
    e.preventDefault();
    const scheme = this._mainWindow.game.scheme();
    const host = this._mainWindow.game.host();
    const url =
      scheme +
      '://' +
      host +
      '/reports/' +
      this._mainWindow.lastReportCode +
      '/';
    this._externalLinkService.openInBrowser(url, false);
  };

  viewLogInApp = () => {
    this._mainWindow.viewLogInApp(this._mainWindow.lastReportCode, 'last');
    this.setActiveTab('reports');
  };

  createReportMeta = () => {
    const startTime = new Date().getTime();
    const descToUse = this.liveLoggingAutoStartDescription
      ? this.liveLoggingAutoStartDescription
      : document.getElementById('description').value;
    if (this.liveLoggingAutoStartDescription)
      this.liveLoggingAutoStartDescription = null;
    const reportMeta = {
      description: descToUse,
      selectedGuild: this._selectedGuild,
      selectedTeam: this._selectedTeam,
      selectedRegion: this._selectedRegion,
      selectedPrivacy: this._selectedPrivacy,
      startTime,
      clientVersion: this._mainWindow._internalVersion,
    };

    return reportMeta;
  };

  goButtonClicked = async () => {
    const { activeTab } = this._mainWindow;
    if (
      !(
        activeTab === 'uploadlog' ||
        activeTab === 'livelog' ||
        activeTab === 'splitlog'
      )
    )
      return;

    this._mainWindow.setErrorText('');
    this._mainWindow.setWarningText('');

    document.getElementById('upload-button').disabled = true;

    if (this._mainWindow._uploader) {
      this._mainWindow.setErrorText(
        this._mainWindow.lang.trans('operation_in_progress')
      );
      return;
    }
    const reportMeta = this.createReportMeta();

    this._mainWindow.setTabWithOperationInProgress(activeTab);

    if (activeTab === 'uploadlog') {
      const scanForFights = document.getElementById('fight-chooser').checked;
      if (scanForFights)
        this.scanLogFileForRaids(
          reportMeta,
          document.getElementById('logfile').innerText
        );
      else {
        this.processLogFile(
          reportMeta,
          document.getElementById('logfile').innerText
        );
      }
    } else if (activeTab === 'livelog') {
      this.startLiveLoggingSession(
        reportMeta,
        document.getElementById('directory').innerText
      );
    } else if (activeTab === 'splitlog') {
      this.splitLogFile(document.getElementById('logfile').innerText);
    }
  };

  fightsButtonClicked = async () => {
    this._mainWindow.setErrorText('');
    this._mainWindow.setWarningText('');

    const options = document.getElementById('fights-list').options;
    const selectedOptions = [];
    for (let i = 0; i < options.length; ++i) {
      if (options[i].selected) selectedOptions.push(options[i]);
    }

    if (selectedOptions.length === 0) {
      this._mainWindow.setErrorText(
        this._mainWindow.lang.trans('no_fight_selected')
      );
      return;
    }

    const { collectedScannedRaids } = this._mainWindow;

    // reset uploader
    await this._mainWindow.cancelUploadOrLiveLog();

    const raidsToUpload = [];
    for (let i = 0; i < selectedOptions.length; ++i) {
      raidsToUpload.push(collectedScannedRaids[selectedOptions[i].value]);
    }

    const reportMeta = this.createReportMeta();

    this.processLogFile(
      reportMeta,
      document.getElementById('logfile').innerText,
      raidsToUpload
    );
  };

  deleteLogFile = () => {
    this._deletionArchivalUIOptions.style.display = 'none';
    this._deletionArchivalUIDeletionOptions.style.display = 'block';
  };

  archiveLogFile = () => {
    this._deletionArchivalUIOptions.style.display = 'none';
    this._deletionArchivalUIArchivalOptions.style.display = 'block';
  };

  confirmDeletion = () => {
    this._mainWindow.deleteLogFile(this._mainWindow.currentLogFile);
  };

  cancelDeletion = () => {
    this._deletionArchivalUIOptions.style.display = 'block';
    this._deletionArchivalUIDeletionOptions.style.display = 'none';
  };

  confirmArchival = () => {
    this._mainWindow.archiveLogFile(this._mainWindow.currentLogFile);
  };

  cancelArchival = () => {
    this._deletionArchivalUIOptions.style.display = 'block';
    this._deletionArchivalUIArchivalOptions.style.display = 'none';
  };

  showDeletionSucceededMessage = () => {
    this._deletionArchivalUIDeletionOptions.style.display = 'none';
    this._deletionArchivalUIDeletionSuccessMessage.style.display = 'block';
  };

  showDeletionFailedMessage = () => {
    this._deletionArchivalUIOptionsDescription.innerText =
      this._mainWindow.lang.trans('deletion_failed');
    this.cancelDeletion();
  };

  showArchivalSucceededMessage = () => {
    this._deletionArchivalUIArchivalOptions.style.display = 'none';
    this._deletionArchivalUIArchivalSuccessMessage.style.display = 'block';
  };

  showArchivalFailedMessage = () => {
    this._deletionArchivalUIOptionsDescription.innerText =
      this._mainWindow.lang.trans('archival_failure');
    this.cancelArchival();
  };

  showTab = (tabName) => {
    const { tabWithOperationInProgress } = this._mainWindow;
    const isLogTab =
      tabName === 'livelog' ||
      tabName === 'uploadlog' ||
      tabName === 'splitlog';
    const isReportsTab = tabName === 'reports';
    const isCharactersTab = tabName === 'characters';
    const isGuildsTab = tabName === 'guilds';

    const elements = {
      reportcontent: isLogTab,
      'logs-sidebar': isLogTab,
      sidebar: !isLogTab,

      reportscontent: isReportsTab,
      'reports-sidebar': isReportsTab,

      characterscontent: isCharactersTab,
      'characters-sidebar': isCharactersTab,

      guildscontent: isGuildsTab,
      'guilds-sidebar': isGuildsTab,
    };

    for (const [k, v] of Object.entries(elements)) {
      const e = document.getElementById(k);
      if (!e) continue;
      e.style.display = v ? '' : 'none';
    }

    if (isLogTab) {
      $('#mainview').addClass('logs');
    } else {
      $('#mainview').removeClass('logs');
    }

    $('.nav-bar-tab').removeClass('selected').removeClass('active');
    $(`#${tabName}-link`).addClass('selected');
    $(`#${tabWithOperationInProgress}-link`).addClass('active');

    document.getElementById('startup-panel').style.display = 'none';
    document.getElementById('logout-link').style.display = 'block';
    document.getElementById('logincontent').style.display = 'none';

    if (isLogTab) this.showLogPageControls(tabName);
  };

  setActiveTab = (tabName) => {
    this.debugMode && console.log('setActiveTab', tabName);
    this._mainWindow.setActiveTab(tabName);

    setTimeout(async () => {
      this.updateFileChooserUI(
        'logfile',
        await this._mainWindow.getFileUploadName()
      );
      this.updateFileChooserUI(
        'directory',
        this._mainWindow.storage.getVersionedStoredItem('directory') || ''
      );
      this.setFileDisplay(
        this._mainWindow.directoryUploadName,
        'directory-display'
      );
    }, 0);

    this.showTab(tabName);
  };

  reportsLinkClicked = (evt) => {
    this.setActiveTab('reports');
  };

  charactersLinkClicked = (evt) => {
    if (this._mainWindow.game.prefix() === 'ff') {
      this._mainWindow.clearGroupApplicantBadgeCount();
    }
    this.setActiveTab('characters');
  };

  guildsLinkClicked = (evt) => {
    this.setActiveTab('guilds');
  };

  setTabbedViewVisibility = (visible) => {
    const display = visible ? '' : 'none';

    document.getElementById('mainview').style.display = display;
    document.getElementById('sidebar').style.display = display;
    document.getElementById('nav-bar').style.display = display;
  };

  setAppVersionSelectorVisibility = (visible) => {
    if (window.overwolf) {
      document.getElementById('app-version').style.display = visible
        ? ''
        : 'none';
    }
  };

  loadUiState = () => {
    if (this._state) {
      window._reportsController?.loadUiState();
      window._charactersController?.loadUiState();
      window._guildsController?.loadUiState();
    }
  };

  showOnboarding = () => {
    const onboardContainer = document.getElementById('first-launch-page');
    const tabbedContainer = document.getElementById('container');
    onboardContainer.style.display = 'flex';
    tabbedContainer.style.display = 'none';

    if (window.inGame) {
      const returnToGameBtn = document.getElementById('return-to-game-btn');
      returnToGameBtn.style.display = '';
    }
  };

  hideOnboarding = () => {
    const onboardContainer = document.getElementById('first-launch-page');
    const tabbedContainer = document.getElementById('container');
    onboardContainer.style.display = 'none';
    tabbedContainer.style.display = '';
    this.setTabbedViewVisibility(true);
    this.setActiveTab(this._mainWindow.activeTab);
    this._mainWindow.storage.setStoredItem('onboarded', true);
    this._onboarded = true;
  };

  returnToGame = async () => {
    this._mainWindow.storage.setStoredItem('onboarded', true);
    this._onboarded = true;
    await WindowsService.close(WindowNames.MAIN_IN_GAME);
  };

  operationInProgress = async () => !!this._mainWindow._uploader;

  cancelOperationInProgress = async (promptFirst) => {
    if (!(await this.operationInProgress())) {
      return true;
    }
    if (
      promptFirst &&
      !window.confirm(
        this._mainWindow.lang.trans('log_operation_in_progress_warning')
      )
    ) {
      return false;
    }

    await this._mainWindow.cancelUploadOrLiveLog();
    this.setLogPage('upload');
    this.showTab(this._mainWindow.activeTab);
    this.setErrorText('');
    this.setStatusText('');
    return true;
  };
}
   
  return MainView;
}

module.exports = { MainViewBuilder };
