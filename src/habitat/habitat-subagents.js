"use strict";

// P1.3: conta subagentes ativos por provedor a partir de SubagentStart/SubagentStop.
// Só mostra o que foi confirmado por evento; sem Stop o ajudante some por tempo (nunca fica "trabalhando" sem prova).
const PROVIDERS = ["claude", "codex", "antigravity"];
const SESSION_END_EVENTS = new Set(["stop", "stopfailure", "sessionend"]);

function createSubagentTracker({ ttlMs = 10 * 60_000, max = 3 } = {}) {
  const live = new Map(); // chave -> { provider, sessionId, at }
  let anon = 0;

  function record({ provider, sessionId, event, subagentId }, nowMs = Date.now()) {
    if (!PROVIDERS.includes(provider) || typeof sessionId !== "string") return;
    const ev = String(event || "").toLowerCase();
    const id = subagentId && subagentId !== "default" ? String(subagentId) : null;
    if (ev === "subagentstart") {
      live.set(`${provider}|${sessionId}|${id || `anon${++anon}`}`, { provider, sessionId, at: nowMs });
      return;
    }
    if (ev === "subagentstop") {
      const exact = id && `${provider}|${sessionId}|${id}`;
      if (exact && live.delete(exact)) return;
      // sem id: encerra o mais antigo da sessão
      const prefix = `${provider}|${sessionId}|`;
      for (const key of live.keys()) if (key.startsWith(prefix)) { live.delete(key); break; }
      return;
    }
    for (const [key, v] of live) {
      if (v.provider !== provider || v.sessionId !== sessionId) continue;
      if (SESSION_END_EVENTS.has(ev)) live.delete(key);
      else v.at = nowMs;
    }
  }

  function counts(nowMs = Date.now()) {
    const out = { claude: 0, codex: 0, antigravity: 0 };
    for (const [key, v] of live) {
      if (nowMs - v.at > ttlMs) live.delete(key);
      else out[v.provider] += 1;
    }
    for (const p of PROVIDERS) out[p] = Math.min(out[p], max);
    return out;
  }

  return { record, counts };
}

module.exports = { createSubagentTracker };
