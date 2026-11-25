"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("habitatStage", {
  onRenderData: (callback) => {
    ipcRenderer.on("habitat-stage:render", (event, data) => callback(data));
  },
  notifyReady: () => {
    ipcRenderer.send("habitat-stage:ready");
  }
});
