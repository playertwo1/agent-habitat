"use strict";

const fs = require("fs");
const path = require("path");
const { defaultHabitatRuntimeConfigPath } = require("../habitat-identity");
const { normalizeGarden, normalizeLightMode } = require("./habitat-garden");
const { normalizeTheme } = require("./habitat-themes");

const HABITAT_ALLOWED_SCALES = Object.freeze([1, 1.5, 2]);

const DEFAULT_HABITAT_PREFS = Object.freeze({
  scale: 1.5,
  alwaysOnTop: true,
  fullscreenAutoHide: true,
  reducedMotion: false,
  openAtLogin: false,
  clickThrough: false,
  cardsEnabled: true,
  lumenBridge: false,
  updateNotice: false,
  lastUpdateCheckMs: 0,
  updateSeenVersion: null,
  windowPosition: null,
  garden: normalizeGarden(null),
  lightMode: "auto",
  theme: "cozy-cottage-v2",
});

function normalizeHabitatPrefs(input) {
  const prefs = { ...DEFAULT_HABITAT_PREFS };
  if (!input || typeof input !== "object") {
    return prefs;
  }

  // scale
  let scaleNum = Number(input.scale);
  if (HABITAT_ALLOWED_SCALES.includes(scaleNum)) {
    prefs.scale = scaleNum;
  } else {
    prefs.scale = DEFAULT_HABITAT_PREFS.scale;
  }

  // booleans
  if (typeof input.alwaysOnTop === "boolean") {
    prefs.alwaysOnTop = input.alwaysOnTop;
  }
  if (typeof input.fullscreenAutoHide === "boolean") {
    prefs.fullscreenAutoHide = input.fullscreenAutoHide;
  }
  if (typeof input.reducedMotion === "boolean") {
    prefs.reducedMotion = input.reducedMotion;
  }
  // ESTRITO false by default, never true unless explicitly boolean true and allowed? Wait, prompt says: openAtLogin: boolean, padrão ESTRITO false (nunca true por default)
  if (typeof input.openAtLogin === "boolean") {
    prefs.openAtLogin = input.openAtLogin;
  } else {
    prefs.openAtLogin = false;
  }
  if (typeof input.clickThrough === "boolean") {
    prefs.clickThrough = input.clickThrough;
  }
  if (typeof input.cardsEnabled === "boolean") {
    prefs.cardsEnabled = input.cardsEnabled;
  }
  // P3.3: leitura local para o Lumen. Estritamente false por padrão (opt-in explícito).
  prefs.lumenBridge = input.lumenBridge === true;
  // P3.4: aviso de nova versão. Estritamente false por padrão (opt-in explícito).
  prefs.updateNotice = input.updateNotice === true;
  prefs.lastUpdateCheckMs = Number.isFinite(input.lastUpdateCheckMs) && input.lastUpdateCheckMs > 0
    ? Math.trunc(input.lastUpdateCheckMs) : 0;
  prefs.updateSeenVersion = typeof input.updateSeenVersion === "string" && /^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(input.updateSeenVersion)
    ? input.updateSeenVersion : null;

  prefs.garden = normalizeGarden(input.garden);
  prefs.lightMode = normalizeLightMode(input.lightMode);
  prefs.theme = normalizeTheme(input.theme);

  // windowPosition
  if (input.windowPosition && typeof input.windowPosition === "object") {
    const x = Number(input.windowPosition.x);
    const y = Number(input.windowPosition.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      prefs.windowPosition = {
        x: Math.round(x),
        y: Math.round(y),
      };
    } else {
      prefs.windowPosition = null;
    }
  } else {
    prefs.windowPosition = null;
  }

  return prefs;
}

function loadHabitatPrefs(filePath) {
  const targetPath = typeof filePath === "string" && filePath.trim() !== ""
    ? filePath
    : defaultHabitatRuntimeConfigPath();

  try {
    if (fs.existsSync(targetPath)) {
      const content = fs.readFileSync(targetPath, "utf8");
      const parsed = JSON.parse(content);
      return normalizeHabitatPrefs(parsed);
    }
  } catch (err) {
    // ignore parse or read errors, return default
  }
  return normalizeHabitatPrefs({});
}

function saveHabitatPrefs({ filePath, patch } = {}) {
  const targetPath = typeof filePath === "string" && filePath.trim() !== ""
    ? filePath
    : defaultHabitatRuntimeConfigPath();

  const current = loadHabitatPrefs(targetPath);
  const merged = {
    ...current,
    ...(patch && typeof patch === "object" ? patch : {}),
  };
  const normalized = normalizeHabitatPrefs(merged);

  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(normalized, null, 2), "utf8");

  return normalized;
}

module.exports = {
  HABITAT_ALLOWED_SCALES,
  DEFAULT_HABITAT_PREFS,
  normalizeHabitatPrefs,
  loadHabitatPrefs,
  saveHabitatPrefs,
};
