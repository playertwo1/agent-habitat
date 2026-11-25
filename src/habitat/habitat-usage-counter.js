"use strict";

// P1.1: "uso observado" = contagem real de sessões e interações vistas pelos hooks, por provedor e por dia.
// Guarda só números (nenhum prompt, caminho ou id de sessão vai para o disco).
const fs = require("fs");
const path = require("path");
const { writeJsonAtomic } = require("../../hooks/json-utils");

const PROVIDERS = ["claude", "codex", "antigravity"];
const KEEP_DAYS = 14;
// Evento que abre uma interação: prompt do usuário (Claude/Codex) ou invocação (Antigravity).
const INTERACTION_EVENTS = new Set(["userpromptsubmit", "preinvocation"]);

function dayKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyDay() {
  const day = {};
  for (const p of PROVIDERS) day[p] = { sessions: 0, interactions: 0 };
  return day;
}

function createUsageCounter({ filePath, now = Date.now } = {}) {
  let days = {};
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (parsed && typeof parsed.days === "object" && parsed.days) days = parsed.days;
  } catch {}
  // shortcut: ids de sessão só em memória; reiniciar o app pode recontar uma sessão ainda aberta no mesmo dia.
  let seen = new Set();
  let seenDay = dayKey(now());

  function save() {
    const keys = Object.keys(days).sort();
    for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete days[k];
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      writeJsonAtomic(filePath, { version: 1, days });
    } catch {}
  }

  function record({ provider, sessionId, event }, nowMs = now()) {
    if (!PROVIDERS.includes(provider)) return;
    const key = dayKey(nowMs);
    if (key !== seenDay) { seen = new Set(); seenDay = key; }
    if (!days[key]) days[key] = emptyDay();
    const bucket = days[key][provider] || (days[key][provider] = { sessions: 0, interactions: 0 });
    let changed = false;
    if (typeof sessionId === "string" && sessionId && !seen.has(`${provider}:${sessionId}`)) {
      seen.add(`${provider}:${sessionId}`);
      bucket.sessions += 1;
      changed = true;
    }
    if (INTERACTION_EVENTS.has(String(event || "").toLowerCase())) {
      bucket.interactions += 1;
      changed = true;
    }
    if (changed) save();
  }

  // period: "today" ou "7d" (hoje e os 6 dias anteriores).
  function getUsage(period = "today", nowMs = now()) {
    const span = period === "7d" ? 7 : 1;
    const out = {};
    for (const p of PROVIDERS) out[p] = { sessions: 0, interactions: 0 };
    for (let i = 0; i < span; i++) {
      const day = days[dayKey(nowMs - i * 86400000)];
      if (!day) continue;
      for (const p of PROVIDERS) {
        const b = day[p];
        if (!b) continue;
        out[p].sessions += Number(b.sessions) || 0;
        out[p].interactions += Number(b.interactions) || 0;
      }
    }
    return out;
  }

  return { record, getUsage };
}

module.exports = { createUsageCounter, INTERACTION_EVENTS };
