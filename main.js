// Modules to control application life and create native browser window
const { app, session, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { BackgroundController } = require('./background-controller');
const { Game } = require('./scripts/game');

const { setupMenu } = require('./menu');
const isDev = require('electron-is-dev');

const { autoUpdater } = require('./updater');

const packageJson = require('./package.json');
const version = packageJson.version;
const title = packageJson.appTitle;

// Show debugger when developing
require('electron-debug')({ showDevTools: true });

function checkIfCalledViaCLI(args) {
  return args && args.length > 1;
}

app.commandLine.appendSwitch('disable-background-timer-throttling');

const appConfig = require('electron-settings');
async function windowStateKeeper(windowName) {
  let window, windowState;
  async function setBounds() {
    // Restore from appConfig
    if (appConfig.has(`windowState.${windowName}`)) {
      windowState = await appConfig.get(`windowState.${windowName}`);
      return;
    }
  }
  async function saveState() {
    if (!windowState.isMaximized) {
      windowState = window.getBounds();
    }
    windowState.isMaximized = window.isMaximized();
    await appConfig
      .set(`windowState.${windowName}`, windowState)
      .catch(() => {});
  }
  function track(win) {
    window = win;
    ['resize', 'move', 'close'].forEach((event) => {
      win.on(event, async () => saveState());
    });
  }
  await setBounds();

  if (!windowState) {
    // Default
    windowState = {
      x: undefined,
      y: undefined,
      width: 1000,
      height: 675,
    };
  }
  return {
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    isMaximized: windowState.isMaximized,
    track,
  };
}

async function createWindow() {
  // Check if called from cli
  const isCalledViaCLI = checkIfCalledViaCLI(process.argv);

  setupMenu();

  // Get window state
  const mainWindowStateKeeper = await windowStateKeeper('desktopWindow');

  // Creating the window
  const windowOptions = {
    x: mainWindowStateKeeper.x,
    y: mainWindowStateKeeper.y,
    width: mainWindowStateKeeper.width,
    height: mainWindowStateKeeper.height,
    minWidth: 800,
    minHeight: 675,
    title: `${title} v${version}`,
    resizable: true,
    webPreferences: {
      // preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      webviewTag: true,
      contextIsolation: false,
      // Some ads load over HTTP instead of HTTPS :(
      webSecurity: false,
    },
  };

  // Create the browser window.
  const mainWindow = new BrowserWindow(windowOptions);

  // Track window state
  mainWindowStateKeeper.track(mainWindow);

  mainWindow.removeMenu();

  require('@electron/remote/main').initialize();
  require('@electron/remote/main').enable(mainWindow.webContents);

  app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36';

  const origin = new Game().origin();
  session.defaultSession.webRequest.onBeforeSendHeaders(
    null, // Apply to all file request headers
    (details, callback) => {
      details.requestHeaders['User-Agent'] = app.userAgentFallback;
      details.requestHeaders['sec-ch-ua'] = '"Chromium";v="106", "Google Chrome";v="106", "Not;A=Brand";v="99"';
      details.requestHeaders.referrer = origin;
      details.requestHeaders.origin = origin;
      details.origin = origin;
      details.referrer = origin;
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    }
  );

  app.on('web-contents-created', (createEvent, webContents) => {
    webContents.on('did-finish-load', () => {
      isCalledViaCLI && mainWindow.webContents.send('is-cli', process.argv);
    });

    webContents.on('new-window', (newEvent) => {
      console.log("Blocked by 'new-window'");
      newEvent.preventDefault();
    });

    webContents.on('will-navigate', (newEvent) => {
      // Purposefully not preventing default here so that ads can do redirects within their webview
      // newEvent.preventDefault();
    });

    webContents.setWindowOpenHandler(({ url }) => {
      const { shell } = require('electron');
      const urlParser = require('url');
      let protocol = urlParser.parse(url).protocol;
      if (protocol === 'http:' || protocol === 'https:') {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });
  });

  // and load the index.html of the app.
  mainWindow.loadFile('index.html');

  autoUpdater.on('checking-for-update', () => {
    console.log('Check update initiated.');
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-available', info);
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Progress ${Math.floor(progress.percent)}`);
    mainWindow.webContents.send(
      'update-download-progress',
      Math.floor(progress.percent)
    );
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-downloaded');
  });

  // Event handler for asynchronous incoming messages
  ipcMain.on('download-update', (event, arg) => {
    mainWindow.webContents.send('update-downloading');
    autoUpdater.downloadUpdate();
  });

  ipcMain.on('install-update', (event, arg) => {
    autoUpdater.quitAndInstall();
  });

  if (!isDev) autoUpdater.checkForUpdates();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => createWindow());

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // Still quit even on Mac
  app.quit();
});

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
