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

// P3.7: par de árvores do dia (decisão do dono: automático, muda a cada dia, esquerda diferente da direita).
// Determinístico pela data local; 7 é primo com 30, então dias seguidos nunca repetem o par.
const TREE_COUNT = 6;
function treesForDate(date = new Date(), count = TREE_COUNT) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  const pairs = count * (count - 1);
  const k = (((day * 7) % pairs) + pairs) % pairs;
  const left = Math.floor(k / (count - 1));
  const r = k % (count - 1);
  return { left, right: r >= left ? r + 1 : r };
}

// Estado entregue ao Stage: só os objetos ligados, se é noite e as árvores do dia.
function resolveGardenState(prefs, date = new Date()) {
  const g = normalizeGarden(prefs && prefs.garden);
  return { items: GARDEN_ITEMS.filter((k) => g[k]), night: isNight(normalizeLightMode(prefs && prefs.lightMode), date), trees: treesForDate(date) };
}

module.exports = { GARDEN_ITEMS, LIGHT_MODES, TREE_COUNT, normalizeGarden, normalizeLightMode, isNight, treesForDate, resolveGardenState };
