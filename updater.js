const { dialog } = require('electron');
const { autoUpdater } = require('electron-updater');

let updateMenuItem = null;

// Setup logger for auto updater
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = false;

autoUpdater.on('update-not-available', () => {
  console.log('Update not available');
  if (updateMenuItem !== null) {
    dialog.showMessageBox({
      title: 'No Updates',
      message: 'Current version is up-to-date.',
    });
    updateMenuItem.enabled = true;
    updateMenuItem = null;
  }
});

autoUpdater.on('error', (error) => {
  console.error(error);
});

function manuallyCheckForUpdates(menuItem) {
  updateMenuItem = menuItem;
  updateMenuItem.enabled = false;
  autoUpdater.checkForUpdates();
}

// exports
module.exports.autoUpdater = autoUpdater;
module.exports.manuallyCheckForUpdates = manuallyCheckForUpdates;
