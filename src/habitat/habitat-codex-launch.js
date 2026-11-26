"use strict";

// P1.2b: `codex resume <id>` num terminal novo, sem tocar em ~/.codex; o id é validado como UUID antes de qualquer shell.
const { platform } = require("os");
const { buildTerminalCandidates, tryLaunch } = require("../launch-claude");

// O wt.exe "abre" (o spawn dá certo) mas, neste Windows, interpreta mal a linha de comando e a aba falha sem o app saber
// (0x80070002). A retomada pula o wt.exe e cai no cmd.exe numa janela de console própria, que não depende do parser do WT.
function tryLaunchSemWt(bin, args, opts, deps = {}) {
  if (String(bin).toLowerCase() === "wt.exe") return Promise.resolve({ ok: false, error: new Error("wt.exe ignorado na retomada") });
  return (deps.tryLaunch || tryLaunch)(bin, args, opts);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function launchCodexResume(cwd, sessionId, deps = {}) {
  if (typeof sessionId !== "string" || !UUID.test(sessionId)) return { ok: false, message: "id de sessão do Codex inválido" };
  const _tryLaunch = (bin, args, opts) => tryLaunchSemWt(bin, args, opts, deps);
  const plat = (deps.platform || platform)();
  let lastError = null;
  for (const c of buildTerminalCandidates("codex", ["resume", sessionId], plat, cwd, null)) {
    const r = await _tryLaunch(c.bin, c.args, { detached: true, stdio: "ignore", windowsHide: false, cwd, ...(c.extraOpts || {}) });
    if (r.ok) return { ok: true, terminal: c.bin };
    lastError = r.error;
  }
  return { ok: false, message: (lastError && lastError.message) || "could not spawn terminal" };
}

module.exports = { launchCodexResume, tryLaunchSemWt, UUID };
