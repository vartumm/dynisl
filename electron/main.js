const { app, BrowserWindow, ipcMain, screen, shell, globalShortcut, clipboard } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const { isAutoStartEnabled, setAutoStart } = require('./autostart');
const { initUpdater } = require('./updater');

let mainWindow = null;
let coreProcess = null;
let isHiddenManually = false;
let isCurrentlyIgnoring = true;

let islandBounds = {
  width: 290,
  height: 44,
  callActive: false
};

function getCorePath() {
  if (app.isPackaged) {
    const packagedPath = path.join(process.resourcesPath, 'core', 'DynislCore.exe');
    if (fs.existsSync(packagedPath)) return packagedPath;
    const directPath = path.join(process.resourcesPath, 'DynislCore.exe');
    if (fs.existsSync(directPath)) return directPath;
  }
  const pubPath = path.join(__dirname, '..', 'core', 'publish', 'DynislCore.exe');
  if (fs.existsSync(pubPath)) return pubPath;
  const relPath = path.join(__dirname, '..', 'core', 'bin', 'Release', 'net8.0-windows10.0.19041.0', 'DynislCore.exe');
  if (fs.existsSync(relPath)) return relPath;
  const devPath = path.join(__dirname, '..', 'core', 'bin', 'Debug', 'net8.0-windows10.0.19041.0', 'DynislCore.exe');
  if (fs.existsSync(devPath)) return devPath;
  return null;
}

function startCoreProcess() {
  const corePath = getCorePath();
  if (!corePath) {
    console.error('DynislCore.exe not found!');
    return;
  }

  console.log('Spawning DynislCore from:', corePath);
  coreProcess = spawn(corePath, [], {
    stdio: ['pipe', 'pipe', 'inherit'],
    windowsHide: true,
    env: { ...process.env, PATH: `D:\\dotnet;${process.env.PATH || ''}` }
  });

  const rl = readline.createInterface({
    input: coreProcess.stdout,
    terminal: false
  });

  rl.on('line', (line) => {
    if (!line || !line.trim()) return;
    try {
      const data = JSON.parse(line);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('core-event', data);

        if (data.type === 'win_v') {
          mainWindow.webContents.send('core-event', { type: 'open_clipboard' });
        }
      }
    } catch (err) {
      // not JSON
    }
  });

  coreProcess.on('exit', (code) => {
    console.log('DynislCore exited with code:', code);
  });
}

function sendToCore(payload) {
  if (coreProcess && coreProcess.stdin && !coreProcess.stdin.destroyed) {
    try {
      coreProcess.stdin.write(JSON.stringify(payload) + '\n');
    } catch (err) {
      console.error('Error sending to core:', err);
    }
  }
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const winWidth = Math.min(1100, screenWidth);
  const winHeight = 620;
  const posX = Math.round((screenWidth - winWidth) / 2);
  const posY = 0;

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: posX,
    y: posY,
    backgroundColor: '#00000000',
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      devTools: false
    }
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  const distPath = path.join(__dirname, '..', 'dist', 'index.html');
  if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  // Anti-tamper & anti-debugging protection
  mainWindow.webContents.on('devtools-opened', () => {
    mainWindow.webContents.closeDevTools();
  });
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (
      (input.control && input.shift && (input.key === 'I' || input.key === 'i' || input.key === 'J' || input.key === 'j')) ||
      input.key === 'F12'
    ) {
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Native mouse bounds check (runs every 50ms to guarantee zero lag click-through)
  setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    if (isHiddenManually || islandBounds.isHidden) {
      // When hidden, ALWAYS pass through mouse clicks completely!
      if (!isCurrentlyIgnoring) {
        isCurrentlyIgnoring = true;
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
      }
      return;
    }

    const cursor = screen.getCursorScreenPoint();
    const primaryDisplay = screen.getPrimaryDisplay();
    const screenWidth = primaryDisplay.bounds.width;
    const screenCenterX = primaryDisplay.bounds.x + screenWidth / 2;

    const totalWidth = islandBounds.callActive ? islandBounds.width + 200 : islandBounds.width;
    const left = screenCenterX - (totalWidth / 2) - 40;
    const right = screenCenterX + (totalWidth / 2) + 40;
    const bottom = Math.max(islandBounds.height, 55) + 35;

    const isInside = cursor.x >= left && cursor.x <= right && cursor.y >= 0 && cursor.y <= bottom;

    if (isInside && isCurrentlyIgnoring) {
      isCurrentlyIgnoring = false;
      mainWindow.setIgnoreMouseEvents(false);
    } else if (!isInside && !isCurrentlyIgnoring) {
      isCurrentlyIgnoring = true;
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    }
  }, 50);
}

app.whenReady().then(() => {
  createWindow();
  startCoreProcess();
  initUpdater(mainWindow);

  // Register manual hide toggle shortcut
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (!mainWindow) return;
    isHiddenManually = !isHiddenManually;
    if (isHiddenManually) {
      isCurrentlyIgnoring = true;
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    }
    mainWindow.webContents.send('core-event', {
      type: 'manual_hide_toggle',
      data: { isHidden: isHiddenManually }
    });
  });

  // Global Win+V fallback hotkey
  try {
    globalShortcut.register('Alt+V', () => {
      if (mainWindow) {
        mainWindow.webContents.send('core-event', { type: 'open_clipboard' });
      }
    });
  } catch { }

  // IPC Handlers
  ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (isHiddenManually || islandBounds.isHidden) {
        if (!isCurrentlyIgnoring) {
          isCurrentlyIgnoring = true;
          mainWindow.setIgnoreMouseEvents(true, { forward: true });
        }
        return;
      }
      if (isCurrentlyIgnoring !== ignore) {
        isCurrentlyIgnoring = ignore;
        if (ignore) {
          mainWindow.setIgnoreMouseEvents(true, { forward: true });
        } else {
          mainWindow.setIgnoreMouseEvents(false);
        }
      }
    }
  });

  ipcMain.on('update-island-bounds', (event, bounds) => {
    if (bounds) {
      islandBounds = { ...islandBounds, ...bounds };
    }
  });

  ipcMain.on('send-core-command', (event, payload) => {
    sendToCore(payload);
  });

  ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
  });

  ipcMain.on('open-path', (event, filePath) => {
    shell.showItemInFolder(filePath);
  });

  ipcMain.on('copy-clipboard', (event, text) => {
    clipboard.writeText(text);
  });

  ipcMain.on('copy-file-clipboard', (event, filePath) => {
    clipboard.writeText(filePath);
  });

  ipcMain.on('toggle-hide', () => {
    if (!mainWindow) return;
    isHiddenManually = !isHiddenManually;
    mainWindow.webContents.send('core-event', {
      type: 'manual_hide_toggle',
      data: { isHidden: isHiddenManually }
    });
  });

  ipcMain.on('close-app', () => {
    app.quit();
  });

  // Autostart IPC handlers
  ipcMain.handle('get-autostart', () => {
    return isAutoStartEnabled();
  });

  ipcMain.handle('set-autostart', (event, enable) => {
    return setAutoStart(enable);
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (coreProcess) {
    try {
      coreProcess.kill();
    } catch { }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
