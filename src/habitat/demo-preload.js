const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('habitatDemoAPI', {
  getInitialPayload: () => ipcRenderer.sendSync('habitat-demo:get-init'),
  onSnapshot: (callback) => {
    ipcRenderer.on('habitat-demo:snapshot', (event, snap) => callback(snap));
  },
  setProvider: (provider, state) => ipcRenderer.send('habitat-demo:set-provider', { provider, state }),
  setProviders: (states) => ipcRenderer.send('habitat-demo:set-providers', states),
  setScale: (scale) => ipcRenderer.send('habitat-demo:set-scale', scale),
  setReducedMotion: (enabled) => ipcRenderer.send('habitat-demo:set-reduced-motion', enabled),
  setPreviewBg: (bg) => ipcRenderer.send('habitat-demo:set-bg', bg),
  closeDemo: () => ipcRenderer.send('habitat-demo:close'),
  dragWindow: (dx, dy) => ipcRenderer.send('habitat-demo:drag', { dx, dy })
});
