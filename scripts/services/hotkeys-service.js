define(['../constants/hotkeys-ids.js'], function (HOTKEYS) {
  /**
   * set custom action for a hotkey id
   * @param hotkeyId
   * @param action
   * @private
   */
  function _setHotkey(hotkeyId, action) {
    overwolf.settings.hotkeys.onPressed.addListener(function (event) {
      if (event.name === hotkeyId) {
        action();
      }
    });
  }

  function setToggleHotkey(action) {
    _setHotkey(HOTKEYS.TOGGLE_VISIBILITY, action);
  }

  return {
    setToggleHotkey,
  };
});
