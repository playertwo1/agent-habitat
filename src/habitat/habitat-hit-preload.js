"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("habitatHit", {
  sendClick: (pt) => ipcRenderer.send("habitat-hit:click", pt),
  sendDragDelta: (delta) => ipcRenderer.send("habitat-hit:drag", delta),
  sendDragEnd: () => ipcRenderer.send("habitat-hit:drag-end"),
  sendContextMenu: () => ipcRenderer.send("habitat-hit:context-menu")
});
