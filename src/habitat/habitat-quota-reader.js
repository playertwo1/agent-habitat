"use strict";

// P1.1: lê, SOMENTE LEITURA, o arquivo de cotas que o clawd-on-desk mantém. O Habitat nunca escreve em ~/.clawd.
// O arquivo guarda só percentuais e horários de reinício (sem tokens nem conteúdo de sessão).
const fs = require("fs");
const os = require("os");
const path = require("path");

const MAX_FILE_BYTES = 1024 * 1024;

const PROVIDERS = {
  claude: { key: "claudeQuota", buckets: { claudeFiveHour: "5 horas", claudeWeekly: "Semanal" } },
  codex: { key: "codexQuota", buckets: { codexFiveHour: "5 horas", codexWeekly: "Semanal" } },
  antigravity: {
    key: "antigravityQuota",
    buckets: {
      geminiFiveHour: "Gemini 5 horas",
      geminiWeekly: "Gemini semanal",
      thirdPartyFiveHour: "Terceiros 5 horas",
      thirdPartyWeekly: "Terceiros semanal"
    }
  }
};

function defaultQuotaFilePath() {
  return path.join(os.homedir(), ".clawd", "account-quota.json");
}

function emptyProviders() {
  const out = {};
  for (const id of Object.keys(PROVIDERS)) out[id] = { status: "sem-dados", buckets: [], updatedAt: null, lastSeenAt: null };
  return out;
}

function readHabitatQuota({ filePath = defaultQuotaFilePath(), now = Date.now() } = {}) {
  const result = { source: "clawd-on-desk", file: "missing", providers: emptyProviders() };
  let parsed;
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) {
      result.file = "invalid";
      return result;
    }
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    result.file = err && err.code === "ENOENT" ? "missing" : "invalid";
    return result;
  }
  result.file = "ok";
  const sources = Array.isArray(parsed && parsed.sources) ? parsed.sources : [];
  // sourceKey "" é esta máquina; fontes remotas do clawd-on-desk não entram no Habitat.
  const local = sources.find((s) => s && s.sourceKey === "");
  if (!local) return result;

  for (const [id, def] of Object.entries(PROVIDERS)) {
    const entry = local[def.key];
    const group = entry && typeof entry.group === "object" && entry.group ? entry.group : null;
    if (!group) continue;
    const buckets = [];
    for (const [field, label] of Object.entries(def.buckets)) {
      const b = group[field];
      const used = Number(b && b.usedPercent);
      if (!b || !Number.isFinite(used)) continue;
      const resetAt = Number(b.resetAt);
      buckets.push({
        id: field,
        label,
        usedPercent: Math.min(100, Math.max(0, used)),
        resetAt: Number.isFinite(resetAt) ? resetAt : null,
        // Janela que já reiniciou: o valor guardado ficou velho e não deve parecer atual.
        expired: Number.isFinite(resetAt) && resetAt <= now
      });
    }
    if (buckets.length === 0) continue;
    result.providers[id] = {
      status: "ok",
      buckets,
      updatedAt: Number.isFinite(Number(entry.updatedAt)) ? Number(entry.updatedAt) : null,
      lastSeenAt: Number.isFinite(Number(entry.lastSeenAt)) ? Number(entry.lastSeenAt) : null
    };
  }
  return result;
}

module.exports = { readHabitatQuota, defaultQuotaFilePath, PROVIDERS };
