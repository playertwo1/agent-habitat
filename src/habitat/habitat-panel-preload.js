"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("habitatPanel", {
  getState: () => ipcRenderer.invoke("habitat:get-state"),
  onState: (callback) => {
    if (typeof callback !== "function") return () => {};
    const subscription = (_event, state) => callback(state);
    ipcRenderer.on("habitat:state-update", subscription);
    return () => {
      ipcRenderer.removeListener("habitat:state-update", subscription);
    };
  },
  updatePref: (key, value) => ipcRenderer.invoke("habitat:update-pref", key, value),
  openRelease: () => ipcRenderer.invoke("habitat:open-release"),
  setDemoState: (demoState) => ipcRenderer.invoke("habitat:set-demo-state", demoState),
  triggerDemoPreset: (presetId) => ipcRenderer.invoke("habitat:trigger-demo-preset", presetId),
  stopDemo: () => ipcRenderer.invoke("habitat:stop-demo"),
  focusProvider: (providerId) => ipcRenderer.invoke("habitat:focus-provider", providerId),
  resumeSession: (req) => ipcRenderer.invoke("habitat:resume-session", req),
  refreshDiagnostics: () => ipcRenderer.invoke("habitat:refresh-diagnostics"),
  requestHookSync: (options) => ipcRenderer.invoke("habitat:request-hook-sync", options),
  uninstallHooks: () => ipcRenderer.invoke("habitat:uninstall-hooks"),
  close: () => ipcRenderer.invoke("habitat:close")
});
