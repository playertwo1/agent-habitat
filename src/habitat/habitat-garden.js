"use strict";

// P1.4: objetos do jardim (posições fixas no manifesto) e luz dia/noite pelo relógio do Windows.
const GARDEN_ITEMS = Object.freeze(["bench", "campfire", "kitten", "mailbox"]);
const LIGHT_MODES = Object.freeze(["auto", "day", "night"]);
const NIGHT_FROM_HOUR = 19; // 19:00 até 05:59 é noite
const NIGHT_UNTIL_HOUR = 6;

function normalizeGarden(input) {
  const out = {};
  for (const k of GARDEN_ITEMS) out[k] = !!(input && input[k] === true);
  return out;
}

function normalizeLightMode(v) {
  return LIGHT_MODES.includes(v) ? v : "auto";
}

function isNight(mode, date = new Date()) {
  if (mode === "day") return false;
  if (mode === "night") return true;
  const h = date.getHours();
  return h >= NIGHT_FROM_HOUR || h < NIGHT_UNTIL_HOUR;
}

// Estado entregue ao Stage: só os objetos ligados e se é noite.
function resolveGardenState(prefs, date = new Date()) {
  const g = normalizeGarden(prefs && prefs.garden);
  return { items: GARDEN_ITEMS.filter((k) => g[k]), night: isNight(normalizeLightMode(prefs && prefs.lightMode), date) };
}

module.exports = { GARDEN_ITEMS, LIGHT_MODES, normalizeGarden, normalizeLightMode, isNight, resolveGardenState };
