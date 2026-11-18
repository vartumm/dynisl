const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dynislAPI', {
  // Mouse ignore / passthrough
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('set-ignore-mouse-events', ignore),
  updateIslandBounds: (bounds) => ipcRenderer.send('update-island-bounds', bounds),
  
  // DynislCore events listener
  onCoreEvent: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('core-event', subscription);
    return () => ipcRenderer.removeListener('core-event', subscription);
  },

  // Commands to DynislCore
  sendCommand: (cmd, payload = {}) => ipcRenderer.send('send-core-command', { cmd, ...payload }),

  // System actions
  openExternal: (url) => ipcRenderer.send('open-external', url),
  openPath: (path) => ipcRenderer.send('open-path', path),
  copyToClipboard: (text) => ipcRenderer.send('copy-clipboard', text),
  copyFileToClipboard: (filePath) => ipcRenderer.send('copy-file-clipboard', filePath),
  toggleHide: () => ipcRenderer.send('toggle-hide'),
  closeApp: () => ipcRenderer.send('close-app'),

  // Autostart
  getAutoStart: () => ipcRenderer.invoke('get-autostart'),
  setAutoStart: (enable) => ipcRenderer.invoke('set-autostart', enable),

  // Cloud Updater
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAutoUpdateSetting: () => ipcRenderer.invoke('get-auto-update-setting'),
  setAutoUpdateSetting: (enable) => ipcRenderer.invoke('set-auto-update-setting', enable),
  onUpdaterEvent: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('updater-event', subscription);
    return () => ipcRenderer.removeListener('updater-event', subscription);
  }
});
