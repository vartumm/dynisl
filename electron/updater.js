const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');

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

// Fallback state for direct GitHub downloads when electron-updater hits a 404
let fallbackUpdate = null; // { version, assetUrl, fileName, filePath, downloaded: false, downloading: false }

function compareSemver(v1, v2) {
  const clean1 = (v1 || '').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const clean2 = (v2 || '').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(clean1.length, clean2.length); i++) {
    const n1 = clean1[i] || 0;
    const n2 = clean2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}

function fetchLatestGitHubRelease() {
  return new Promise((resolve, reject) => {
    https.get('https://api.github.com/repos/vartumm/dynisl/releases/latest', {
      headers: {
        'User-Agent': 'dynisl',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return https.get(res.headers.location, { headers: { 'User-Agent': 'dynisl' } }, (locRes) => {
          let data = '';
          locRes.on('data', chunk => data += chunk);
          locRes.on('end', () => {
            try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
          });
        }).on('error', reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`GitHub API returned HTTP ${res.statusCode}`));
      }
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function findInstallerAsset(release) {
  if (!release || !release.assets || !Array.isArray(release.assets)) return null;
  let asset = release.assets.find(a => a.name.toLowerCase().includes('setup') && a.name.toLowerCase().endsWith('.exe'));
  if (!asset) {
    asset = release.assets.find(a => a.name.toLowerCase().endsWith('.exe'));
  }
  return asset;
}

function downloadAssetWithRedirects(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    function get(currentUrl, redirectCount = 0) {
      if (redirectCount > 6) return reject(new Error('Слишком много перенаправлений'));
      https.get(currentUrl, {
        headers: { 'User-Agent': 'dynisl' }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location, redirectCount + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Ошибка загрузки: HTTP ${res.statusCode}`));
        }
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let transferred = 0;
        const fileStream = fs.createWriteStream(destPath);
        res.on('data', (chunk) => {
          transferred += chunk.length;
          if (total > 0 && onProgress) {
            onProgress({
              percent: Math.min(100, Math.round((transferred / total) * 100)),
              transferred,
              total
            });
          }
        });
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close(() => resolve(destPath));
        });
        fileStream.on('error', (err) => {
          try { fs.unlinkSync(destPath); } catch {}
          reject(err);
        });
      }).on('error', reject);
    }
    get(url);
  });
}

function initUpdater(mainWindow) {
  const sendToRenderer = (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater-event', payload);
    }
  };

  const startFallbackDownload = async () => {
    if (!fallbackUpdate || !fallbackUpdate.assetUrl || fallbackUpdate.downloading) return;
    fallbackUpdate.downloading = true;
    sendToRenderer({ type: 'downloading' });

    try {
      await downloadAssetWithRedirects(fallbackUpdate.assetUrl, fallbackUpdate.filePath, (prog) => {
        sendToRenderer({
          type: 'progress',
          percent: prog.percent,
          transferred: prog.transferred,
          total: prog.total
        });
      });

      fallbackUpdate.downloaded = true;
      fallbackUpdate.downloading = false;
      sendToRenderer({
        type: 'downloaded',
        version: fallbackUpdate.version
      });

      sendToRenderer({
        type: 'notification',
        data: {
          id: `update-ready-${fallbackUpdate.version}`,
          title: 'Обновление загружено',
          body: `Версия v${fallbackUpdate.version} готова к установке.`,
          app: 'system'
        }
      });
    } catch (err) {
      fallbackUpdate.downloading = false;
      console.error('[Updater] Fallback download failed:', err);
      sendToRenderer({
        type: 'error',
        message: `Ошибка загрузки обновления: ${err.message}`
      });
    }
  };

  const checkViaFallback = async () => {
    try {
      const release = await fetchLatestGitHubRelease();
      const remoteVersion = (release.tag_name || '').replace(/^v/, '');
      const currentVersion = app.getVersion();

      if (compareSemver(remoteVersion, currentVersion) > 0) {
        const asset = findInstallerAsset(release);
        if (asset && asset.browser_download_url) {
          fallbackUpdate = {
            version: remoteVersion,
            assetUrl: asset.browser_download_url,
            fileName: asset.name,
            filePath: path.join(app.getPath('temp'), `Dynamic-Island-Setup-${remoteVersion}.exe`),
            downloaded: false,
            downloading: false
          };

          sendToRenderer({
            type: 'available',
            version: remoteVersion,
            releaseDate: release.published_at,
            releaseNotes: release.body || 'Новая версия Dynamic Island доступна для обновления.'
          });

          sendToRenderer({
            type: 'notification',
            data: {
              id: `update-${remoteVersion}`,
              title: 'Доступно обновление!',
              body: `Вышла новая версия v${remoteVersion}. Нажмите для обновления.`,
              app: 'system'
            }
          });

          if (updaterSettings.autoUpdate) {
            startFallbackDownload();
          }
          return { status: 'available', version: remoteVersion };
        }
      }

      sendToRenderer({
        type: 'not-available',
        version: currentVersion
      });
      return { status: 'not-available' };
    } catch (fallbackErr) {
      console.error('[Updater] Fallback check failed:', fallbackErr);
      sendToRenderer({
        type: 'error',
        message: fallbackErr.message || 'Ошибка соединения с сервером обновлений.'
      });
      return { status: 'error', message: fallbackErr.message };
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
        autoUpdater.downloadUpdate().catch(() => {
          // If autoUpdater download throws 404, trigger fallback download!
          checkViaFallback();
        });
      }
    });

    autoUpdater.on('update-not-available', (info) => {
      sendToRenderer({
        type: 'not-available',
        version: info?.version || app.getVersion()
      });
    });

    autoUpdater.on('error', async (err) => {
      console.warn('[Updater] autoUpdater error encountered:', err.message);
      // If error is 404 or missing channel file, fallback immediately to direct GitHub Releases API!
      if (err.message && (err.message.includes('404') || err.message.includes('latest.yml') || err.message.includes('differential'))) {
        console.log('[Updater] Falling back to direct GitHub Release check due to 404...');
        await checkViaFallback();
        return;
      }

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

    // Auto-check periodically
    if (updaterSettings.autoUpdate) {
      setTimeout(() => {
        try {
          autoUpdater.checkForUpdates().catch(() => checkViaFallback());
        } catch {
          checkViaFallback();
        }
      }, 5000);

      setInterval(() => {
        if (updaterSettings.autoUpdate) {
          try {
            autoUpdater.checkForUpdates().catch(() => checkViaFallback());
          } catch {
            checkViaFallback();
          }
        }
      }, 1000 * 60 * 60 * 2);
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
      sendToRenderer({ type: 'checking' });
      await new Promise((r) => setTimeout(r, 800));
      return await checkViaFallback();
    }

    if (!autoUpdater) {
      return await checkViaFallback();
    }

    try {
      const res = await autoUpdater.checkForUpdates();
      return { status: 'ok', updateInfo: res?.updateInfo };
    } catch (err) {
      console.warn('[Updater] autoUpdater.checkForUpdates error, using direct GitHub fallback:', err.message);
      return await checkViaFallback();
    }
  });

  ipcMain.handle('download-update', async () => {
    if (fallbackUpdate && fallbackUpdate.assetUrl) {
      startFallbackDownload();
      return { status: 'downloading' };
    }

    if (!app.isPackaged) {
      return await checkViaFallback();
    }

    if (!autoUpdater) {
      return { status: 'unavailable' };
    }

    try {
      await autoUpdater.downloadUpdate();
      return { status: 'downloading' };
    } catch (err) {
      console.warn('[Updater] autoUpdater.downloadUpdate error, switching to fallback:', err.message);
      startFallbackDownload();
      return { status: 'downloading' };
    }
  });

  ipcMain.handle('install-update', () => {
    // If fallback installer was downloaded
    if (fallbackUpdate && fallbackUpdate.downloaded && fs.existsSync(fallbackUpdate.filePath)) {
      try {
        spawn(fallbackUpdate.filePath, [], {
          detached: true,
          stdio: 'ignore'
        }).unref();
        app.quit();
        return;
      } catch (e) {
        console.error('[Updater] Failed to run fallback installer:', e);
      }
    }

    if (autoUpdater && app.isPackaged) {
      autoUpdater.quitAndInstall(false, true);
    } else {
      app.relaunch();
      app.quit();
    }
  });
}

module.exports = { initUpdater };
