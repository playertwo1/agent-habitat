"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("habitatCard", {
  decide: (id, decision) => ipcRenderer.send("habitat-card:decide", { id, decision }),
  focus: (provider) => ipcRenderer.send("habitat-card:focus", { provider }),
  dismiss: (id) => ipcRenderer.send("habitat-card:dismiss", { id })
});
