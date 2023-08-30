class Game {
  constructor() {
    this.setLanguageAndVersion = this.setLanguageAndVersion.bind(this);
    this.nameForDifficulty = this.nameForDifficulty.bind(this);

    this._liveRegions = [
      {
        id: 1,
        name: 'US',
      },
      {
        id: 2,
        name: 'EU',
      },
      {
        id: 3,
        name: 'KR',
      },
      {
        id: 4,
        name: 'TW',
      },
      {
        id: 5,
        name: 'CN',
      },
    ];
  }

  appTitle() {
    return 'Warcraft Logs';
  }

  prefix() {
    return 'warcraft';
  }

  overwolfGameIds() {
    return [765, 21630];
  }

  currentOverwolfGameId() {
    // FIXME: Need the game ID for vanilla still!
    return this._version === 'classic' || this._version === 'vanilla'
      ? 21630
      : 765;
  }

  overwolfAppId() {
    return 'ecboebafnpgnolnpgppohegbpjbhffiahodgijdp';
  }

  scheme() {
    return 'https';
  }
  host() {
    return this._host;
  }
  origin() {
    return this.scheme() + '://' + this._host;
  }
  parserVersion() {
    return '';
  }

  logFileName() {
    return 'WoWCombatLog*.txt';
  }

  logFileExtension() {
    return 'txt';
  }

  logFileEncoding() {
    return 'utf8';
  }

  liveLoggingMustIncludeEntireFile() {
    return true;
  }

  liveLoggingChecksLastModified() {
    return true;
  }

  defaultRegion() {
    return 0;
  }

  initialRegion() {
    return this._version === 'classic'
      ? 6
      : this._version === 'vanilla'
      ? 11
      : 1;
  }

  regions() {
    return this._version === 'classic' || this._version === 'vanilla'
      ? undefined
      : this._liveRegions;
  }

  versions() {
    return {
      live: 'live_version',
      classic: 'classic_version',
      vanilla: 'vanilla_version',
      test: 'test_version',
    };
  }

  modifyVersionForLanguage(version, language) {
    return version;
  }

  setLanguageAndVersion(langService, version) {
    this._langService = langService;
    this._lang = lang.language();
    this._version = version;
    const hasPrefix =
      this._version === 'classic' || this._version === 'vanilla';
    /* if (this._lang === "cn")
		this._host = (hasPrefix ? this._version : "www") + ".warcraftlogs.cn"
	else */ if (this._lang === 'en' && hasPrefix)
      this._host = this._version + '.warcraftlogs.com';
    else
      this._host =
        (this._lang === 'en' ? 'www' : this._lang) +
        (hasPrefix ? '.' + this._version : '') +
        '.warcraftlogs.com';
  }

  versionForExecutionPath(executionPath) {
    if (executionPath.indexOf('_classic_era_') !== -1) return 'vanilla';
    if (executionPath.indexOf('_classic_') !== -1)
      // Note, _classic_era_ will match this also, which is why we check for the other one first.
      return 'classic';
    if (
      executionPath.indexOf('_ptr_') !== -1 ||
      executionPath.indexOf('_beta_') !== -1
    )
      return 'test';
    return 'live';
  }

  determineLiveLogLocation(executionPath) {
    if (!executionPath) return '';

    let lastSlash = executionPath.lastIndexOf('/');
    if (lastSlash === -1) return '';

    let path = executionPath.substr(0, lastSlash + 1);
    path += 'Logs';

    return path;
  }

  supportsGear() {
    return this._lang !== 'cn';
  }

  nameForDifficulty(difficulty, logVersion) {
    if (difficulty === 16)
      return this._langService.trans('warcraft_difficulty_mythic');
    if (difficulty === 7 || difficulty === 17)
      return this._langService.trans('warcraft_difficulty_lfr');
    if (difficulty === 14)
      return logVersion === 1
        ? this._langService.trans('warcraft_difficulty_flex')
        : this._langService.trans('warcraft_difficulty_normal');
    if (difficulty === 15)
      return this._langService.trans('warcraft_difficulty_heroic');
    if (difficulty === 200)
      return this._langService.trans('warcraft_difficulty_tower');
    if (difficulty === 8)
      return logVersion >= 7
        ? this._langService.trans('warcraft_difficulty_mythic_plus')
        : this._langService.trans('warcraft_difficulty_challenge_mode');
    if (
      difficulty === 1 ||
      difficulty === 3 ||
      difficulty === 4 ||
      difficulty === 12 ||
      difficulty === 9
    )
      return this._langService.trans('warcraft_difficulty_normal');
    if (
      difficulty === 2 ||
      difficulty === 5 ||
      difficulty === 6 ||
      difficulty === 11
    )
      return this._langService.trans('warcraft_difficulty_heroic');
  }

  separatesWipesAndKills() {
    return true;
  }

  splitsOnTimestamps() {
    return true;
  }

  splitsOnZoneChanges() {
    return true;
  }

  desktopContentLoaded(doc) {
    // FIXME: So gross.
    var titleIfText = doc.getElementById('title-if-text');
    if (titleIfText)
      titleIfText.innerHTML =
        '<span id="title-top"><span id="title-top-first">WARCRAFT</span> <span id="title-top-second">LOGS </span></span>';
  }

  adjustTimeForYearCrossingAndDaylightSavings(line, dateString, timeSplit) {
    if (!window._splitYearSet) window._splitYear = new Date().getFullYear();

    var date = new Date(
      dateString + '/' + window._splitYear + ' ' + timeSplit[0]
    );
    date.setMilliseconds(timeSplit[1]);

    if (!window._splitYearSet) {
      while (date.getTime() - new Date().getTime() > 0) {
        // We're in the future. This is no good. Rewind to the previous year.
        window._splitYear--;
        date = new Date(
          dateString + '/' + window._splitYear + ' ' + timeSplit[0]
        );
        date.setMilliseconds(timeSplit[1]);
      }
      window._splitYearSet = true;
    }

    var currTime = date.getTime();
    if (currTime >= window._previousSplitTime) return currTime;

    date = new Date(
      dateString + '/' + (window._splitYear + 1) + ' ' + timeSplit[0]
    );
    date.setMilliseconds(timeSplit[1]);
    if (date.getTime() - new Date().getTime() <= 0) {
      // Not in the future, so it's ok to go forward now.
      window._splitYear++;
      currTime = date.getTime();
      window._daylightSavingsSplitShift = 0;
    } else {
      // We went backwards in time. Biggest reason for this is daylight savings.
      while (
        currTime + window._daylightSavingsSplitShift <
        window._previousSplitTime
      )
        window._daylightSavingsSplitShift += 3600000; // 1 hour in milliseconds
    }

    return currTime;
  }

  scanLogLine(line) {
    // Get the timestamp, which includes the date in milliseconds.
    const dateEnd = line.indexOf(' ');
    if (dateEnd === -1)
      return {
        timestamp: -1,
      };

    const dateString = line.substr(0, dateEnd);
    if (!dateString.length)
      return {
        timestamp: -1,
      };

    const timeEnd = line.indexOf('  ', dateEnd);
    if (timeEnd === -1 || timeEnd < dateEnd + 1)
      return {
        timestamp: -1,
      };

    const timeStringWithMilliseconds = line.substr(
      dateEnd + 1,
      timeEnd - dateEnd - 1
    );

    // Split the time string into the time without milliseconds and the milliseconds.
    const timeSplit = timeStringWithMilliseconds.split('.');
    if (timeSplit.length !== 2)
      return {
        timestamp: -1,
      };

    const currTime = game.adjustTimeForYearCrossingAndDaylightSavings(
      line,
      dateString,
      timeSplit
    );
    window._previousSplitTime = currTime;

    return {
      timestamp: currTime + window._daylightSavingsSplitShift,
    };
  }

  fileStartDate(filename) {
    return '';
  }

  locales() {
    return {
      de: 'Deutsch',
      en: 'English',
      es: 'Español',
      fr: 'Français',
      it: 'Italiano',
      br: 'Português (Brasil)',
      ru: 'Русский',
      ko: '한국어',
      tw: '繁體中文',
      cn: '简体中文',
    };
  }

  groupApplicantsTitle() {
    return 'group_applicants';
  }

  defaultGroupApplicantSortMetric() {
    return 'applicationTime';
  }

  fallbackIconForGroupApplicant() {
    return 'https://assets.rpglogs.com/img/warcraft/abilities/ability_rogue_sinistercalling.jpg';
  }

  showGroupApplicantSortOptions() {
    return true;
  }

  handleGameInfoUpdate(data, triggerEventCallback) {
    if (this._version === 'classic' || this._version === 'vanilla') return;
    if (!data?.info?.game_info) return;

    const groupApplicantsJsonString = data.info.game_info.group_applicants;
    if (groupApplicantsJsonString !== undefined) {
      this.handleGroupApplicantsGameInfoUpdate(
        groupApplicantsJsonString,
        triggerEventCallback
      );
    }
  }

  async handleGroupApplicantsGameInfoUpdate(
    groupApplicantsJsonString,
    triggerEventCallback
  ) {
    if (groupApplicantsJsonString === null) {
      triggerEventCallback('groupApplicantsUpdated', {
        groupApplicants: [],
      });
      return;
    }

    let groupApplicantsData;
    try {
      groupApplicantsData = JSON.parse(groupApplicantsJsonString);
    } catch {
      console.log('Failed to parse group applicants data');
      return;
    }

    const overwolfClassIdToClassName = {
      1: 'Warrior',
      2: 'Paladin',
      3: 'Hunter',
      4: 'Rogue',
      5: 'Priest',
      6: 'DeathKnight',
      7: 'Shaman',
      8: 'Mage',
      9: 'Warlock',
      10: 'Monk',
      11: 'Druid',
      12: 'DemonHunter',
    };

    const overwolfRoleIdToRoleNames = {
      2: ['Tank'],
      4: ['Healer'],
      6: ['Tank', 'Healer'],
      8: ['Damage'],
      10: ['Tank', 'Damage'],
      12: ['Healer', 'Damage'],
      14: ['Tank', 'Healer', 'Damage'],
    };

    // TODO: Would be good to have a consistent way to know the region from the event data, even if the user hasn't chosen a region in-app yet
    const region = window.getRegion() || 1;
    const regionName = this.regions().find((x) => x.id === region).name;

    const groupApplicantKeys = Object.keys(groupApplicantsData);
    let groupApplicants = groupApplicantKeys
      .map((key) => {
        if (key === '') {
          return;
        }
        const data = groupApplicantsData[key];

        return {
          playerName: data.player_name,
          serverName: data.server_name.replace(/(.)([A-Z])/g, '$1 $2'),
          serverSlug: data.server_name,
          region,
          regionName,
          className: overwolfClassIdToClassName[data.class],
          roleNames: overwolfRoleIdToRoleNames[data.role],
          itemLevel: parseInt(data.item_level),
          applied: data.application_status === '1',
        };
      })
      .filter((x) => x)
      .filter((x) => x.applied);

    try {
      groupApplicants = await this.enrichGroupApplicants(groupApplicants);
    } catch (error) {
      console.error('Failed to enrich group applicants', error);
    }

    triggerEventCallback('groupApplicantsUpdated', {
      groupApplicants:
        window.sanitization.sanitizeHtmlStringsInJson(groupApplicants),
    });
  }

  async enrichGroupApplicants(groupApplicants) {
    if (!groupApplicants.length) return [];

    this._groupApplicantsExtraDataCache =
      this._groupApplicantsExtraDataCache || {};

    const searchCriteria = {
      region: {
        id: groupApplicants[0].region,
      },
      characters: [],
    };

    const buildCacheKey = (groupApplicant) =>
      `${groupApplicant.playerName}-${groupApplicant.serverSlug}-${groupApplicant.regionName}`;

    groupApplicants.forEach((groupApplicant) => {
      const cacheKey = buildCacheKey(groupApplicant);
      const cachedExtraData = this._groupApplicantsExtraDataCache[cacheKey];

      if (cachedExtraData) {
        if (cachedExtraData !== 'loading')
          groupApplicant.extraData = cachedExtraData;

        return;
      }

      this._groupApplicantsExtraDataCache[cacheKey] = 'loading';
      searchCriteria.characters.push({
        name: groupApplicant.playerName,
        normalizedServerName: groupApplicant.serverSlug,
      });
    });

    if (!searchCriteria.characters.length) return groupApplicants;

    const response = await fetch(
      this.origin() + '/character/search-for-scores',
      {
        method: 'post',
        body: JSON.stringify(searchCriteria),
      }
    );

    if (!response.ok) return groupApplicants;

    const extraDatas = window.sanitization.sanitizeHtmlStringsInJson(
      await response.json()
    );
    if (!extraDatas) return groupApplicants;

    groupApplicants.forEach((groupApplicant) => {
      const extraData = extraDatas.find(
        (x) =>
          x.character.name === groupApplicant.playerName &&
          x.character.server.normalizedName === groupApplicant.serverSlug
      );
      if (!extraData) return;

      this._groupApplicantsExtraDataCache[buildCacheKey(groupApplicant)] =
        extraData;

      groupApplicant.extraData = extraData;
    });

    return groupApplicants;
  }
}
