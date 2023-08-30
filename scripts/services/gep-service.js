/**
 * Game Event Provider service
 * This will listen to events from the game provided by
 * Overwolf's Game Events Provider
 */
define([], function () {
  function registerToGEP(eventsListener, infoListener) {
    // NO-OP: Overwolf doesn't exist in Electron
  }

  return {
    registerToGEP,
  };
});
