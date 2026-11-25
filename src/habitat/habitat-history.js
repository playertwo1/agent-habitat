"use strict";

// P1.2: histórico próprio do Habitat (D9). Nunca lê nem escreve em ~/.clawd.
// Guarda, por sessão de Claude/Codex, só provedor, id, pasta e horários; nenhum prompt ou conteúdo.
const fs = require("fs");
const path = require("path");
const { writeJsonAtomic } = require("../../hooks/json-utils");

const HISTORY_PROVIDERS = new Set(["claude", "codex"]);
const MAX_ROWS = 50;
const WRITE_EVERY_MS = 30_000;
const MAX_CWD = 500;

function createHistoryStore({ filePath } = {}) {
  let rows = [];
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (parsed && parsed.version === 1 && Array.isArray(parsed.sessions)) rows = parsed.sessions;
  } catch {}
  let lastWriteAt = 0;

  function save(nowMs) {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      writeJsonAtomic(filePath, { version: 1, sessions: rows });
      lastWriteAt = nowMs;
    } catch {}
  }

  function record({ provider, sessionId, cwd }, nowMs = Date.now()) {
    if (!HISTORY_PROVIDERS.has(provider) || typeof sessionId !== "string" || !sessionId) return;
    const cleanCwd = typeof cwd === "string" && cwd.length <= MAX_CWD && path.isAbsolute(cwd) ? cwd : "";
    let row = rows.find((r) => r.provider === provider && r.sessionId === sessionId);
    const isNew = !row;
    if (isNew) {
      row = { provider, sessionId, cwd: cleanCwd, firstSeenAt: nowMs, lastEventAt: nowMs };
      rows.push(row);
    }
    if (cleanCwd && row.cwd !== cleanCwd) row.cwd = cleanCwd;
    row.lastEventAt = nowMs;
    if (rows.length > MAX_ROWS) {
      rows.sort((a, b) => b.lastEventAt - a.lastEventAt);
      rows.length = MAX_ROWS;
    }
    if (isNew || nowMs - lastWriteAt >= WRITE_EVERY_MS) save(nowMs);
  }

  const recent = (limit = 10) => [...rows].sort((a, b) => b.lastEventAt - a.lastEventAt).slice(0, limit);
  const find = (provider, sessionId) => rows.find((r) => r.provider === provider && r.sessionId === sessionId) || null;

  // shortcut: o último evento de uma sessão pode ficar até 30 s sem gravar; só afeta o horário exibido após queda do app.
  return { record, recent, find };
}

const ACTIVE_WINDOW_MS = 60_000;
const DEFAULT_PROFILE = { kind: "default", configDir: null };

// Por que uma linha não pode ser retomada (null = pode). Só o Claude retoma (D3); o Codex fica somente leitura.
function resumeBlockReason(row, { now, probe, dirExists }) {
  if (row.provider !== "claude") return "codex-somente-leitura";
  if (!row.cwd) return "pasta-desconhecida";
  if (!dirExists(row.cwd)) return "pasta-ausente";
  if (probe("claude-code", row.sessionId, row.cwd, DEFAULT_PROFILE) === false) return "transcricao-ausente";
  if (now - row.lastEventAt < ACTIVE_WINDOW_MS) return "em-andamento";
  return null;
}

function buildHistoryView(store, deps) {
  const limit = deps.limit || 10;
  return store.recent(limit).map((row) => {
    const reason = resumeBlockReason(row, deps);
    return {
      provider: row.provider,
      sessionId: row.sessionId,
      project: row.cwd ? path.basename(row.cwd) : "Projeto desconhecido",
      lastEventAt: row.lastEventAt,
      canResume: reason === null,
      reason,
    };
  });
}

// A retomada só acontece por pedido explícito do clique e revalida tudo no momento (nunca confia na lista exibida).
async function resumeHistorySession(store, { provider, sessionId }, deps) {
  const row = store.find(provider, sessionId);
  if (!row) return { ok: false, reason: "desconhecida" };
  const reason = resumeBlockReason(row, deps);
  if (reason) return { ok: false, reason };
  const res = await deps.launch("resume", row.cwd, row.sessionId);
  return res && res.ok === true ? { ok: true } : { ok: false, reason: "falha-ao-abrir" };
}

module.exports = { createHistoryStore, buildHistoryView, resumeHistorySession, HISTORY_PROVIDERS };
