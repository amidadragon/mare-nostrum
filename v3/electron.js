// Mare Nostrum v3 — Electron dev launcher.
// Loads v3/index.html directly (file://, no server, no cache). In --dev it
// auto-reloads when any file under v3/ changes. This is the ONLY way the game
// is meant to run during development, so what you see == the files on disk.
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('ignore-gpu-blocklist');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Mare Nostrum v3 (dev)',
    backgroundColor: '#06101f',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  // Always start from a clean cache so a stale build can never appear.
  win.webContents.session.clearCache()
    .catch(() => {})
    .then(() => win.webContents.session.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] }).catch(() => {}))
    .then(() => win.loadFile(path.join(__dirname, 'index.html')))
    .catch(() => win.loadFile(path.join(__dirname, 'index.html')));

  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') win.webContents.toggleDevTools();
    if (input.key === 'F11') win.setFullScreen(!win.isFullScreen());
  });

  if (process.argv.includes('--dev')) {
    win.webContents.openDevTools();
    // Recursively watch v3/ and reload on any change.
    try {
      fs.watch(__dirname, { recursive: true }, () => {
        if (win) win.webContents.reloadIgnoringCache();
      });
    } catch (e) { /* recursive watch may be unsupported; ignore */ }
  }

  win.on('closed', () => { win = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
