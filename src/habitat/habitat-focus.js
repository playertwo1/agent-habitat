"use strict";

const initFocus = require("../focus");

function createHabitatFocusController({ focusByPid, resolveLiveFocusStartPid, isPidAlive, fallbackProcessSearch, onError } = {}) {
  const focusModule = initFocus({
    execFile: require("child_process").execFile,
  });

  return {
    async focusSession({ provider, sourcePid, ppid, pid, surface, cwd, pidChain } = {}) {
      const candidates = [sourcePid, ppid, pid].filter((p) => Number.isFinite(p) && p > 0);
      const uniqueCandidates = [...new Set(candidates)];

      let focusedOk = false;
      let usedPid = null;
      let method = "none";

      const checkAlive = isPidAlive || ((p) => {
        try {
          process.kill(p, 0);
          return true;
        } catch (e) {
          return e && e.code === "EPERM";
        }
      });

      const liveStartPid = resolveLiveFocusStartPid
        ? resolveLiveFocusStartPid(sourcePid, pidChain || uniqueCandidates, checkAlive)
        : (uniqueCandidates.find(checkAlive) || sourcePid);

      const targetPidsToTry = [liveStartPid, ...uniqueCandidates].filter((p, i, arr) => p && arr.indexOf(p) === i);

      for (const p of targetPidsToTry) {
        if (!checkAlive(p)) continue;
        try {
          if (typeof focusByPid === "function") {
            const res = await focusByPid(p, { provider, surface, cwd });
            if (res && res.ok) {
              focusedOk = true;
              usedPid = p;
              method = res.method || "focusByPid";
              break;
            }
          } else {
            if (focusModule && typeof focusModule.focusPid === "function") {
              const ok = await focusModule.focusPid(p, cwd);
              if (ok) {
                focusedOk = true;
                usedPid = p;
                method = "builtin-focusPid";
                break;
              }
            }
          }
        } catch (err) {
          if (typeof onError === "function") onError(err);
        }
      }

      if (!focusedOk) {
        if (typeof fallbackProcessSearch === "function") {
          try {
            const fallbackRes = await fallbackProcessSearch({ provider, surface, cwd });
            if (fallbackRes && fallbackRes.ok) {
              return { ok: true, method: fallbackRes.method || "fallback-process", pid: fallbackRes.pid || null };
            }
          } catch (err) {
            if (typeof onError === "function") onError(err);
          }
        }
      }

      return {
        ok: focusedOk,
        method: focusedOk ? method : "failed",
        pid: usedPid,
        reason: focusedOk ? undefined : "no live focusable window found",
      };
    },
  };
}

module.exports = {
  createHabitatFocusController,
};
