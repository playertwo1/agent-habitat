"use strict";

// T32 (P1.3): um ajudante por subagente confirmado; some ao parar; nunca com o morador dentro da cabana.
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { createSubagentTracker } = require("../src/habitat/habitat-subagents");
const { createHabitatRuntime } = require("../src/habitat/habitat-runtime");
const { validateHabitatManifest } = require("../src/habitat/manifest-validator");

const T0 = 1_800_000_000_000;
const MANIFEST_PATH = path.join(__dirname, "..", "assets", "habitat", "cozy-cottage", "habitat-manifest.json");
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

test("T32: um ajudante por subagente ativo, e SubagentStop o recolhe", () => {
  const t = createSubagentTracker();
  t.record({ provider: "claude", sessionId: "s", event: "SubagentStart", subagentId: "a" }, T0);
  t.record({ provider: "claude", sessionId: "s", event: "SubagentStart", subagentId: "b" }, T0);
  assert.strictEqual(t.counts(T0).claude, 2);
  t.record({ provider: "claude", sessionId: "s", event: "SubagentStop", subagentId: "a" }, T0 + 1);
  assert.strictEqual(t.counts(T0 + 1).claude, 1);
  t.record({ provider: "claude", sessionId: "s", event: "SubagentStop" }, T0 + 2);
  assert.strictEqual(t.counts(T0 + 2).claude, 0);
});

test("T32: limite de 3 por provedor, Stop/SessionEnd limpam a sessão e a falta de eventos expira", () => {
  const t = createSubagentTracker({ ttlMs: 1000 });
  for (let i = 0; i < 5; i++) t.record({ provider: "codex", sessionId: "s", event: "SubagentStart", subagentId: `x${i}` }, T0);
  assert.strictEqual(t.counts(T0).codex, 3);
  t.record({ provider: "codex", sessionId: "s", event: "Stop" }, T0 + 1);
  assert.strictEqual(t.counts(T0 + 1).codex, 0);
  t.record({ provider: "antigravity", sessionId: "s", event: "SubagentStart", subagentId: "y" }, T0);
  assert.strictEqual(t.counts(T0 + 2000).antigravity, 0, "sem prova de continuidade o ajudante some");
});

test("T32: encerrar uma sessão não leva ajudantes de outra sessão do mesmo provedor", () => {
  const t = createSubagentTracker();
  t.record({ provider: "claude", sessionId: "s1", event: "SubagentStart", subagentId: "a" }, T0);
  t.record({ provider: "claude", sessionId: "s2", event: "SubagentStart", subagentId: "b" }, T0);
  t.record({ provider: "claude", sessionId: "s1", event: "SessionEnd" }, T0 + 1);
  assert.strictEqual(t.counts(T0 + 1).claude, 1);
});

test("T32: o runtime conta só eventos aceitos e `000` segue sem ninguém fora", () => {
  const rt = createHabitatRuntime({});
  const base = { cwdName: "p", surface: "claude-code", pid: process.pid, sessionId: "rt" };
  rt.handleHttpEvent({ ...base, provider: "claude", event: "SubagentStart", agentId: "a1" }, T0);
  rt.handleHttpEvent({ ...base, provider: "provedor-inexistente", event: "SubagentStart", agentId: "z" }, T0);
  const snap = rt.getSnapshot(T0 + 1).scene;
  assert.strictEqual(snap.helpers.claude, 1);
  assert.strictEqual(snap.helpers.codex + snap.helpers.antigravity, 0);
  const idle = createHabitatRuntime({}).getSnapshot(T0).scene;
  assert.deepStrictEqual(idle.helpers, { claude: 0, codex: 0, antigravity: 0 });
  for (const r of Object.values(idle.residents)) assert.strictEqual(r.presence, "inside");
});

test("T32: manifesto com helpers é validado e a folha é PNG RGBA 32x48 com alfa real", () => {
  const res = validateHabitatManifest({ manifest, manifestDir: path.dirname(MANIFEST_PATH), repoRoot: path.join(__dirname, ".."), checkFiles: true });
  assert.deepStrictEqual(res.errors || [], []);
  const bad = { ...manifest, helpers: { ...manifest.helpers, max: 0 } };
  assert.ok((validateHabitatManifest({ manifest: bad, manifestDir: path.dirname(MANIFEST_PATH), repoRoot: path.join(__dirname, "..") }).errors || []).some((e) => /helpers/.test(e)));
  const png = fs.readFileSync(path.join(path.dirname(MANIFEST_PATH), manifest.helpers.file));
  assert.strictEqual(png.readUInt32BE(16), 32);
  assert.strictEqual(png.readUInt32BE(20), 48);
  assert.strictEqual(png[25], 6, "color type 6 = RGBA");
});

test("T32: o renderizador só mostra ajudantes com o morador fora, na linha do provedor", () => {
  const els = [];
  const mk = () => ({ style: {}, dataset: {}, children: [], appendChild(c) { this.children.push(c); return c; }, insertBefore(c) { this.children.push(c); return c; }, getContext: () => ({}), setAttribute() {}, addEventListener() {} });
  global.document = { createElement: () => { const e = mk(); els.push(e); return e; } };
  try {
    const { createHabitatRenderer } = (() => {
      const src = fs.readFileSync(path.join(__dirname, "..", "src", "habitat", "habitat-renderer.js"), "utf8");
      return new Function(`${src}\nreturn { createHabitatRenderer };`)();
    })();
    const r = createHabitatRenderer({ container: mk(), manifest, manifestDirUrl: "file:///x/", atomMetaMap: {} });
    const resident = (presence) => ({ provider: "claude", presence, x: 74, y: 148, facing: "right", visualClip: "busy" });
    const snap = (presence, n) => ({
      nowMs: T0, cottage: { lights: "off", door: "closed", smoke: false },
      residents: { claude: resident(presence) }, helpers: { claude: n, codex: 0, antigravity: 0 }
    });
    const shown = () => els.filter((e) => e.dataset.helper === "claude" && e.style.display === "block").length;
    r.render(snap("outside", 2));
    assert.strictEqual(shown(), 2);
    assert.match(els.find((e) => e.dataset.helper === "claude").style.backgroundPosition, /-0px -0px|-16px -0px/);
    r.render(snap("inside", 2));
    assert.strictEqual(shown(), 0, "morador dentro da cabana: nenhum ajudante fora");
  } finally {
    delete global.document;
  }
});
