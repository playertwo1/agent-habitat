"use strict";

// P1.2b: `codex resume <id>` num terminal novo, sem tocar em ~/.codex; o id é validado como UUID antes de qualquer shell.
const { platform } = require("os");
const { buildTerminalCandidates, tryLaunch } = require("../launch-claude");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function launchCodexResume(cwd, sessionId, deps = {}) {
  if (typeof sessionId !== "string" || !UUID.test(sessionId)) return { ok: false, message: "id de sessão do Codex inválido" };
  const _tryLaunch = deps.tryLaunch || tryLaunch;
  const plat = (deps.platform || platform)();
  let lastError = null;
  for (const c of buildTerminalCandidates("codex", ["resume", sessionId], plat, cwd, null)) {
    const r = await _tryLaunch(c.bin, c.args, { detached: true, stdio: "ignore", windowsHide: false, cwd, ...(c.extraOpts || {}) });
    if (r.ok) return { ok: true, terminal: c.bin };
    lastError = r.error;
  }
  return { ok: false, message: (lastError && lastError.message) || "could not spawn terminal" };
}

module.exports = { launchCodexResume, UUID };
