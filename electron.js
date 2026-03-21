const { app, BrowserWindow } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Mare Nostrum',
    icon: path.join(__dirname, 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#0a0e1a',
  });

  // Load index.html, clear cache if possible
  win.webContents.session.clearCache()
    .catch(() => {})
    .then(() => win.webContents.session.clearStorageData({ storages: ['serviceworkers','cachestorage'] }).catch(() => {}))
    .then(() => win.loadFile('index.html'))
    .catch(() => win.loadFile('index.html'));

  // Open DevTools with F12
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      win.webContents.toggleDevTools();
    }
  });

  // Fullscreen toggle with F11
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
    }
  });

  if (process.argv.includes('--dev')) {
    win.webContents.openDevTools();

    const fs = require('fs');
    const jsFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.js') && f !== 'electron.js');
    jsFiles.forEach(file => {
      fs.watch(path.join(__dirname, file), () => {
        if (win) win.webContents.reloadIgnoringCache();
      });
    });
    // Also watch index.html
    fs.watch(path.join(__dirname, 'index.html'), () => {
      if (win) win.webContents.reloadIgnoringCache();
    });
  }

  win.on('closed', () => { win = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
