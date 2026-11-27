"use strict";

// T38 — aviso opcional de nova versão (P3.4): desligado não consulta, no máximo 1x por dia,
// sem dados do usuário, só domínios do GitHub, nada é baixado e erros não quebram.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const U = require("../src/habitat/habitat-update-notice");
const { normalizeHabitatPrefs } = require("../src/habitat/habitat-prefs");

const DAY = 24 * 60 * 60 * 1000;
const yml = (v) => `version: ${v}\nfiles:\n  - url: Agent-Habitat-Setup-${v}-x64.exe\n    sha512: abc\npath: Agent-Habitat-Setup-${v}-x64.exe\n`;
const resp = (status, body = "", headers = {}) => ({ status, text: async () => body, headers: { get: (k) => headers[k.toLowerCase()] ?? null } });

function espiao(handler) {
  const chamadas = [];
  const fetchFn = async (url, opts) => { chamadas.push({ url, opts }); return handler(url, opts, chamadas.length); };
  return { fetchFn, chamadas };
}

test("T38a: a preferência updateNotice é falsa por padrão; lastUpdateCheckMs e updateSeenVersion são validados", () => {
  const p = normalizeHabitatPrefs({});
  assert.equal(p.updateNotice, false);
  assert.equal(p.lastUpdateCheckMs, 0);
  assert.equal(p.updateSeenVersion, null);
  assert.equal(normalizeHabitatPrefs({ updateNotice: "true" }).updateNotice, false);
  assert.equal(normalizeHabitatPrefs({ updateNotice: true }).updateNotice, true);
  assert.equal(normalizeHabitatPrefs({ updateSeenVersion: "0.4.0" }).updateSeenVersion, "0.4.0");
  assert.equal(normalizeHabitatPrefs({ updateSeenVersion: "<script>" }).updateSeenVersion, null);
  assert.equal(normalizeHabitatPrefs({ lastUpdateCheckMs: -5 }).lastUpdateCheckMs, 0);
});

test("T38b: desligado, não consulta nada", async () => {
  const { fetchFn, chamadas } = espiao(() => resp(200, yml("9.9.9")));
  const r = await U.checkForUpdate({ enabled: false, currentVersion: "0.3.1", fetchFn });
  assert.equal(r.checked, false);
  assert.equal(chamadas.length, 0);
  const r2 = await U.checkForUpdate({ enabled: "sim", currentVersion: "0.3.1", fetchFn });
  assert.equal(r2.checked, false);
  assert.equal(chamadas.length, 0);
});

test("T38c: no máximo 1 consulta a cada 24 h", async () => {
  const { fetchFn, chamadas } = espiao(() => resp(200, yml("0.4.0")));
  const t0 = 1_800_000_000_000;
  const a = await U.checkForUpdate({ enabled: true, nowMs: t0, lastCheckMs: 0, currentVersion: "0.3.1", fetchFn });
  assert.equal(a.checked, true);
  assert.equal(chamadas.length, 1);
  const b = await U.checkForUpdate({ enabled: true, nowMs: t0 + DAY - 1, lastCheckMs: a.lastCheckMs, currentVersion: "0.3.1", fetchFn });
  assert.equal(b.checked, false);
  assert.equal(chamadas.length, 1, "dentro das 24 h não consulta");
  const c = await U.checkForUpdate({ enabled: true, nowMs: t0 + DAY, lastCheckMs: a.lastCheckMs, currentVersion: "0.3.1", fetchFn });
  assert.equal(c.checked, true);
  assert.equal(chamadas.length, 2);
});

test("T38d: versão maior avisa com o link da release; igual ou menor não avisa", async () => {
  const mk = (v) => espiao(() => resp(200, yml(v))).fetchFn;
  const maior = await U.checkForUpdate({ enabled: true, currentVersion: "0.3.1", fetchFn: mk("0.4.0") });
  assert.equal(maior.available, "0.4.0");
  assert.equal(maior.url, "https://github.com/playertwo1/agent-habitat/releases/tag/v0.4.0");
  assert.equal((await U.checkForUpdate({ enabled: true, currentVersion: "0.3.1", fetchFn: mk("0.3.1") })).available, null);
  assert.equal((await U.checkForUpdate({ enabled: true, currentVersion: "0.3.1", fetchFn: mk("0.2.9") })).available, null);
  assert.equal((await U.checkForUpdate({ enabled: true, currentVersion: "0.3.1", fetchFn: mk("0.10.0") })).available, "0.10.0", "semver, não texto");
});

