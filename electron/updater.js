const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let autoUpdater = null;
try {
  const updaterModule = require('electron-updater');
  autoUpdater = updaterModule.autoUpdater;
} catch (e) {
  console.warn('[Updater] electron-updater could not be loaded:', e.message);
}

const settingsPath = path.join(app.getPath('userData'), 'updater-settings.json');

function loadUpdaterSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
  } catch { }
  return { autoUpdate: true, autoDownload: false };
}

function saveUpdaterSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.error('[Updater] Failed to save settings:', e);
  }
}

let updaterSettings = loadUpdaterSettings();

function initUpdater(mainWindow) {
  const sendToRenderer = (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater-event', payload);
    }
  };

  if (autoUpdater && app.isPackaged) {
    autoUpdater.autoDownload = Boolean(updaterSettings.autoDownload);
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;

    autoUpdater.on('checking-for-update', () => {
      sendToRenderer({ type: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
      sendToRenderer({
        type: 'available',
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes || 'Улучшения производительности и исправления ошибок.'
      });

      // Show in-island notification
      sendToRenderer({
        type: 'notification',
        data: {
          id: `update-${info.version}`,
          title: 'Доступно обновление!',
          body: `Вышла новая версия v${info.version}. Нажмите для перехода в настройки.`,
          app: 'system'
        }
      });

      if (updaterSettings.autoUpdate) {
        autoUpdater.downloadUpdate();
      }
    });

    autoUpdater.on('update-not-available', (info) => {
      sendToRenderer({
        type: 'not-available',
        version: info?.version || app.getVersion()
      });
    });

    autoUpdater.on('error', (err) => {
      console.error('[Updater] Error:', err);
      sendToRenderer({
        type: 'error',
        message: err.message || 'Ошибка проверки обновлений.'
      });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      sendToRenderer({
        type: 'progress',
        percent: Math.round(progressObj.percent || 0),
        bytesPerSecond: progressObj.bytesPerSecond || 0,
        transferred: progressObj.transferred || 0,
        total: progressObj.total || 0
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      sendToRenderer({
        type: 'downloaded',
        version: info.version
      });

      sendToRenderer({
        type: 'notification',
        data: {
          id: `update-ready-${info.version}`,
          title: 'Обновление загружено',
          body: `Версия v${info.version} готова к установке при перезапуске.`,
          app: 'system'
        }
      });
    });

    // Auto-check periodically if enabled
    if (updaterSettings.autoUpdate) {
      setTimeout(() => {
        try {
          autoUpdater.checkForUpdates().catch(() => {});
        } catch {}
      }, 5000);

      setInterval(() => {
        if (updaterSettings.autoUpdate) {
          try {
            autoUpdater.checkForUpdates().catch(() => {});
          } catch {}
        }
      }, 1000 * 60 * 60 * 2); // Every 2 hours
    }
  }

  // IPC Handlers
  ipcMain.handle('get-app-version', () => {
    return {
      version: app.getVersion(),
      isPackaged: app.isPackaged
    };
  });

  ipcMain.handle('get-auto-update-setting', () => {
    return updaterSettings.autoUpdate !== false;
  });

  ipcMain.handle('set-auto-update-setting', (event, enabled) => {
    updaterSettings.autoUpdate = Boolean(enabled);
    saveUpdaterSettings(updaterSettings);
    if (autoUpdater && app.isPackaged) {
      autoUpdater.autoDownload = Boolean(enabled);
    }
    return updaterSettings.autoUpdate;
  });

  ipcMain.handle('check-for-updates', async () => {
    if (!app.isPackaged) {
      // In dev mode, return informative message gracefully
      sendToRenderer({ type: 'checking' });
      await new Promise((r) => setTimeout(r, 900));
      sendToRenderer({
        type: 'not-available',
        version: app.getVersion(),
        devMode: true,
        message: 'Приложение запущено в режиме разработки. Обновления работают в собранной версии (.exe).'
      });
      return { status: 'dev-mode' };
    }

    if (!autoUpdater) {
      return { status: 'unavailable', message: 'Модуль обновлений не инициализирован.' };
    }

    try {
      const res = await autoUpdater.checkForUpdates();
      return { status: 'ok', updateInfo: res?.updateInfo };
    } catch (err) {
      sendToRenderer({ type: 'error', message: err.message });
      return { status: 'error', message: err.message };
    }
  });

  ipcMain.handle('download-update', async () => {
    if (!app.isPackaged) {
      // Dev mode simulation
      sendToRenderer({ type: 'progress', percent: 15, transferred: 3000000, total: 20000000 });
      await new Promise((r) => setTimeout(r, 600));
      sendToRenderer({ type: 'progress', percent: 55, transferred: 11000000, total: 20000000 });
      await new Promise((r) => setTimeout(r, 600));
      sendToRenderer({ type: 'progress', percent: 100, transferred: 20000000, total: 20000000 });
      await new Promise((r) => setTimeout(r, 300));
      sendToRenderer({ type: 'downloaded', version: '1.0.1 (Тест)' });
      return { status: 'dev-simulated' };
    }

    if (!autoUpdater) {
      return { status: 'unavailable' };
    }

    try {
      await autoUpdater.downloadUpdate();
      return { status: 'downloading' };
    } catch (err) {
      sendToRenderer({ type: 'error', message: err.message });
      return { status: 'error', message: err.message };
    }
  });

  ipcMain.handle('install-update', () => {
    if (autoUpdater && app.isPackaged) {
      autoUpdater.quitAndInstall(false, true);
    } else {
      app.relaunch();
      app.quit();
    }
  });
}

module.exports = { initUpdater };
