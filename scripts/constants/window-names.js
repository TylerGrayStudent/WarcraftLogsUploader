// define({
//   BACKGROUND: 'background',
//   DESKTOP: 'desktop',
//   IN_GAME: 'in_game',
//   CHARACTERS: 'characters',
//   CHARACTERS_IN_GAME: 'characters_in_game',
//   GUILDS: 'guilds',
//   GUILDS_IN_GAME: 'guilds_in_game',
//   LIVELOG: 'livelog',
//   REPORTS: 'reports',
//   REPORTS_IN_GAME: 'reports_in_game',
// });

const WindowNames = {
  BACKGROUND: 'background',
  // FIXME-MAIN-WINDOW: Remove desktop, characters, guilds, livelog, reports windows when main window is ready.
  DESKTOP: 'desktop',
  IN_GAME: 'in_game',
  MAIN: 'main',
  MAIN_IN_GAME: 'main_in_game',
  CHARACTERS: 'characters',
  CHARACTERS_IN_GAME: 'characters_in_game',
  GUILDS: 'guilds',
  GUILDS_IN_GAME: 'guilds_in_game',
  LIVELOG: 'livelog',
  REPORTS: 'reports',
  REPORTS_IN_GAME: 'reports_in_game',
  IN_GAME_WINDOWS: [
    'in_game',
    'reports_in_game',
    'guilds_in_game',
    'characters_in_game',
    'livelog',
    'main_in_game',
  ],
};

module.exports = { WindowNames };