test("T38e: erro, lixo e resposta não-200 não quebram e não avisam", async () => {
  const casos = [
    () => { throw new Error("sem rede"); },
    () => resp(500, "x"),
    () => resp(200, "isto não é yml"),
    () => resp(200, "version: 1.0.0-beta.1\n"),
    () => resp(200, "version: <script>alert(1)</script>\n"),
    () => resp(200, ""),
  ];
  for (const h of casos) {
    const { fetchFn } = espiao(h);
    const r = await U.checkForUpdate({ enabled: true, nowMs: 5, currentVersion: "0.3.1", fetchFn });
    assert.equal(r.checked, true);
    assert.equal(r.ok, false);
    assert.equal(r.available, null);
    assert.equal(r.url, null);
  }
});

test("T38f: a requisição não leva nada do usuário (sem cabeçalhos, sem versão na URL)", async () => {
  const { fetchFn, chamadas } = espiao(() => resp(200, yml("0.4.0")));
  await U.checkForUpdate({ enabled: true, currentVersion: "0.3.1", fetchFn });
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].url, U.LATEST_YML_URL);
  assert.ok(!chamadas[0].url.includes("0.3.1"));
  assert.deepEqual(Object.keys(chamadas[0].opts).sort(), ["method", "redirect", "signal"]);
  assert.equal(chamadas[0].opts.headers, undefined);
  assert.equal(chamadas[0].opts.method, "GET");
  assert.equal(chamadas[0].opts.redirect, "manual");
});

test("T38g: redirecionamentos só para domínios do GitHub (e com limite)", async () => {
  const bom = espiao((url, o, n) => n === 1
    ? resp(302, "", { location: "https://release-assets.githubusercontent.com/x/latest.yml" })
    : resp(200, yml("0.4.0")));
  const ok = await U.checkForUpdate({ enabled: true, currentVersion: "0.3.1", fetchFn: bom.fetchFn });
  assert.equal(ok.available, "0.4.0");
  assert.equal(bom.chamadas.length, 2);

  const mau = espiao(() => resp(302, "", { location: "https://evil.example.com/latest.yml" }));
  const r = await U.checkForUpdate({ enabled: true, currentVersion: "0.3.1", fetchFn: mau.fetchFn });
  assert.equal(r.available, null);
  assert.equal(mau.chamadas.length, 1, "não seguiu para fora do GitHub");

  const http = espiao(() => resp(302, "", { location: "http://github.com/x" }));
  await U.checkForUpdate({ enabled: true, currentVersion: "0.3.1", fetchFn: http.fetchFn });
  assert.equal(http.chamadas.length, 1, "http puro é recusado");

  const laco = espiao(() => resp(302, "", { location: "https://github.com/a" }));
  await U.checkForUpdate({ enabled: true, currentVersion: "0.3.1", fetchFn: laco.fetchFn });
  assert.ok(laco.chamadas.length <= 5, "limite de redirecionamentos");
});

test("T38h: o código do aviso não baixa nem executa nada e o app só abre o link calculado no processo principal", () => {
  const mod = fs.readFileSync(path.join(__dirname, "..", "src", "habitat", "habitat-update-notice.js"), "utf8");
  for (const proibido of ["child_process", "writeFile", "createWriteStream", "autoUpdater", "spawn", "exec("]) {
    assert.ok(!mod.includes(proibido), `não deve usar ${proibido}`);
  }
  const app = fs.readFileSync(path.join(__dirname, "..", "src", "habitat", "habitat-app-main.js"), "utf8");
  assert.match(app, /ipcMain\.handle\("habitat:open-release", async \(\) => \{\s*const notice = currentUpdateNotice\(\);/);
  assert.match(app, /prefs\.updateNotice !== true \|\| !seen \|\| compareSemver\(seen, app\.getVersion\(\)\) <= 0\) return null/);
});
