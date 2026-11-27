"use strict";

// P3.4 — aviso opcional de nova versão (D7). É a única chamada de rede do app e só existe
// com a preferência `updateNotice` ligada. Lê o `latest.yml` público da última release no
// GitHub no máximo 1 vez a cada 24 h. Não envia nada do usuário (nenhum cabeçalho próprio,
// nenhum id, nenhuma versão na URL), só mostra "Versão X disponível" com link e nunca baixa
// nem executa nada.

const REPO = "playertwo1/agent-habitat";
const LATEST_YML_URL = `https://github.com/${REPO}/releases/latest/download/latest.yml`;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 4;
const MAX_BODY_CHARS = 64 * 1024;
const VERSION_RE = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;

function isGithubHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  return h === "github.com" || h.endsWith(".github.com") || h === "githubusercontent.com" || h.endsWith(".githubusercontent.com");
}

// Só https e só domínios do GitHub (a URL da release redireciona para o armazenamento de anexos).
function isAllowedUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && isGithubHost(u.hostname) && !u.username && !u.password;
  } catch {
    return false;
  }
}

// Lê `version: X.Y.Z` do latest.yml. Qualquer outra coisa (lixo, pré-lançamento, vazio) = null.
function parseLatestYml(text) {
  if (typeof text !== "string" || text.length === 0 || text.length > MAX_BODY_CHARS) return null;
  const m = text.match(/^version:\s*["']?([^\s"']+)["']?\s*$/m);
  if (!m) return null;
  return VERSION_RE.test(m[1]) ? m[1] : null;
}

function compareSemver(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

function releaseUrl(version) {
  return VERSION_RE.test(version) ? `https://github.com/${REPO}/releases/tag/v${version}` : null;
}

// GET simples, sem cabeçalhos próprios, seguindo no máximo MAX_REDIRECTS redirecionamentos
// e só para domínios do GitHub.
async function fetchLatestYml(fetchFn) {
  let url = LATEST_YML_URL;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isAllowedUrl(url)) return null;
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS) : null;
    try {
      const res = await fetchFn(url, { method: "GET", redirect: "manual", signal: ctl ? ctl.signal : undefined });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers && typeof res.headers.get === "function" ? res.headers.get("location") : null;
        if (!loc) return null;
        url = new URL(loc, url).href;
        continue;
      }
      if (res.status !== 200) return null;
      return await res.text();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  return null;
}

// Decide e executa uma checagem. Nunca lança. Desligado ou dentro das 24 h = não consulta.
async function checkForUpdate({ enabled, nowMs = Date.now(), lastCheckMs = 0, currentVersion, fetchFn } = {}) {
  const base = { checked: false, ok: false, lastCheckMs, available: null, url: null };
  if (enabled !== true) return base;
  if (typeof fetchFn !== "function" || !VERSION_RE.test(String(currentVersion))) return base;
  if (Number.isFinite(lastCheckMs) && lastCheckMs > 0 && nowMs - lastCheckMs < CHECK_INTERVAL_MS && nowMs >= lastCheckMs) return base;
  let version = null;
  try {
    version = parseLatestYml(await fetchLatestYml(fetchFn));
  } catch {
    version = null;
  }
  // Falha de rede também conta como tentativa: no máximo 1 consulta por dia, sem insistir.
  const out = { checked: true, ok: version !== null, lastCheckMs: nowMs, available: null, url: null };
  if (version && compareSemver(version, currentVersion) > 0) {
    out.available = version;
    out.url = releaseUrl(version);
  }
  return out;
}

module.exports = {
  LATEST_YML_URL, CHECK_INTERVAL_MS, isAllowedUrl, parseLatestYml, compareSemver, releaseUrl, checkForUpdate,
};
