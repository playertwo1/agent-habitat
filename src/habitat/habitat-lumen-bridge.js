"use strict";

// P3.3 — leitura local opcional do estado para o Lumen (D2–D5, D10).
// Resumo mínimo, somente leitura, só em 127.0.0.1. Sem ids, pastas, prompts nem PIDs.
// Desligada por padrão: sem a preferência `lumenBridge`, a rota responde como qualquer rota desconhecida.

const LUMEN_ROUTE = "/lumen/v1/estado";
const PROVIDERS = Object.freeze(["claude", "codex", "antigravity"]);
const SCHEMA = 1;

// Estado lógico do morador -> vocabulário do contrato. Tudo que não é reconhecido vira
// "unknown": nunca "working" por engano (regra de verdade dos estados).
function mapEstado(logicalState) {
  switch (logicalState) {
    case "busy":
    case "working":
    case "delegating":
      return "working";
    case "waiting_input":
    case "needs_approval":
      return "waiting";
    case "done":
      return "done";
    case "error":
      return "error";
    case "idle":
    case "offline":
    case "off":
    case "sleeping":
      return "idle";
    default:
      return "unknown";
  }
}

function buildLumenSummary(snapshot, nowMs = Date.now()) {
  const scene = snapshot && snapshot.scene && typeof snapshot.scene === "object" ? snapshot.scene : {};
  const sceneRes = scene.residents && typeof scene.residents === "object" ? scene.residents : {};
  const agg = snapshot && snapshot.aggregator && snapshot.aggregator.residents
    && typeof snapshot.aggregator.residents === "object" ? snapshot.aggregator.residents : {};

  const provedores = {};
  for (const provider of PROVIDERS) {
    const s = sceneRes[provider] || {};
    const a = agg[provider] || {};
    const sessions = Array.isArray(a.sessions) ? a.sessions : [];
    const estado = mapEstado(s.logicalState || a.state);
    const pendente = a.errorNeedsAction === true
      || sessions.some((x) => x && x.pendingPermission === true)
      || s.logicalState === "needs_approval";
    const total = Number.isFinite(a.totalSessionCount) ? a.totalSessionCount : sessions.length;
    provedores[provider] = {
      fora: s.presence === "outside" || s.presence === "entering" || s.presence === "exiting",
      estado,
      pendente: Boolean(pendente),
      sessoes: Math.max(0, Math.trunc(total)),
    };
  }
  return { schema: SCHEMA, geradoEmMs: nowMs, provedores };
}

function hostAllowed(hostHeader, port) {
  if (typeof hostHeader !== "string" || !port) return false;
  const h = hostHeader.trim().toLowerCase();
  return h === `127.0.0.1:${port}` || h === `localhost:${port}` || h === `[::1]:${port}`;
}

function reply(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
  });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

// Retorna true quando a requisição foi tratada. Desligada, não trata nada (false):
// o servidor segue o caminho normal e responde como a uma rota inexistente.
function handleLumenRequest(req, res, { enabled, getSnapshot, now = Date.now } = {}) {
  const url = typeof req.url === "string" ? req.url.split("?", 1)[0] : "";
  if (url !== LUMEN_ROUTE) return false;
  if (typeof enabled === "function" ? !enabled() : !enabled) return false;

  // Sem CORS de propósito: nenhuma página web recebe permissão de leitura.
  const port = req.socket && req.socket.localPort;
  const remote = req.socket && req.socket.remoteAddress;
  const loopback = remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1";
  if (!loopback || !hostAllowed(req.headers && req.headers.host, port)) {
    reply(res, 403, { erro: "host-nao-permitido" });
    return true;
  }
  // Navegadores enviam Origin em pedidos de outra origem; o Lumen (cliente local) não precisa dele.
  if (req.headers && (req.headers.origin !== undefined || req.headers["sec-fetch-site"] === "cross-site")) {
    reply(res, 403, { erro: "origem-nao-permitida" });
    return true;
  }
  if (req.method !== "GET") {
    reply(res, 405, { erro: "metodo-nao-permitido" }, { Allow: "GET" });
    return true;
  }
  let snapshot = null;
  try { snapshot = typeof getSnapshot === "function" ? getSnapshot() : null; } catch { snapshot = null; }
  reply(res, 200, buildLumenSummary(snapshot, now()));
  return true;
}

module.exports = { LUMEN_ROUTE, buildLumenSummary, handleLumenRequest, hostAllowed, mapEstado };
