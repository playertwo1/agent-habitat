"use strict";

// T33 (P1.4): objetos do jardim e luz dia/noite; o repouso 000 continua fechado e sem ninguém fora.
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { isNight, resolveGardenState, normalizeGarden } = require("../src/habitat/habitat-garden");
const { loadHabitatPrefs, saveHabitatPrefs } = require("../src/habitat/habitat-prefs");
const { createHabitatRuntime } = require("../src/habitat/habitat-runtime");
const { validateHabitatManifest } = require("../src/habitat/manifest-validator");

const MANIFEST_PATH = path.join(__dirname, "..", "assets", "habitat", "cozy-cottage", "habitat-manifest.json");
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const at = (h) => new Date(2026, 10, 25, h, 0, 0);

test("T33: automático segue o relógio e forçar dia/noite vence o relógio", () => {
  assert.strictEqual(isNight("auto", at(12)), false);
  assert.strictEqual(isNight("auto", at(19)), true);
  assert.strictEqual(isNight("auto", at(3)), true);
  assert.strictEqual(isNight("auto", at(6)), false);
  assert.strictEqual(isNight("night", at(12)), true);
  assert.strictEqual(isNight("day", at(23)), false);
});

test("T33: nada ligado por padrão e só objetos conhecidos e ligados chegam ao Stage", () => {
  assert.deepStrictEqual(resolveGardenState({}, at(12)), { items: [], night: false });
  assert.deepStrictEqual(normalizeGarden({ bench: true, kitten: "sim", lixo: true }), { bench: true, campfire: false, kitten: false, mailbox: false });
  assert.deepStrictEqual(resolveGardenState({ garden: { campfire: true, mailbox: true }, lightMode: "night" }, at(12)), { items: ["campfire", "mailbox"], night: true });
});

test("T33: objetos e luz persistem entre reinícios e valores inválidos voltam ao padrão", () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "habitat-garden-")), "prefs.json");
  saveHabitatPrefs({ filePath: file, patch: { garden: { bench: true }, lightMode: "night" } });
  const p = loadHabitatPrefs(file);
  assert.strictEqual(p.garden.bench, true);
  assert.strictEqual(p.lightMode, "night");
  assert.strictEqual(saveHabitatPrefs({ filePath: file, patch: { lightMode: "xyz" } }).lightMode, "auto");
});

test("T33: repouso 000 de dia e de noite segue fechado, sem ninguém fora e sem fumaça", () => {
  const rt = createHabitatRuntime({});
  const snap = rt.getSnapshot(1_800_000_000_000).scene;
  for (const r of Object.values(snap.residents)) assert.strictEqual(r.presence, "inside");
  assert.strictEqual(snap.cottage.door, "closed");
  assert.strictEqual(snap.cottage.smoke, false);
  // a luz do jardim não entra na cena: dia e noite não mudam o estado 000
  assert.strictEqual(JSON.stringify(snap).includes("garden"), false);
});

test("T33: manifesto com jardim valida, a folha é RGBA 96x24 e um jardim quebrado é recusado", () => {
  const args = { manifestDir: path.dirname(MANIFEST_PATH), repoRoot: path.join(__dirname, "..") };
  assert.deepStrictEqual(validateHabitatManifest({ manifest, ...args, checkFiles: true }).errors || [], []);
  const bad = { ...manifest, garden: { ...manifest.garden, items: { bench: manifest.garden.items.bench } } };
  assert.ok((validateHabitatManifest({ manifest: bad, ...args }).errors || []).some((e) => /garden/.test(e)));
  const png = fs.readFileSync(path.join(path.dirname(MANIFEST_PATH), manifest.garden.file));
  assert.strictEqual(png.readUInt32BE(16), 96);
  assert.strictEqual(png.readUInt32BE(20), 24);
  assert.strictEqual(png[25], 6, "color type 6 = RGBA");
});

test("T33: o renderizador mostra só os objetos ligados e filtra só os fundos à noite", () => {
  const els = [];
  const mk = () => ({ style: {}, dataset: {}, children: [], appendChild(c) { this.children.push(c); return c; }, insertBefore(c) { this.children.push(c); return c; }, getContext: () => ({}), setAttribute() {}, addEventListener() {} });
  global.document = { createElement: () => { const e = mk(); els.push(e); return e; } };
  try {
    const src = fs.readFileSync(path.join(__dirname, "..", "src", "habitat", "habitat-renderer.js"), "utf8");
    const { createHabitatRenderer } = new Function(`${src}\nreturn { createHabitatRenderer };`)();
    const r = createHabitatRenderer({ container: mk(), manifest, manifestDirUrl: "file:///x/", atomMetaMap: {} });
    const base = { nowMs: 1, cottage: { lights: "off", door: "closed", smoke: false }, residents: {}, helpers: {} };
    r.render({ ...base, garden: { items: ["kitten"], night: true } });
    const shown = els.filter((e) => e.dataset.garden && e.style.display === "block").map((e) => e.dataset.garden);
    assert.deepStrictEqual(shown, ["kitten"]);
    const filtered = els.filter((e) => e.style.filter);
    assert.ok(filtered.length >= 4 && filtered.every((e) => e.style.filter === manifest.garden.nightFilter));
    r.render({ ...base, garden: { items: [], night: false } });
    assert.strictEqual(els.filter((e) => e.style.filter).length, 0);
    assert.strictEqual(els.filter((e) => e.dataset.garden && e.style.display === "block").length, 0);
  } finally {
    delete global.document;
  }
});

test("T33: o painel tem o seletor de objetos e de luz", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "src", "habitat", "habitat-panel.html"), "utf8");
  for (const k of ["bench", "campfire", "kitten", "mailbox"]) assert.match(html, new RegExp(`data-garden="${k}"`));
  assert.match(html, /name="light-mode"/);
});
