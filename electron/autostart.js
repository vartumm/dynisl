const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

let electronPkg = null;
try {
  electronPkg = require('electron');
} catch (e) {}

const isElectronProcess = Boolean(electronPkg && typeof electronPkg === 'object' && electronPkg.app);
const electronApp = isElectronProcess ? electronPkg.app : null;

function getStartupShortcutPath() {
  const startupFolder = path.join(
    process.env.APPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Roaming'),
    'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup'
  );
  return path.join(startupFolder, 'DynamicIsland.lnk');
}

function isAutoStartEnabled() {
  try {
    const shortcutPath = getStartupShortcutPath();
    if (fs.existsSync(shortcutPath)) return true;

    if (electronApp && electronApp.getLoginItemSettings) {
      const login = electronApp.getLoginItemSettings();
      if (login && login.openAtLogin) return true;
    }
  } catch (err) {
    console.error('[Autostart] Check error:', err);
  }
  return false;
}

function setAutoStart(enable) {
  const shortcutPath = getStartupShortcutPath();
  try {
    if (enable) {
      const isPackaged = Boolean(electronApp && electronApp.isPackaged);
      const electronExe = isElectronProcess
        ? process.execPath
        : path.resolve(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
      const appDir = isElectronProcess
        ? (isPackaged ? '' : electronApp.getAppPath())
        : path.resolve(__dirname, '..');
      const workingDir = isPackaged ? path.dirname(electronExe) : appDir;

      // Ensure target directory exists
      const targetDir = path.dirname(shortcutPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Generate VBS script to create Windows shell shortcut
      const vbs = [
        'Set oWS = WScript.CreateObject("WScript.Shell")',
        `sLinkFile = "${shortcutPath}"`,
        'Set oLink = oWS.CreateShortcut(sLinkFile)',
        `oLink.TargetPath = "${electronExe}"`,
        appDir ? `oLink.Arguments = """${appDir}"""` : 'oLink.Arguments = ""',
        `oLink.WorkingDirectory = "${workingDir}"`,
        'oLink.Description = "Dynamic Island for Windows"',
        'oLink.Save'
      ].join('\r\n');

      const tempDir = (electronApp ? electronApp.getPath('temp') : null) || process.env.TEMP || '.';
      const tempVbs = path.join(tempDir, `dynisl_autostart_${Date.now()}.vbs`);
      fs.writeFileSync(tempVbs, vbs, 'utf8');

      execFileSync('cscript.exe', ['//nologo', tempVbs], { windowsHide: true });
      try { fs.unlinkSync(tempVbs); } catch { }

      // Also set Electron login item settings if in Electron
      if (electronApp && electronApp.setLoginItemSettings) {
        try {
          electronApp.setLoginItemSettings({
            openAtLogin: true,
            path: electronExe,
            args: [appDir]
          });
        } catch { }
      }

      console.log('[Autostart] Enabled successfully at:', shortcutPath);
      return fs.existsSync(shortcutPath);
    } else {
      // Delete shortcut
      if (fs.existsSync(shortcutPath)) {
        fs.unlinkSync(shortcutPath);
      }

      // Clear Electron login item settings if in Electron
      if (electronApp && electronApp.setLoginItemSettings) {
        try {
          electronApp.setLoginItemSettings({
            openAtLogin: false
          });
        } catch { }
      }

      console.log('[Autostart] Disabled successfully');
      return true;
    }
  } catch (err) {
    console.error('[Autostart] Toggle error:', err);
    return false;
  }
}

module.exports = {
  isAutoStartEnabled,
  setAutoStart,
  getStartupShortcutPath
};
