"use strict";

// T37 — ponte local opcional para o Lumen (P3.3): resumo mínimo, só GET em 127.0.0.1,
// sem CORS, recusa Host/Origin estranhos e nada de ids, pastas, prompts ou PIDs.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { buildLumenSummary, handleLumenRequest, mapEstado, LUMEN_ROUTE } = require("../src/habitat/habitat-lumen-bridge");
const { normalizeHabitatPrefs } = require("../src/habitat/habitat-prefs");

const session = (extra = {}) => ({ sessionId: "SEGREDO-ID", cwdName: "pasta-secreta", pid: 4242, ppid: 1, surface: "claude-cli",
  pendingPermission: false, ...extra });
const snapshot = (over = {}) => ({
  scene: { residents: {
    claude: { presence: "outside", logicalState: "busy" },
    codex: { presence: "inside", logicalState: "offline" },
    antigravity: { presence: "outside", logicalState: "mystery" },
  } },
  aggregator: { residents: {
    claude: { state: "busy", errorNeedsAction: false, totalSessionCount: 2, sessions: [session(), session({ pendingPermission: true })] },
    codex: { state: "offline", totalSessionCount: 0, sessions: [] },
    antigravity: { state: "unknown", totalSessionCount: 1, sessions: [session()] },
  } },
  ...over,
});

function servir(t, opts) {
  const server = http.createServer((req, res) => {
    if (!handleLumenRequest(req, res, opts)) { res.writeHead(404); res.end(); }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => {
    t.after(() => server.close());
    resolve(server.address().port);
  }));
}

function pedir(port, { method = "GET", host, headers = {}, url = LUMEN_ROUTE } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, method, path: url,
      headers: { Host: host === undefined ? `127.0.0.1:${port}` : host, ...headers } }, (res) => {
      let body = ""; res.on("data", (c) => { body += c; });
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on("error", reject); req.end();
  });
}

test("T37a: a preferência lumenBridge é falsa por padrão e só vira true com booleano true", () => {
  assert.equal(normalizeHabitatPrefs({}).lumenBridge, false);
  assert.equal(normalizeHabitatPrefs({ lumenBridge: "true" }).lumenBridge, false);
  assert.equal(normalizeHabitatPrefs({ lumenBridge: 1 }).lumenBridge, false);
  assert.equal(normalizeHabitatPrefs({ lumenBridge: true }).lumenBridge, true);
});

test("T37b: o resumo traz só os 4 campos por provedor, sem ids, pastas nem PIDs", () => {
  const s = buildLumenSummary(snapshot(), 1234);
  assert.deepEqual(Object.keys(s), ["schema", "geradoEmMs", "provedores"]);
  assert.equal(s.schema, 1);
  assert.deepEqual(Object.keys(s.provedores), ["claude", "codex", "antigravity"]);
  for (const p of Object.values(s.provedores)) assert.deepEqual(Object.keys(p), ["fora", "estado", "pendente", "sessoes"]);
  const texto = JSON.stringify(s);
  for (const proibido of ["SEGREDO-ID", "pasta-secreta", "4242", "sessionId", "cwd", "pid"]) {
    assert.ok(!texto.includes(proibido), `vazou: ${proibido}`);
  }
});

test("T37c: casos 000, várias sessões, pendência e unknown", () => {
  const s = buildLumenSummary(snapshot(), 1).provedores;
  assert.deepEqual(s.claude, { fora: true, estado: "working", pendente: true, sessoes: 2 });
  assert.deepEqual(s.codex, { fora: false, estado: "idle", pendente: false, sessoes: 0 });
  assert.equal(s.antigravity.estado, "unknown", "estado desconhecido nunca vira working");
  const vazio = buildLumenSummary({}, 1).provedores;
  for (const p of Object.values(vazio)) assert.deepEqual(p, { fora: false, estado: "unknown", pendente: false, sessoes: 0 });
  const zero = buildLumenSummary({ scene: { residents: {
    claude: { presence: "inside", logicalState: "idle" }, codex: { presence: "inside", logicalState: "idle" },
    antigravity: { presence: "inside", logicalState: "idle" } } } }, 1).provedores;
  assert.ok(Object.values(zero).every((p) => p.fora === false), "000: ninguém fora");
});

test("T37d: mapEstado cobre o vocabulário e nunca promove o desconhecido", () => {
  assert.equal(mapEstado("busy"), "working");
  assert.equal(mapEstado("delegating"), "working");
  assert.equal(mapEstado("needs_approval"), "waiting");
  assert.equal(mapEstado("waiting_input"), "waiting");
  assert.equal(mapEstado("done"), "done");
  assert.equal(mapEstado("error"), "error");
  for (const x of ["unknown", "xyz", undefined, null, 7]) assert.equal(mapEstado(x), "unknown");
});

test("T37e: desligada, a rota não existe (404) e nada é lido", async (t) => {
  let leituras = 0;
  const port = await servir(t, { enabled: () => false, getSnapshot: () => { leituras++; return snapshot(); } });
  const r = await pedir(port);
  assert.equal(r.status, 404);
  assert.equal(leituras, 0);
});

test("T37f: ligada, GET em 127.0.0.1 devolve o JSON do contrato sem cabeçalhos CORS", async (t) => {
  const port = await servir(t, { enabled: () => true, getSnapshot: () => snapshot(), now: () => 99 });
  const r = await pedir(port);
  assert.equal(r.status, 200);
  assert.match(r.headers["content-type"], /application\/json/);
  assert.equal(r.headers["access-control-allow-origin"], undefined);
  assert.equal(r.headers["cache-control"], "no-store");
  const j = JSON.parse(r.body);
  assert.equal(j.geradoEmMs, 99);
  assert.equal(j.provedores.claude.fora, true);
  const viaLocalhost = await pedir(port, { host: `localhost:${port}` });
  assert.equal(viaLocalhost.status, 200);
});

test("T37g: método diferente de GET responde 405", async (t) => {
  const port = await servir(t, { enabled: () => true, getSnapshot: () => snapshot() });
  for (const method of ["POST", "PUT", "DELETE", "PATCH"]) {
    const r = await pedir(port, { method });
    assert.equal(r.status, 405, method);
    assert.equal(r.headers.allow, "GET");
  }
});

test("T37h: Host falso (DNS rebinding) e Origin de página web respondem 403", async (t) => {
  const port = await servir(t, { enabled: () => true, getSnapshot: () => snapshot() });
  assert.equal((await pedir(port, { host: "evil.example.com" })).status, 403);
  assert.equal((await pedir(port, { host: `evil.example.com:${port}` })).status, 403);
  assert.equal((await pedir(port, { host: "127.0.0.1:1" })).status, 403);
  assert.equal((await pedir(port, { headers: { Origin: "https://site.com" } })).status, 403);
  assert.equal((await pedir(port, { headers: { "Sec-Fetch-Site": "cross-site" } })).status, 403);
});

test("T37i: o servidor local roteia a ponte só fora de perfis remotos", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "src", "server.js"), "utf8");
  assert.match(src, /!remoteProfile[\s\S]{0,120}startsWith\("\/lumen\/"\)[\s\S]{0,80}handleLumenRequest\(req, res, ctx\.habitatLumen\)/);
  const app = fs.readFileSync(path.join(__dirname, "..", "src", "habitat", "habitat-app-main.js"), "utf8");
  assert.match(app, /enabled:\s*\(\)\s*=>\s*prefs\.lumenBridge === true/);
});
